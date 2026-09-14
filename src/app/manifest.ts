import type { MetadataRoute } from "next";
import { getBrandSafe } from "@/lib/brand";
import { ilgi } from "@/lib/turkce";

/**
 * Ana ekrana eklenen uygulamanin adi. Veritabanindan okundugu icin dinamik.
 * getBrandSafe ASLA firlatmaz: ilk build'de veritabani bos olabilir.
 *
 * DIKKAT: manifest bir kez okunur ve isletim sistemi onu onbellege alir.
 * Aile kurulum sihirbazindan ONCE ana ekrana eklerse ad "Anılar" olarak
 * cakili kalir (ozellikle iOS). Bu yuzden sihirbazin SON adimi
 * "simdi ana ekrana ekle" olmali.
 */
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { childName, siteName } = await getBrandSafe();
  return {
    name: siteName,
    short_name: siteName,
    description: childName
      ? `${ilgi(childName)} sözleri, fotoğrafları ve ilkleri.`
      : "Bir çocuğun sözleri, fotoğrafları ve ilkleri.",
    start_url: "/",
    display: "standalone",
    background_color: "#eaf3fa",
    theme_color: "#eaf3fa",
    lang: "tr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Android: galeriden "Paylas" menusunde uygulama cikar; dosyalar sw.js'de yakalanir.
    share_target: {
      action: "/paylas-al",
      method: "POST",
      enctype: "multipart/form-data",
      params: { files: [{ name: "media", accept: ["image/*", "video/*"] }] },
    },
  } as MetadataRoute.Manifest;
}
