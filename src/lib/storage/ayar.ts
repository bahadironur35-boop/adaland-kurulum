import { prisma } from "../db";

/**
 * Hangi deponun kullanildigi ve harici depo anahtarlari.
 * ORTAM DEGISKENI DEGIL, VERITABANI: aile Vercel paneline hic girmiyor,
 * depo yukseltmesi bastan sona uygulamanin icinde (Ayarlar > Depolama).
 *
 * IKI ASAMALI TASARIM:
 *   1. Kurulum: Vercel Blob. Sifir ayar, kredi karti yok, ucretsiz 1 GB.
 *   2. Alan dar gelirse: S3 UYUMLU harici depo, ucretsiz 10 GB.
 *
 * Saglayici baglayici degil, cunku ikisi de ayni S3 API'sini konusuyor:
 * - b2  (Backblaze B2)  ONERILEN: 10 GB ucretsiz ve KAYITTA KREDI KARTI ISTEMIYOR.
 * - r2  (Cloudflare R2) 10 GB ucretsiz ama ucretsiz katmanda bile kart zorunlu.
 * Ikisinde de imzali ve SURELI adres var, yani "adres bir saat sonra calismaz"
 * sozu bozulmuyor. (Cloudinary bu yuzden elendi: ucretsiz planinda imzali adres
 * var ama SURESIZ, ustelik video basina 100 MB sinirı var.)
 *
 * ONCELIK: once VERITABANI, sonra ortam degiskeni. Tersi degil — cunku
 * uygulamadan ACIKCA kaydedilen anahtar, ortamda unutulmus eski bir
 * degiskeni ezmeli. Aksi halde aile Ayarlar'dan yeni deposunu baglar,
 * "baglanti calisiyor" yazisini gorur, ama uygulama sessizce ESKI depoya
 * yazmaya devam eder; hata da vermez. (Onur'un kendi kurulumunda tam bu
 * durum var: Vercel'de R2_* degiskenleri hala duruyor.)
 *
 * Env yine de duruyor: hic arayuzu kullanmamis, bastan env ile kurulmus bir
 * kurulum bozulmasin diye. Yani env YEDEK, birincil degil.
 */
export type Saglayici = "b2" | "r2";

export type DepoAnahtar = {
  saglayici: Saglayici;
  /** Tam S3 adresi, ornek: https://s3.eu-central-003.backblazeb2.com */
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

export type DepoAdi = "blob" | "harici";

const ALANLAR = {
  saglayici: "DEPO_SAGLAYICI",
  endpoint: "DEPO_ENDPOINT",
  accessKeyId: "DEPO_ACCESS_KEY_ID",
  secretAccessKey: "DEPO_SECRET_ACCESS_KEY",
  bucket: "DEPO_BUCKET",
} as const;

const AKTIF_DEPO = "MEDIA_BACKEND";

/**
 * KISA OMURLU onbellek, secrets.ts'teki kalici onbellekten bilerek farkli:
 * depo bir kez degisiyor ama degistigi an ISINMIS lambda'lar da yeni depoyu
 * gormeli. Kalici onbellek olsaydi goc bittikten sonra bazi istekler eski
 * depodan okumaya devam eder, fotograflar rastgele kaybolurdu.
 */
const OMUR_MS = 30_000;
let onbellek: { zaman: number; anahtar: DepoAnahtar | null; depo: DepoAdi } | null = null;

export function depoOnbellegiBosalt() {
  onbellek = null;
}

/** Eski kurulumlarin R2_* degiskenleri; endpoint hesap kimliginden turetiliyor. */
function envAnahtari(): DepoAnahtar | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET)) return null;
  return {
    saglayici: "r2",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET,
  };
}

async function oku(): Promise<{ anahtar: DepoAnahtar | null; depo: DepoAdi }> {
  if (onbellek && Date.now() - onbellek.zaman < OMUR_MS) {
    return { anahtar: onbellek.anahtar, depo: onbellek.depo };
  }

  let anahtar: DepoAnahtar | null = null;
  let depo: DepoAdi = "blob";

  try {
    const satirlar = await prisma.appSecret.findMany({
      where: { key: { in: [...Object.values(ALANLAR), AKTIF_DEPO] } },
    });
    const h = new Map(satirlar.map((s) => [s.key, s.value]));

    const d = {
      saglayici: h.get(ALANLAR.saglayici) as Saglayici | undefined,
      endpoint: h.get(ALANLAR.endpoint),
      accessKeyId: h.get(ALANLAR.accessKeyId),
      secretAccessKey: h.get(ALANLAR.secretAccessKey),
      bucket: h.get(ALANLAR.bucket),
    };
    if (d.endpoint && d.accessKeyId && d.secretAccessKey && d.bucket) {
      anahtar = { ...d, saglayici: d.saglayici === "r2" ? "r2" : "b2" } as DepoAnahtar;
    }
    if (h.get(AKTIF_DEPO) === "harici" || h.get(AKTIF_DEPO) === "r2") depo = "harici";
  } catch (e) {
    // Veritabani okunamadiysa Blob'da kal: kurulum aninda tablolar henuz yok olabilir.
    console.error("[depo] ayar okunamadi, Blob'da kalindi", e);
  }

  // Veritabaninda anahtar yoksa ortamdakine dus (hic arayuzu kullanmamis kurulum).
  if (!anahtar) anahtar = envAnahtari();
  // Env ile acilan acil geri donus kolu her seyi ezer.
  if (process.env.MEDIA_BACKEND === "r2" || process.env.MEDIA_BACKEND === "harici") depo = "harici";
  // Anahtar yoksa harici depo secilemez; yoksa medya adresleri sessizce bos donerdi.
  if (depo === "harici" && !anahtar) depo = "blob";

  onbellek = { zaman: Date.now(), anahtar, depo };
  return { anahtar, depo };
}

export async function depoAnahtari(): Promise<DepoAnahtar | null> {
  return (await oku()).anahtar;
}

export async function aktifDepoAdi(): Promise<DepoAdi> {
  return (await oku()).depo;
}

export async function depoAnahtariYaz(a: DepoAnahtar): Promise<void> {
  await prisma.$transaction(
    Object.entries(ALANLAR).map(([alan, key]) => {
      const value = String(a[alan as keyof DepoAnahtar]);
      return prisma.appSecret.upsert({ where: { key }, update: { value }, create: { key, value } });
    }),
  );
  depoOnbellegiBosalt();
}

/** Goc bittikten SONRA cagrilir; once cagrilirsa mevcut fotograflar gorunmez olur. */
export async function aktifDepoYaz(ad: DepoAdi): Promise<void> {
  await prisma.appSecret.upsert({
    where: { key: AKTIF_DEPO },
    update: { value: ad },
    create: { key: AKTIF_DEPO, value: ad },
  });
  depoOnbellegiBosalt();
}

/** Saglayiciya gore gosterim adi ve ucretsiz sinir (ikisi de 10 GB). */
export const SAGLAYICI_BILGI: Record<Saglayici, { ad: string; serbestBayt: number }> = {
  b2: { ad: "Backblaze B2", serbestBayt: 10 * 1024 * 1024 * 1024 },
  r2: { ad: "Cloudflare R2", serbestBayt: 10 * 1024 * 1024 * 1024 },
};
