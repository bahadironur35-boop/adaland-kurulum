import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectsCommand, ListObjectsV2Command, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GET_TTL_MS, PUT_TTL_MS, type Storage, type StorageUsage } from "./types";
import { depoAnahtari, SAGLAYICI_BILGI, type DepoAnahtar } from "./ayar";

/**
 * Harici, S3 UYUMLU depo: Backblaze B2 ya da Cloudflare R2. Bucket herkese KAPALI.
 *
 * Ailenin "alani 10 GB'a cikar" hedefi. Kurulumla gelen Vercel Blob'da ucretsiz
 * 1 GB var ve sinir asilirsa depo 30 gun TAMAMEN kapanir; burada 10 GB var ve
 * asim yumusak.
 *
 * Tek modul, iki saglayici: ikisi de ayni S3 API'sini konusuyor, fark yalnizca
 * endpoint. Onerilen B2, cunku kayitta kredi karti istemiyor (R2 ucretsiz
 * katmanda bile istiyor). Ikisinde de imzali ve SURELI adres var.
 *
 * Anahtarlar VERITABANINDAN geliyor (storage/ayar.ts); aile hicbir panele
 * ortam degiskeni girmiyor.
 */
function eksik(): never {
  throw new Error("Harici depo anahtarları tanımlı değil.");
}

/**
 * Istemci onbellegi ANAHTARA BAGLI: aile anahtari degistirirse (yanlis
 * yapistirdi, token'i yeniledi) isinmis lambda eski istemciyle devam etmesin.
 */
let onbellek: { imza: string; istemci: S3Client } | null = null;

function yeniIstemci(a: DepoAnahtar): S3Client {
  return new S3Client({
    region: bolge(a),
    endpoint: a.endpoint,
    credentials: { accessKeyId: a.accessKeyId, secretAccessKey: a.secretAccessKey },
  });
}

/**
 * R2 bolge tanimaz ("auto"). B2 TANIR ve imza bolgeyi icerir: yanlis bolgeyle
 * imza dogrulanmaz. Bolge adresin icinde: s3.eu-central-003.backblazeb2.com
 */
function bolge(a: DepoAnahtar): string {
  if (a.saglayici === "r2") return "auto";
  const m = /^https?:\/\/s3\.([a-z0-9-]+)\.backblazeb2\.com/i.exec(a.endpoint);
  return m ? m[1] : "us-west-004";
}

async function s3(): Promise<{ istemci: S3Client; bucket: string }> {
  const a = await depoAnahtari();
  if (!a) eksik();
  const imza = `${a.endpoint}|${a.accessKeyId}|${a.bucket}`;
  if (!onbellek || onbellek.imza !== imza) onbellek = { imza, istemci: yeniIstemci(a) };
  return { istemci: onbellek.istemci, bucket: a.bucket };
}

export const harici: Storage = {
  configured: async () => !!(await depoAnahtari()),

  /** B2 ve R2: ikisinde de ucretsiz 10 GB. */
  freeLimitBytes: SAGLAYICI_BILGI.b2.serbestBayt,

  /** Imza yerel HMAC, ag istegi yok. */
  async mediaUrl(pathname) {
    const { istemci, bucket } = await s3();
    return getSignedUrl(istemci, new GetObjectCommand({ Bucket: bucket, Key: pathname }), { expiresIn: GET_TTL_MS / 1000 });
  },

  /** Tek PUT; S3 uyumlu depolar gigabaytlik dosyayi tek parcada kabul ediyor. */
  async planUpload(pathname, contentType) {
    const { istemci, bucket } = await s3();
    const url = await getSignedUrl(istemci, new PutObjectCommand({ Bucket: bucket, Key: pathname, ContentType: contentType }), { expiresIn: PUT_TTL_MS / 1000 });
    return { mode: "put", url, pathname };
  },

  async deleteMedia(keys) {
    try {
      const { istemci, bucket } = await s3();
      await istemci.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true } }));
    } catch (e) {
      // Kayit silinsin, dosya artik olsa da bir sonraki temizlikte gider.
      console.error("[media] harici depodan silinemedi", e);
    }
  },

  async mediaStream(pathname) {
    const { istemci, bucket } = await s3();
    const res = await istemci.send(new GetObjectCommand({ Bucket: bucket, Key: pathname }));
    const body = res.Body as { transformToWebStream?: () => ReadableStream<Uint8Array> } | undefined;
    return body?.transformToWebStream ? body.transformToWebStream() : null;
  },

  async storageUsage() {
    const { istemci, bucket } = await s3();
    const usage: StorageUsage = { totalBytes: 0, count: 0, byFolder: {} };
    for (const [key, size] of await listele(istemci, bucket)) {
      const folder = key.split("/")[0] || "diger";
      const f = (usage.byFolder[folder] ??= { bytes: 0, count: 0 });
      f.bytes += size;
      f.count += 1;
      usage.totalBytes += size;
      usage.count += 1;
    }
    return usage;
  },
};

async function listele(istemci: S3Client, bucket: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  let token: string | undefined;
  do {
    const page = await istemci.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token, MaxKeys: 1000 }));
    for (const o of page.Contents ?? []) if (o.Key) out.set(o.Key, o.Size ?? 0);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return out;
}

/** Gocte "bu dosya karsi tarafa gecti mi" kontrolu; anahtar -> boyut. */
export async function hariciEnvanter(): Promise<Map<string, number>> {
  const { istemci, bucket } = await s3();
  return listele(istemci, bucket);
}

/**
 * Verilen anahtarlarla baglanti sinamasi. Aile alanlari doldurdugunda
 * KAYDETMEDEN once calisir: yanlis yapistirilmis bir anahtarla goce baslamak
 * yarida kalmis bir tasima ve "fotograflarim nerede" paniği demek olurdu.
 */
export async function depoSina(a: DepoAnahtar): Promise<{ ok: true; dosya: number } | { ok: false; hata: string }> {
  let istemci: S3Client | null = null;
  try {
    istemci = yeniIstemci(a);
    const page = await istemci.send(new ListObjectsV2Command({ Bucket: a.bucket, MaxKeys: 1 }));
    return { ok: true, dosya: page.KeyCount ?? 0 };
  } catch (e) {
    const ham = e instanceof Error ? e.message : String(e);
    // Saglayici mesajlari ingilizce ve teknik; GERCEK denemelerde gorulenler
    // (2026-09-14, B2 ve R2'ye sahte anahtarla baglanilarak olculdu) cevriliyor.
    // Ceviremediginde ham mesaji gostermek, hic gostermemekten iyi.
    const hata =
      /NoSuchBucket|not exist/i.test(ham)
        ? "Bu isimde bir depo (bucket) bulunamadı. Panelde yazan adı birebir kopyalayın."
      : /Malformed Access Key|InvalidAccessKeyId/i.test(ham)
        ? "Erişim anahtarı (keyID) hatalı görünüyor. Panelden yeniden kopyalayın."
      : /SignatureDoesNotMatch|Unauthorized|InvalidArgument/i.test(ham)
        ? "Gizli anahtar yanlış. Anahtar bir daha gösterilmediği için, gerekirse yeni bir anahtar üretin."
      : /AccessDenied|Forbidden/i.test(ham)
        ? "Anahtarın bu depoya yetkisi yok. Anahtarı okuma+yazma yetkisiyle yeniden üretin."
      : /ENOTFOUND|EAI_AGAIN|getaddrinfo|Inaccessible host/i.test(ham)
        ? "Adres bulunamadı. Endpoint satırını panelden birebir kopyaladığınızdan emin olun."
      // R2'de yanlis hesap kimligi, alan adi olmadigi icin TLS el sikismasinda
      // patliyor ve "SSL alert number 40" gibi anlasilmaz bir mesaj donuyor.
      : /EPROTO|handshake failure|SSL alert|CERT_|certificate/i.test(ham)
        ? "Hesap kimliği (Account ID) yanlış görünüyor; böyle bir adres yok."
      : /timeout|ETIMEDOUT|ECONNRESET/i.test(ham)
        ? "Depoya ulaşılamadı, bağlantı zaman aşımına uğradı. Birazdan tekrar deneyin."
      : ham;
    return { ok: false, hata };
  } finally {
    istemci?.destroy();
  }
}

/**
 * Tarayicinin depoya dogrudan yazabilmesi icin bucket'in CORS kurali gerekiyor.
 * BUNU AILEYE YAPTIRMIYORUZ: panelde boyle bir bolum var ama JSON kural yazmak
 * bir anne babadan istenecek is degil, ve atlanirsa hata "tarayici istegi
 * reddetti" diye anlasilmaz bicimde geliyor. Anahtarlari zaten aldigimiz icin
 * kurali kendimiz yaziyoruz; aile bu adimi hic gormuyor.
 *
 * DOGRULANDI (2026-09-14, gercek B2 hesabi): tek bucket'a kisitli ve
 * "Read and Write" yetkili anahtar bu kurali yazabiliyor. Yani rehberdeki
 * dar yetkili anahtar yeterli, "All" demeye gerek yok.
 *
 * AllowedOrigins "*" BILEREK: erisimi belirleyen sey koken degil IMZA. Imzasiz
 * istek her kokenden reddediliyor, imzali istegi de ancak ailenin kendi oturumu
 * alabiliyor. Koken sabitlenseydi, aile sonradan kendi alan adini bagladiginda
 * yuklemeler sessizce bozulurdu.
 */
export async function corsAyarla(a: DepoAnahtar): Promise<{ ok: boolean; hata?: string }> {
  let istemci: S3Client | null = null;
  try {
    istemci = yeniIstemci(a);
    await istemci.send(new PutBucketCorsCommand({
      Bucket: a.bucket,
      CORSConfiguration: {
        CORSRules: [{
          AllowedOrigins: ["*"],
          AllowedMethods: ["GET", "PUT", "HEAD"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["etag"],
          MaxAgeSeconds: 3600,
        }],
      },
    }));
    return { ok: true };
  } catch (e) {
    // Anahtarin bucket ayari yetkisi olmayabilir; goc yine de denenebilir,
    // arayuz o zaman elle ayar talimatini gosteriyor.
    return { ok: false, hata: e instanceof Error ? e.message : String(e) };
  } finally {
    istemci?.destroy();
  }
}
