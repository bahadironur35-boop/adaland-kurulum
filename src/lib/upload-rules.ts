import { HttpError } from "./auth";
import { MAX_AUDIO_BYTES, MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, mb } from "./limits";

/**
 * Yol onekine gore izin verilen tur ve boyut. Iki uc da bunu kullanir:
 * /api/upload (tek PUT plani) ve /api/upload/multipart (parcali). Tek yer olsun ki
 * biri sertlesip digeri gevsek kalmasin.
 */
const RULES: Record<string, { types: string[]; max: number }> = {
  "photos/": { types: ["image/jpeg", "image/png", "image/webp"], max: MAX_PHOTO_BYTES },
  "audio/": { types: ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/x-wav", "audio/x-m4a", "audio/aac"], max: MAX_AUDIO_BYTES },
  "videos/": { types: ["video/mp4", "video/quicktime", "video/webm", "image/jpeg"], max: MAX_VIDEO_BYTES },
};

/** Gecersizse HttpError(400) firlatir; gecerliyse kurali doner. size bilinmiyorsa (multipart) atlanir. */
export function uploadRule(pathname: string, contentType: string, size?: number): { types: string[]; max: number } {
  if (pathname.includes("..")) throw new HttpError(400, "Geçersiz yol.");
  const rule = Object.entries(RULES).find(([prefix]) => pathname.startsWith(prefix))?.[1];
  if (!rule) throw new HttpError(400, "Bu klasöre yükleme yapılamaz.");
  if (!rule.types.includes(contentType)) throw new HttpError(400, "Bu dosya türü desteklenmiyor.");
  if (size !== undefined && size > rule.max) throw new HttpError(400, `Dosya çok büyük. En fazla ${mb(rule.max)} olabilir.`);
  return rule;
}
