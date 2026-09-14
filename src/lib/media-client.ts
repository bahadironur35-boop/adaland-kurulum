"use client";

import { api } from "./client";
import { todayStr } from "./dates";
import { uploadPrivate } from "./upload";
import { MAX_VIDEO_BYTES, MAX_VIDEO_SOURCE_BYTES, mb } from "./limits";
import { compressVideo } from "./video-compress";

/**
 * Tarayici tarafi medya isleme + yukleme. Hem sayfa yukleyicileri hem
 * "Paylas -> Adaland" akisi ayni fonksiyonlari kullanir.
 */

const MAIN_MAX = 2048;
const THUMB_MAX = 480;
const POSTER_MAX = 800;

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new Error("Bu görsel açılamadı (HEIC olabilir). iPhone'da Ayarlar > Kamera > Formatlar > 'En Uyumlu' seçeneğini dene.");
  }
}

function resize(bmp: ImageBitmap, max: number): Promise<{ blob: Blob; w: number; h: number }> {
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res({ blob: b, w, h }) : rej(new Error("Görsel işlenemedi"))), "image/jpeg", 0.86));
}

async function exifDate(file: File): Promise<string | null> {
  try {
    const exifr = await import("exifr");
    const d = (await exifr.parse(file, ["DateTimeOriginal", "CreateDate"])) as { DateTimeOriginal?: Date; CreateDate?: Date } | undefined;
    const dt = d?.DateTimeOriginal ?? d?.CreateDate;
    if (dt instanceof Date && !Number.isNaN(dt.getTime())) {
      const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60_000);
      return local.toISOString().slice(0, 10);
    }
  } catch {}
  return null;
}

function dateFromFile(file: File) {
  return file.lastModified ? new Date(file.lastModified).toISOString().slice(0, 10) : todayStr();
}

/** Fotograf: kucult, onizleme uret, ikisini yukle, kaydi yaz. */
export async function uploadPhoto(file: File): Promise<{ id: string }> {
  const [bmp, taken] = await Promise.all([decodeImage(file), exifDate(file)]);
  const takenAt = taken ?? dateFromFile(file);
  const [main, thumb] = await Promise.all([resize(bmp, MAIN_MAX), resize(bmp, THUMB_MAX)]);
  bmp.close();
  const base = `photos/${takenAt.slice(0, 4)}/${crypto.randomUUID()}`;
  const [mainRes, thumbRes] = await Promise.all([
    uploadPrivate(`${base}.jpg`, main.blob, "image/jpeg"),
    uploadPrivate(`${base}.thumb.jpg`, thumb.blob, "image/jpeg"),
  ]);
  return api<{ id: string }>("/api/fotograflar", {
    method: "POST",
    json: { path: mainRes.pathname, thumbPath: thumbRes.pathname, takenAt, width: main.w, height: main.h, sizeBytes: main.blob.size, mime: "image/jpeg" },
  });
}

function guessVideoMime(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "mov" ? "video/quicktime" : ext === "webm" ? "video/webm" : "video/mp4";
}
function videoExt(mime: string) {
  return mime === "video/quicktime" ? "mov" : mime === "video/webm" ? "webm" : "mp4";
}

/**
 * Bir karenin ne kadar "bakilabilir" oldugu. Telefon videolarinin ilk saniyeleri
 * cogu zaman karanlik ya da dumduz oluyor; oyle bir kareyi kapak yapmayalim.
 * Parlaklik ortalamasi ve dagilimi olculur: koyu, patlamis ya da tek renk kare elenir.
 */
function frameScore(canvas: HTMLCanvasElement): number {
  const s = document.createElement("canvas");
  s.width = 48;
  s.height = 27;
  const sc = s.getContext("2d", { willReadFrequently: true });
  if (!sc) return 0;
  sc.drawImage(canvas, 0, 0, s.width, s.height);
  const { data } = sc.getImageData(0, 0, s.width, s.height);
  const lum: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    lum.push(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
  }
  const mean = lum.reduce((a, b) => a + b, 0) / lum.length;
  if (mean < 12 || mean > 244) return 0; // neredeyse siyah ya da neredeyse beyaz
  const variance = lum.reduce((a, b) => a + (b - mean) ** 2, 0) / lum.length;
  return Math.sqrt(variance); // detay ne kadar cok, o kadar iyi
}

/** Yerel dosyada atlama aninda olur; agdan okunan uzun videoda parca istegi gerekir. */
function seekTo(v: HTMLVideoElement, t: number, timeoutMs = 2500): Promise<void> {
  return new Promise((res) => {
    let done = false;
    const finish = () => { if (!done) { done = true; res(); } };
    v.onseeked = finish;
    setTimeout(finish, timeoutMs);
    try { v.currentTime = t; } catch { finish(); }
  });
}

/**
 * Tarayicida kapak karesi + sure. Birkac an denenir, en detayli kare secilir.
 * Cozulemeyen (HEVC .mov vb.) videoda null doner, yukleme devam eder.
 */
export async function probeVideo(source: Blob | string, atSeconds?: number): Promise<{ poster: Blob | null; duration: number | null }> {
  const isUrl = typeof source === "string";
  const url = isUrl ? source : URL.createObjectURL(source);
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  if (isUrl) v.crossOrigin = "anonymous";
  v.src = url;

  try {
    await new Promise<void>((res, rej) => {
      v.onloadedmetadata = () => res();
      v.onerror = () => rej(new Error("decode"));
      setTimeout(() => rej(new Error("timeout")), 15000);
    });
    // MediaRecorder'in urettigi webm'lerde sure Infinity gelir. Cok ileri sarmak
    // tarayiciyi gercek sureyi hesaplamaya zorlar; sonra basa donulur.
    const seekMs = isUrl ? 9000 : 2500;
    if (!Number.isFinite(v.duration)) {
      await seekTo(v, 1e7, seekMs);
      await seekTo(v, 0, seekMs);
    }
    const d = Number.isFinite(v.duration) ? v.duration : 0;
    const duration = d > 0 ? Math.round(d) : null;

    const scale = Math.min(1, POSTER_MAX / Math.max(v.videoWidth, v.videoHeight, 1));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(v.videoWidth * scale));
    c.height = Math.max(1, Math.round(v.videoHeight * scale));
    const ctx = c.getContext("2d");
    if (!ctx) return { poster: null, duration };

    // Kullanici bir an sectiyse once onu dene; yoksa basa yakin ama ilk an degil.
    // Sure hic okunamadiysa sabit anlari dene: ilk saniye cogu videoda karanlik.
    const auto = d > 0 ? [d * 0.15, d * 0.35, d * 0.6, d * 0.05].filter((t) => t >= 0.2) : [3, 8, 1, 15];
    const moments = atSeconds != null && atSeconds >= 0 ? [atSeconds, ...auto] : auto;

    let best: { blob: Blob; score: number } | null = null;
    for (const t of moments) {
      await seekTo(v, t, seekMs);
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const score = frameScore(c);
      const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.82));
      if (blob && blob.size > 500 && (!best || score > best.score)) best = { blob, score };
      if (best && best.score >= 18) break; // yeterince detayli, aramayi surdurme
    }
    return { poster: best?.blob ?? null, duration };
  } catch {
    return { poster: null, duration: null };
  } finally {
    if (!isUrl) URL.revokeObjectURL(url);
  }
}

export type VideoUploadEvents = {
  /** 0-100, kucultme asamasi */
  onShrink?: (pct: number) => void;
  /** 0-100, yukleme asamasi */
  onUpload?: (pct: number) => void;
  /** Kucultme bitince: kac bayttan kac bayta */
  onShrunk?: (from: number, to: number) => void;
};

/**
 * Video: (istege bagli) kucult, kapak karesi cikar, yukle, kaydi yaz.
 * Kucultme basarisiz olursa sessizce orijinali yukler; akis hic durmaz.
 */
export async function uploadVideo(
  file: File,
  events: VideoUploadEvents = {},
  mode: "compress" | "original" = "compress",
): Promise<{ id: string }> {
  // Kaynak sinir yalnizca tarayicinin isleyebilecegi ust sinir.
  if (file.size > MAX_VIDEO_SOURCE_BYTES) {
    throw new Error(`Video ${mb(MAX_VIDEO_SOURCE_BYTES)}'tan büyük. Telefonda kısaltıp tekrar dene.`);
  }
  // "Orijinal" secildiyse sikistirma yok, dosya oldugu gibi depoya gidecek: depo sinirina uymali.
  if (mode === "original" && file.size > MAX_VIDEO_BYTES) {
    throw new Error(`Video ${mb(MAX_VIDEO_BYTES)}'tan büyük. "Küçült" seçeneğiyle yükleyebilirsin.`);
  }

  let blob: Blob = file;
  let mime = guessVideoMime(file);
  let ext = videoExt(mime);

  if (mode === "compress") {
    const out = await compressVideo(file, (p) => events.onShrink?.(Math.round(p * 100)));
    blob = out.blob;
    mime = out.mime;
    ext = out.ext;
    if (out.compressed) events.onShrunk?.(out.originalBytes, out.blob.size);
  }

  // Depoya giden dosya sinirin altinda mi? Sikistirma cok uzun/kaliteli bir
  // kaynakta yeterince kucultemeyebilir; sunucu zaten reddederdi, burada anlasilir soyle.
  if (blob.size > MAX_VIDEO_BYTES) {
    throw new Error(`Video küçültüldükten sonra bile ${mb(MAX_VIDEO_BYTES)}'tan büyük (${mb(blob.size)}). Telefonda kısaltıp tekrar dene.`);
  }

  // Kapak karesini kucultulmus dosyadan al: iPhone HEVC kaynaklarda orijinal
  // cozulemiyordu, H.264 ciktisi cozulebiliyor.
  let probe = await probeVideo(blob);
  if (!probe.poster && blob !== file) probe = await probeVideo(file);

  const takenAt = dateFromFile(file);
  const base = `videos/${takenAt.slice(0, 4)}/${crypto.randomUUID()}`;
  const videoRes = await uploadPrivate(`${base}.${ext}`, blob, mime, (pct) => events.onUpload?.(pct));
  const posterRes = probe.poster ? await uploadPrivate(`${base}.poster.jpg`, probe.poster, "image/jpeg") : null;
  return api<{ id: string }>("/api/videolar", {
    method: "POST",
    json: { path: videoRes.pathname, posterPath: posterRes?.pathname ?? null, takenAt, durationSec: probe.duration, sizeBytes: blob.size, mime },
  });
}

export function isVideoFile(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
}
export function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

/**
 * Var olan bir videonun kapak karesini yeniden uretir. Video R2'den imzali
 * adresle okunur; tarayici cozemezse ya da CORS canvas'i kirletirse anlamli hata verir.
 */
export async function regeneratePoster(videoId: string, videoUrl: string, atSeconds?: number): Promise<void> {
  let probe: { poster: Blob | null };
  try {
    probe = await probeVideo(videoUrl, atSeconds);
  } catch {
    throw new Error("Video bu tarayıcıda açılamadı.");
  }
  if (!probe.poster) throw new Error("Bu videodan kare alınamadı. Videoyu biraz ilerletip tekrar dene.");
  const res = await uploadPrivate(`videos/poster-${crypto.randomUUID()}.jpg`, probe.poster, "image/jpeg");
  await api(`/api/videolar/${videoId}`, { method: "PATCH", json: { posterPath: res.pathname } });
}
