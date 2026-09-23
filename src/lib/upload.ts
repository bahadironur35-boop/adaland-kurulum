"use client";

import { uploadPresigned } from "@vercel/blob/client";
import { api } from "./client";
import type { UploadPlan } from "./storage/types";

/**
 * Tarayicidan dogrudan depoya yukleme. Once /api/upload'dan plan alinir:
 * - put: dosya imzali linke PUT ile atilir. Ilerleme icin XHR (fetch upload ilerlemesi vermez).
 * - multipart: Vercel Blob'da buyuk dosya; SDK parcalara boler, paralel yukler, hatali parcayi yeniden dener.
 * Imza sabit: 7 cagri yeri (media-client, SayingForm, RecordingForm) bu ayrimi gormez.
 */
export async function uploadPrivate(
  pathname: string,
  blob: Blob,
  contentType: string,
  onProgress?: (pct: number) => void,
): Promise<{ pathname: string }> {
  const plan = await api<UploadPlan>("/api/upload", {
    method: "POST",
    json: { pathname, contentType, size: blob.size },
  });

  if (plan.mode === "multipart") {
    await uploadPresigned(plan.pathname, blob, {
      access: "private",
      handleUploadUrl: plan.handleUploadUrl,
      contentType,
      // SDK'nin sunucuya gonderdigi yukte contentType YOK (pathname, multipart, clientPayload var);
      // tur kuralini uygulayabilmek icin buradan tasiyoruz.
      clientPayload: JSON.stringify({ contentType }),
      multipart: true,
      onUploadProgress: ({ percentage }) => onProgress?.(Math.round(percentage)),
    });
    return { pathname: plan.pathname };
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", plan.url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      // 413: imzaya gomulu boyut siniri (Blob) ya da tek PUT tavani; anlasilir mesaj.
      else if (xhr.status === 413) reject(new Error("Dosya depo için çok büyük."));
      else reject(new Error(`Depoya yüklenemedi (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Depoya bağlanılamadı. İnternet bağlantısını kontrol et."));
    xhr.send(blob);
  });

  return { pathname: plan.pathname };
}
