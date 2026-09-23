/**
 * Depo arayuzu. Iki uygulama var: r2.ts (Cloudflare, Onur'un mevcut kurulumu)
 * ve blob.ts (Vercel Blob, Deploy Button ile kurulan aileler).
 * media.ts cephesi hangisinin aktif oldugunu VERITABANINDAN secer (storage/ayar.ts);
 * cagri yerleri bu ayrimi hic gormez. Aileler Blob ile basliyor (kurulumda sifir
 * ayar), alan dar gelince Ayarlar'dan R2'ye gecebiliyor.
 */
export type StorageUsage = { totalBytes: number; count: number; byFolder: Record<string, { bytes: number; count: number }> };

/**
 * Tarayicinin yukleme plani.
 * - put: tek PUT, XHR ile ilerleme cubugu. R2 her boyutta; Blob yalnizca kucuk dosyada
 *   (olculdu: 300 MB gecti, 600 MB 413 verdi).
 * - multipart: Blob'da buyuk dosya; tarayici @vercel/blob/client uploadPresigned ile
 *   parcali yukler, handleUploadUrl bizim /api/upload/multipart ucumuz.
 */
export type UploadPlan =
  | { mode: "put"; url: string; pathname: string }
  | { mode: "multipart"; handleUploadUrl: string; pathname: string };

export interface Storage {
  /**
   * Anahtarlar mevcut mu; yoksa medya adresleri bos doner (yerel gelistirme).
   * ASENKRON: R2 anahtarlari artik ortam degiskeninde degil veritabaninda
   * (bkz. storage/ayar.ts), cunku aile Vercel paneline hic girmiyor.
   */
  configured(): Promise<boolean>;
  /** Ucretsiz katman siniri (Ayarlar > Depolama gostergesi icin). */
  freeLimitBytes: number;
  /** Bir dosya icin gecici GET adresi (1 saat). */
  mediaUrl(pathname: string): Promise<string>;
  /** Tarayici icin yukleme plani. maxBytes ve contentType imzaya gomulur, depo reddeder. */
  planUpload(pathname: string, contentType: string, size: number, maxBytes: number): Promise<UploadPlan>;
  deleteMedia(pathnames: string[]): Promise<void>;
  /** Yedek ZIP'i icin dosya akisi. */
  mediaStream(pathname: string): Promise<ReadableStream<Uint8Array> | null>;
  /** Depodaki tum dosyalari sayip klasore gore toplar. */
  storageUsage(): Promise<StorageUsage>;
}

export const GET_TTL_MS = 60 * 60 * 1000; // 1 saat
export const PUT_TTL_MS = 60 * 60 * 1000; // 1 saat: buyuk video yavas baglantida 10 dakikayi asiyordu
