import { randomBytes } from "node:crypto";
import { harici } from "./storage/harici";
import { blob } from "./storage/blob";
import { aktifDepoAdi } from "./storage/ayar";
import type { Storage, UploadPlan } from "./storage/types";

/**
 * Medya deposu CEPHESI. Arkada iki uygulama var (storage/r2.ts, storage/blob.ts).
 *
 * SECIM VERITABANINDAN (storage/ayar.ts), ortam degiskeninden degil: aile Vercel
 * paneline hic girmiyor. Yeni kurulumlar Vercel Blob ile basliyor — kurulumda
 * sifir ayar, kredi karti yok, ucretsiz 1 GB. Alan dar gelince Ayarlar >
 * Depolama'dan S3 uyumlu bir harici depoya gecilebiliyor (10 GB, yumusak asim);
 * onerilen Backblaze B2, cunku kayitta kredi karti istemiyor.
 *
 * `MEDIA_BACKEND=harici` ortam degiskeni acil geri donus kolu olarak duruyor.
 *
 * Veritabaninda tam URL degil YOL saklanir (Photo.path vb.), bu yuzden depo
 * degisince DB'ye hic dokunulmaz; yalnizca dosyalar karsiya kopyalanir.
 */
async function depo(): Promise<Storage> {
  return (await aktifDepoAdi()) === "harici" ? harici : blob;
}

/**
 * Ayarlar ve uyari seridi icin aktif deponun kimligi.
 * sertSinir: Blob'da sinir asilinca depo 30 gun TAMAMEN kapanir (fotograflar da
 * gorunmez olur); R2'de yalnizca kucuk bir ucret baslar. Uyari metinleri buna gore.
 */
export async function depoDurumu(): Promise<{ ad: "blob" | "harici"; serbestBayt: number; sertSinir: boolean }> {
  const ad = await aktifDepoAdi();
  const s = ad === "harici" ? harici : blob;
  return { ad, serbestBayt: s.freeLimitBytes, sertSinir: ad === "blob" };
}

let warned = false;

/** Bir dosya yolu icin gecici GET URL'i. Anahtar yoksa bos doner (sayfa cokmesin). */
export async function mediaUrl(pathname: string): Promise<string> {
  const s = await depo();
  if (!(await s.configured())) {
    if (!warned) { warned = true; console.warn("[media] depo anahtari yok; medya adresleri bos donuyor (yerel gelistirme)."); }
    return "";
  }
  return s.mediaUrl(pathname);
}

/** Ayni sayfada onlarca medya icin; paralel calisir. */
export async function mediaUrls(pathnames: (string | null | undefined)[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  await Promise.all(
    [...new Set(pathnames.filter((p): p is string => !!p))].map(async (p) => {
      out[p] = await mediaUrl(p);
    }),
  );
  return out;
}

/** Tarayicinin yukleme plani (tek PUT ya da parcali). Tur ve boyut siniri imzaya gomulur. */
export function planUpload(pathname: string, contentType: string, size: number, maxBytes: number): Promise<UploadPlan> {
  return depo().then((s) => s.planUpload(pathname, contentType, size, maxBytes));
}

/** Yol adina rastgele ek: ayni isimle ustune yazma olmasin. */
export function withRandomSuffix(pathname: string): string {
  const dot = pathname.lastIndexOf(".");
  const suffix = randomBytes(6).toString("base64url");
  return dot > pathname.lastIndexOf("/") ? `${pathname.slice(0, dot)}-${suffix}${pathname.slice(dot)}` : `${pathname}-${suffix}`;
}

export async function deleteMedia(pathnames: (string | null | undefined)[]) {
  const keys = pathnames.filter((p): p is string => !!p);
  if (keys.length === 0) return;
  await (await depo()).deleteMedia(keys);
}

/** Yedek ZIP'i icin: dosyanin akisi (web ReadableStream). */
export function mediaStream(pathname: string): Promise<ReadableStream<Uint8Array> | null> {
  return depo().then((s) => s.mediaStream(pathname));
}

export { MAX_PHOTO_BYTES, MAX_AUDIO_BYTES, MAX_VIDEO_BYTES } from "./limits";
export type { StorageUsage, UploadPlan } from "./storage/types";

/** Depodaki tum dosyalari sayip klasore gore toplar (Ayarlar > Depolama). */
export function storageUsage() {
  return depo().then((s) => s.storageUsage());
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/**
 * Veritabanindaki boyutlardan hizli tahmin (depoya sormaz). Onizleme/kapak/ses icin kucuk pay eklenir.
 */
export async function estimateUsageBytes(): Promise<number> {
  const { prisma } = await import("./db");
  const [p, v, a, rec] = await Promise.all([
    prisma.photo.aggregate({ _sum: { sizeBytes: true }, _count: true }),
    prisma.video.aggregate({ _sum: { sizeBytes: true }, _count: true }),
    prisma.saying.count({ where: { audioPath: { not: null } } }),
    prisma.recording.aggregate({ _sum: { sizeBytes: true }, _count: true }),
  ]);
  const photos = (p._sum.sizeBytes ?? 0) + p._count * 45_000;
  const videos = (v._sum.sizeBytes ?? 0) + v._count * 120_000;
  const audio = a * 1_500_000 + (rec._sum.sizeBytes ?? 0);
  return photos + videos + audio;
}

/** Sinir artik sabit degil (depoya gore degisiyor), bu yuzden disaridan veriliyor. */
export function usageLevel(bytes: number, serbestBayt: number): "ok" | "warn" | "critical" {
  const r = bytes / serbestBayt;
  return r >= 0.9 ? "critical" : r >= 0.7 ? "warn" : "ok";
}
