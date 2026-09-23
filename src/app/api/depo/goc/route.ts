import { z } from "zod";
import { handle } from "@/lib/api";
import { HttpError, requireParent } from "@/lib/auth";
import { blob, blobEnvanteri } from "@/lib/storage/blob";
import { harici, hariciEnvanter } from "@/lib/storage/harici";
import { aktifDepoAdi, aktifDepoYaz, depoAnahtari } from "@/lib/storage/ayar";

/**
 * Vercel Blob -> harici S3 uyumlu depo (Backblaze B2 / Cloudflare R2) gocu.
 *
 * DOSYALARI TARAYICI TASIR, sunucu degil. Nedeni tek cumleyle: sunucusuz
 * fonksiyonun omru sinirli, tek bir 500 MB'lik video o sureye sigmaz ve goc
 * her seferinde ayni yerde olurdu. Tarayici imzali adresle kaynaktan indirip
 * imzali adresle hedefe yukluyor; ilerleme cubugu da dogal olarak cikiyor.
 *
 * KESILEBILIR: her cagri "karsida henuz olmayanlari" hesapliyor. Sekme
 * kapanirsa kaldigi yerden devam eder, ayni dosyayi iki kez tasimaz.
 *
 * VERITABANINA DOKUNULMAZ: Photo.path vb. YOL tutuyor, iki depoda da ayni yol.
 * Bu yuzden gocun ortasinda bile sistem tutarli: depo degistirme (aktifDepoYaz)
 * EN SONDA, her dosya karsiya gectikten sonra yapiliyor.
 */
export const dynamic = "force-dynamic";

/** Bir cagrida en fazla bu kadar dosya adi donuyor; istemci bitince yenisini istiyor. */
const SAYFA = 150;

const TURLER: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
  m4a: "audio/mp4", mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg",
};

function turBul(yol: string): string {
  const ek = yol.split(".").pop()?.toLowerCase() ?? "";
  return TURLER[ek] ?? "application/octet-stream";
}

async function durum() {
  const [kaynak, hedef] = await Promise.all([blobEnvanteri(), hariciEnvanter()]);
  const kalan: { yol: string; bayt: number; tur: string }[] = [];
  let kalanDosya = 0;
  let kalanBayt = 0;
  let tasinanBayt = 0;
  for (const [yol, bayt] of kaynak) {
    // Boyut ESITSE gecmis sayilir. Yalnizca "anahtar var mi" diye bakmak,
    // yarida kesilmis bir yuklemeyi tamamlanmis gosterirdi.
    if (hedef.get(yol) === bayt) {
      tasinanBayt += bayt;
      continue;
    }
    kalanDosya += 1;
    kalanBayt += bayt;
    if (kalan.length < SAYFA) kalan.push({ yol, bayt, tur: turBul(yol) });
  }
  return { toplamDosya: kaynak.size, kalanDosya, kalan, kalanBayt, tasinanBayt, bitti: kalanDosya === 0 };
}

export async function GET() {
  return handle(async () => {
    await requireParent();
    if (!(await depoAnahtari())) throw new HttpError(400, "Önce depo anahtarlarını kaydedin.");
    const d = await durum();
    return {
      aktifDepo: await aktifDepoAdi(),
      toplamDosya: d.toplamDosya,
      kalanDosya: d.kalanDosya,
      kalan: d.kalan,
      kalanBayt: d.kalanBayt,
      tasinanBayt: d.tasinanBayt,
      bitti: d.bitti,
    };
  });
}

const istekSemasi = z.discriminatedUnion("islem", [
  z.object({ islem: z.literal("imza"), yol: z.string().min(1).max(500) }),
  z.object({ islem: z.literal("bitir") }),
]);

export async function POST(req: Request) {
  return handle(async () => {
    await requireParent();
    const d = istekSemasi.parse(await req.json());
    if (!(await depoAnahtari())) throw new HttpError(400, "Önce depo anahtarlarını kaydedin.");

    if (d.islem === "imza") {
      // Yol istemciden geliyor; kaynakta GERCEKTEN var mi diye bakiyoruz.
      // Yoksa istemci istedigi yola imzali yazma hakki alabilirdi.
      const kaynak = await blobEnvanteri();
      if (!kaynak.has(d.yol)) throw new HttpError(404, "Bu dosya kaynak depoda yok.");
      // Turu istemciye sormuyoruz, yoldan turetiyoruz: hedefte yanlis bir
      // Content-Type kalici olur ve videolar tarayicida acilmaz.
      const tur = turBul(d.yol);
      const [indir, plan] = await Promise.all([blob.mediaUrl(d.yol), harici.planUpload(d.yol, tur, kaynak.get(d.yol) ?? 0, 0)]);
      if (plan.mode !== "put") throw new HttpError(500, "Hedef depo tek parça yükleme vermedi.");
      return { indir, yukle: plan.url, tur };
    }

    // bitir: bir daha say, gercekten bittiyse depoyu cevir.
    const son = await durum();
    if (!son.bitti) throw new HttpError(409, `Henüz ${son.kalanDosya} dosya taşınmadı.`);
    await aktifDepoYaz("harici");
    return { ok: true, aktifDepo: "harici", tasinanDosya: son.toplamDosya, tasinanBayt: son.tasinanBayt };
  });
}
