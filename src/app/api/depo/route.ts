import { z } from "zod";
import { handle } from "@/lib/api";
import { HttpError, requireParent } from "@/lib/auth";
import { corsAyarla, depoSina } from "@/lib/storage/harici";
import { aktifDepoAdi, depoAnahtari, depoAnahtariYaz, SAGLAYICI_BILGI, type DepoAnahtar } from "@/lib/storage/ayar";

/**
 * Depo ayarlari. Ailenin hicbir panele ortam degiskeni girmesine gerek kalmasin
 * diye anahtarlar buradan veritabanina yaziliyor.
 *
 * KAYDETMEDEN ONCE SINANIR: yanlis yapistirilmis bir anahtarla goce baslamak,
 * yarida kalmis bir tasima ve "fotograflarim nerede" paniği demek olurdu.
 */
export const dynamic = "force-dynamic";

const ortak = {
  accessKeyId: z.string().trim().min(8).max(128),
  secretAccessKey: z.string().trim().min(8).max(256),
  bucket: z.string().trim().min(1).max(64),
};

const anahtarSemasi = z.discriminatedUnion("saglayici", [
  // B2 adresi panelde yaziyor: s3.eu-central-003.backblazeb2.com
  z.object({ saglayici: z.literal("b2"), endpoint: z.string().trim().min(5).max(200), ...ortak }),
  // R2'de adres hesap kimliginden turetiliyor, aile adres diye bir sey gormuyor.
  z.object({ saglayici: z.literal("r2"), accountId: z.string().trim().min(8).max(64), ...ortak }),
]);

/** Aile adresi kopyalarken basina https, sonuna bolu ya da bucket adi ekleyebiliyor. */
function adresiTemizle(ham: string): string {
  const s = ham.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  return `https://${s}`;
}

export async function GET() {
  return handle(async () => {
    await requireParent();
    const [aktif, anahtar] = await Promise.all([aktifDepoAdi(), depoAnahtari()]);
    // Gizli anahtar ASLA geri donmuyor; yalnizca bagli olup olmadigi ve bucket adi.
    return {
      aktif,
      bagli: !!anahtar,
      saglayici: anahtar?.saglayici ?? null,
      saglayiciAdi: anahtar ? SAGLAYICI_BILGI[anahtar.saglayici].ad : null,
      bucket: anahtar?.bucket ?? null,
    };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireParent();
    const d = anahtarSemasi.parse(await req.json());
    const anahtar: DepoAnahtar =
      d.saglayici === "b2"
        ? { saglayici: "b2", endpoint: adresiTemizle(d.endpoint), accessKeyId: d.accessKeyId, secretAccessKey: d.secretAccessKey, bucket: d.bucket }
        : { saglayici: "r2", endpoint: `https://${d.accountId.trim()}.r2.cloudflarestorage.com`, accessKeyId: d.accessKeyId, secretAccessKey: d.secretAccessKey, bucket: d.bucket };

    const sonuc = await depoSina(anahtar);
    if (!sonuc.ok) throw new HttpError(400, sonuc.hata);
    await depoAnahtariYaz(anahtar);
    // Tarayicidan yukleme icin sart; aileye yaptirmiyoruz, kendimiz kuruyoruz.
    const cors = await corsAyarla(anahtar);
    return {
      ok: true,
      bucketDosyaSayisi: sonuc.dosya,
      saglayiciAdi: SAGLAYICI_BILGI[anahtar.saglayici].ad,
      cors: cors.ok,
    };
  });
}
