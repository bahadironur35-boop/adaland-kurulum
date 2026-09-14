import { NextResponse } from "next/server";
import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { requireParent, HttpError } from "@/lib/auth";
import { uploadRule } from "@/lib/upload-rules";
import { PUT_TTL_MS } from "@/lib/storage/types";

/**
 * Buyuk dosyalar (videolar) icin parcali yukleme. Yalnizca Vercel Blob'da kullanilir;
 * R2 tek PUT ile her boyutu kabul ettigi icin oraya hic gelinmez (media.ts karar verir).
 *
 * Tarayici @vercel/blob/client uploadPresigned(..., { handleUploadUrl: "/api/upload/multipart", multipart: true })
 * cagirir; SDK bu uca kendi protokoluyle gelir, biz getSignedToken icinde kimlik ve kurali uygularsiniz.
 *
 * webhookPublicKey: handleUploadPresigned bunu GIRISTE kosulsuz ister (kaynak kodunda
 * dogrulandi), oysa yalnizca onUploadCompleted geri aramasini dogrulamak icin kullanilir.
 * Biz geri arama KULLANMIYORUZ (DB kaydini uygulama kendisi yazar), bu yuzden yer tutucu.
 * Store baglandiginda Vercel BLOB_WEBHOOK_PUBLIC_KEY'i zaten enjekte eder; varsa o gecer.
 */
export async function POST(req: Request) {
  let body: HandleUploadPresignedBody;
  try {
    body = (await req.json()) as HandleUploadPresignedBody;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  try {
    const json = await handleUploadPresigned({
      body,
      request: req,
      webhookPublicKey: process.env.BLOB_WEBHOOK_PUBLIC_KEY ?? "geri-arama-kullanilmiyor",
      getSignedToken: async (pathname, clientPayload, multipart) => {
        await requireParent(); // kapi: bu fonksiyonun icinde, yoksa uc anonim yuklemeye acilir
        // SDK yukunde contentType yok; istemci clientPayload ile gonderiyor (src/lib/upload.ts).
        let contentType = "";
        try { contentType = String(JSON.parse(clientPayload ?? "{}").contentType ?? ""); } catch {}
        const rule = uploadRule(pathname, contentType);
        // Yolu /api/upload zaten rastgele son ekle uretti; burada aynen kullanilir.
        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: [contentType],
          maximumSizeInBytes: rule.max,
          validUntil: Date.now() + PUT_TTL_MS,
        });
        console.log("[upload/multipart]", multipart ? "parcali" : "tek", pathname);
        return {
          token,
          urlOptions: {
            allowedContentTypes: [contentType],
            maximumSizeInBytes: rule.max,
            validUntil: Date.now() + PUT_TTL_MS,
            addRandomSuffix: false,
            allowOverwrite: false,
          },
        };
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    const message = e instanceof Error ? e.message : String(e);
    console.error("[upload/multipart]", message);
    return NextResponse.json({ error: "Yükleme başlatılamadı." }, { status: 400 });
  }
}
