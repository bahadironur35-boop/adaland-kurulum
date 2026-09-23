import { cache } from "react";
import { prisma } from "./db";
import { toDateStr } from "./dates";
import { DEMO, DEMO_AD_COOKIE, demoAdCoz } from "./demo";

/**
 * Cocugun ve sayfanin adi. Her aile kendi adini koydugu icin bu degerler
 * kodda degil veritabaninda; metinler calisma zamaninda src/lib/turkce.ts
 * ile cekilir.
 *
 * Kurulum sihirbazi (Faz 5) doldurana kadar bos olabilirler. Bu yuzden iki
 * ayri okuma var: metadata/manifest icin ASLA firlatmayan getBrandSafe(),
 * (app) icindeki sayfalar icin kurulum garantisi isteyen requireBrand().
 */
export type Brand = {
  childName: string;
  siteName: string;
  contactEmail: string | null;
  birthDate: string;
  installedAt: string | null;
};

/** Kurulum eksikse notr deger: aile sihirbazi doldurmadan once de sayfa acilsin. */
export const VARSAYILAN_SITE_ADI = "Anılar";

/** İstek basina tek sorgu; kurulum yapilmamissa null. */
export const getBrand = cache(async (): Promise<Brand | null> => {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!s || !s.childName || !s.siteName) return null;
  // Demoda ad kisiye ozel: ziyaretcinin cerezi veritabanindaki adi ezer.
  const demoAd = DEMO ? await demoCerezAdi() : null;
  return {
    childName: demoAd?.cocuk ?? s.childName,
    siteName: demoAd?.site ?? s.siteName,
    contactEmail: s.contactEmail,
    birthDate: toDateStr(s.birthDate),
    installedAt: s.installedAt ? toDateStr(s.installedAt) : null,
  };
});

/** Istek baglami yoksa (build, cron) cerez okunamaz; o zaman sessizce null. */
async function demoCerezAdi() {
  try {
    const { cookies } = await import("next/headers");
    return demoAdCoz((await cookies()).get(DEMO_AD_COOKIE)?.value);
  } catch {
    return null;
  }
}

/**
 * generateMetadata ve manifest icin. ASLA firlatmaz:
 * Deploy Button'in ilk build'inde veritabani bos ya da erisilemez olabilir,
 * firlatirsa build coker ve aile hicbir sey goremez.
 */
export async function getBrandSafe(): Promise<{ childName: string | null; siteName: string }> {
  try {
    const b = await getBrand();
    return b ? { childName: b.childName, siteName: b.siteName } : { childName: null, siteName: VARSAYILAN_SITE_ADI };
  } catch {
    return { childName: null, siteName: VARSAYILAN_SITE_ADI };
  }
}

export class KurulumGerekli extends Error {
  constructor() {
    super("Kurulum tamamlanmamış.");
    this.name = "KurulumGerekli";
  }
}

/** (app) ve /p/[token] icindeki sayfalar: kurulum tamamlanmis olmali. */
export async function requireBrand(): Promise<Brand> {
  const b = await getBrand();
  if (!b) throw new KurulumGerekli();
  return b;
}

/** Yas rozetleri icin dogum tarihi ("YYYY-MM-DD"). */
export async function getBirthDate(): Promise<string> {
  return (await requireBrand()).birthDate;
}
