/**
 * Yukleme sinirlari. TEK YER: hem sunucu (`media.ts`, `/api/upload`) hem tarayici
 * (`media-client.ts`) burayi kullanir; iki kopya birbirinden kopmasin.
 *
 * Depoya gore gercekler (2026-09-10'da olculdu):
 * - Vercel Blob tek PUT: 300 MB gecti, 600 MB 413 verdi -> SINGLE_PUT_MAX_BYTES ustu parcali.
 *   Blob Hobby'de 1 GB dahil (2026-09-14'te dogrulandi; onceden yanlislikla 5 GB yaziyordu);
 *   asilirsa depo 30 gun tamamen KAPANIR. 512 MB ustu blob CDN'e girmez.
 * - R2 tek PUT ile 5 GB kabul eder; 10 GB ucretsiz, ustu 0,015 $/GB-ay (yumusak).
 * IKI AYRI VIDEO SINIRI var, karistirilmamali:
 * - MAX_VIDEO_BYTES: DEPOYA YAZILAN dosya (sikistirmadan SONRA). 512 MB, cunku
 *   512 MB ustu blob CDN onbellegine hic girmez ve tek video ucretsiz kotanin
 *   onda birini yer. Sunucu tarafinda da bu zorlanir (upload-rules.ts).
 * - MAX_VIDEO_SOURCE_BYTES: tarayicinin sikistirmak icin KABUL ettigi kaynak.
 *   Cok daha yuksek: 1 GB'lik telefon videosu 720p'ye inince ~80 MB oluyor,
 *   bastan reddetmek sikistirmanin butun amacini bosa cikarirdi.
 */
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 512 * 1024 * 1024;
export const MAX_VIDEO_SOURCE_BYTES = 4 * 1024 * 1024 * 1024;

/** Vercel Blob tek PUT tavani (olculdu). Ustu parcali yukleme. */
export const SINGLE_PUT_MAX_BYTES = 250 * 1024 * 1024;

/** Bunun ustunde kullaniciyi Wi-Fi'ye yonlendir. */
export const LARGE_UPLOAD_BYTES = 250 * 1024 * 1024;

export function mb(bytes: number): string {
  return bytes >= 1024 * 1024 * 1024
    ? `${(bytes / 1024 / 1024 / 1024).toFixed(bytes % (1024 * 1024 * 1024) === 0 ? 0 : 1)} GB`
    : `${Math.round(bytes / 1024 / 1024)} MB`;
}
