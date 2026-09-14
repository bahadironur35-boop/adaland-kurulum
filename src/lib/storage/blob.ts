import { issueSignedToken, presignUrl, del, get, list, type IssuedSignedToken } from "@vercel/blob";
import { GET_TTL_MS, PUT_TTL_MS, type Storage, type StorageUsage } from "./types";
import { SINGLE_PUT_MAX_BYTES } from "../limits";

/**
 * Vercel Blob, PRIVATE store. Deploy Button ile kurulan ailelerin deposu.
 * Store baglaninca Vercel BLOB_STORE_ID + VERCEL_OIDC_TOKEN (ve BLOB_READ_WRITE_TOKEN)
 * enjekte eder; SDK bunlari kendisi okur, aile hicbir anahtar girmez.
 *
 * ONEMLI FARK (R2'ye gore): issueSignedToken bir AG CAGRISIDIR (Blob kontrol API'si),
 * presignUrl ise yerel HMAC. Bu yuzden:
 * - GET delegasyonu store genelinde ("*"), uzun omurlu ve modul kapsaminda ONBELLEKLI.
 *   Alinmazsa 16 force-dynamic sayfanin her render'inda bir kontrol-API turu olur;
 *   "site yavasladi" olarak gorunur, nedeni fark edilmez.
 * - PUT delegasyonu dosyaya OZEL (yol + tur + boyut) ve ONBELLEKLENMEZ. Joker PUT
 *   delegasyonu onbellege almak cazip gorunur; o an dosya basina tur/boyut kisiti kaybolur.
 */
const DELEGATION_TTL_MS = 6 * 60 * 60 * 1000;
const REFRESH_BEFORE_MS = 10 * 60 * 1000;

let getToken: IssuedSignedToken | null = null;
let getTokenPromise: Promise<IssuedSignedToken> | null = null;

async function readToken(): Promise<IssuedSignedToken> {
  if (getToken && getToken.validUntil - Date.now() > REFRESH_BEFORE_MS) return getToken;
  // Ayni anda gelen istekler tek bir yenilemeyi beklesin.
  if (!getTokenPromise) {
    getTokenPromise = issueSignedToken({ pathname: "*", operations: ["get", "head"], validUntil: Date.now() + DELEGATION_TTL_MS })
      .then((t) => { getToken = t; return t; })
      .finally(() => { getTokenPromise = null; });
  }
  return getTokenPromise;
}

/** Senkron kontrol: media.ts depo secerken await etmeden bakabilsin. */
export function blobYapilandirildi(): boolean {
  return !!(process.env.BLOB_READ_WRITE_TOKEN || (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN));
}

export const blob: Storage = {
  configured: async () => blobYapilandirildi(),

  /**
   * Hobby'de dahil depolama 1 GB. DIKKAT: burada uzun sure 5 GB yaziyordu ve
   * YANLISTI — dokumandaki "5 GB included" satiri Pro planin fiyat orneginden.
   * Hobby'nin kendi rakami vercel.com/pricing'de ve hesabin Usage panelinde
   * 1 GB olarak gorunuyor (2026-09-14'te iki kaynaktan dogrulandi).
   * Yanlis deger dolulugu bes kat dusuk gosteriyordu, yani uyari serididi
   * depo kapanmadan once hic cikmayabilirdi.
   *
   * R2'nin yumusak asimindan KATEGORIK farkli: limit asilirsa depo 30 gun
   * tamamen kapanir, fotograflar da gorunmez olur.
   */
  freeLimitBytes: 1 * 1024 * 1024 * 1024,

  async mediaUrl(pathname) {
    const tok = await readToken();
    const { presignedUrl } = await presignUrl(tok, { operation: "get", pathname, access: "private", validUntil: Date.now() + GET_TTL_MS });
    return presignedUrl;
  },

  async planUpload(pathname, contentType, size, maxBytes) {
    // Olculdu: tek PUT 300 MB'da gecti, 600 MB'da 413 verdi. Ustu parcali.
    if (size > SINGLE_PUT_MAX_BYTES) {
      return { mode: "multipart", handleUploadUrl: "/api/upload/multipart", pathname };
    }
    // Dosyaya ozel delegasyon: tur ve boyut imzanin icinde, CDN reddeder.
    // Bu, R2'de olmayan bir sertlestirme: orada boyut kontrolu istemci beyanina guveniyordu.
    const tok = await issueSignedToken({
      pathname,
      operations: ["put"],
      allowedContentTypes: [contentType],
      maximumSizeInBytes: maxBytes,
      validUntil: Date.now() + PUT_TTL_MS,
    });
    const { presignedUrl } = await presignUrl(tok, {
      operation: "put",
      pathname,
      access: "private",
      allowedContentTypes: [contentType],
      maximumSizeInBytes: maxBytes,
      addRandomSuffix: false, // son eki media.ts zaten ekledi; yolu onceden bilmek istiyoruz
      allowOverwrite: false,
    });
    return { mode: "put", url: presignedUrl, pathname };
  },

  /**
   * Yol ile silme dogrulandi (list ve head sonrasinda bos). DIKKAT: daha once verilmis
   * imzali GET adresi CDN onbelleginden en fazla 1 saat daha cevap verebilir; bu, R2'de
   * de vardi ve kabul edilebilir (adres zaten 1 saat omurlu).
   */
  async deleteMedia(pathnames) {
    try {
      await del(pathnames);
    } catch (e) {
      // Kayit silinsin, dosya artik olsa da bir sonraki temizlikte gider.
      console.error("[media] Blob silinemedi", e);
    }
  },

  async mediaStream(pathname) {
    const r = await get(pathname, { access: "private" });
    if (!r || r.statusCode !== 200) return null;
    return r.stream;
  },

  async storageUsage() {
    const usage: StorageUsage = { totalBytes: 0, count: 0, byFolder: {} };
    let cursor: string | undefined;
    do {
      const page = await list({ cursor, limit: 1000 });
      for (const b of page.blobs) {
        const folder = b.pathname.split("/")[0] || "diger";
        const f = (usage.byFolder[folder] ??= { bytes: 0, count: 0 });
        f.bytes += b.size;
        f.count += 1;
        usage.totalBytes += b.size;
        usage.count += 1;
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return usage;
  },
};

/**
 * Gocte kaynak envanteri: yol -> boyut. storageUsage() klasor bazinda toplar,
 * burada tek tek anahtarlar gerekiyor (hangisi karsiya gecti, hangisi gecmedi).
 */
export async function blobEnvanteri(): Promise<Map<string, number>> {
  // YENI kurulumlarda Blob HIC BAGLI DEGIL (Deploy Button artik acmiyor).
  // Bagli degilken list() token bulamadigi icin firlatir; bu durum HATA
  // degil, "tasinacak dosya yok" demek — bos donup goc dongusunun aninda
  // bitmesini sagliyor (bkz. depo-tasi.ts, kurulum sihirbazinin zorunlu adimi).
  if (!blobYapilandirildi()) return new Map();
  const out = new Map<string, number>();
  let cursor: string | undefined;
  do {
    const page = await list({ cursor, limit: 1000 });
    for (const b of page.blobs) out.set(b.pathname, b.size);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}
