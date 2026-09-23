import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";

/**
 * Uygulama sirlari: oturum imzasi, VAPID cifti.
 *
 * Neden veritabaninda: Deploy Button ile kurulan ailenin hicbir ortam degiskeni
 * girmemesi icin. Ilk cagrida uretilir, bir daha degismez.
 *
 * Gecis kurali: ayni adli ortam degiskeni VARSA o kazanir ve DB'ye kopyalanir.
 * Boylece mevcut kurulumda kimse cikis yapmaz; env sonradan silinince de DB'deki
 * ayni degere dusulur.
 *
 * Modul kapsaminda onbellek: sir degismedigi icin lambda omru boyunca tutulur,
 * maliyet soguk baslangic basina tek sorgu.
 */
const cache = new Map<string, string>();

export async function getSecret(key: string, opts: { env?: string; generate: () => string }): Promise<string> {
  const hit = cache.get(key);
  if (hit) return hit;

  if (opts.env) {
    cache.set(key, opts.env);
    // Bir kerelik kopyalama. BEKLENMELI: sunucusuz ortamda yanit dondukten sonra
    // devam eden bir soz (floating promise) yarida kesilebilir ve kopya hic yazilmaz.
    // Maliyet soguk baslangic basina tek yazma; hata olursa sonraki baslangicta yeniden denenir.
    await prisma.appSecret
      .upsert({ where: { key }, update: { value: opts.env }, create: { key, value: opts.env } })
      .catch((e: unknown) => console.error("[secrets] env kopyalanamadi:", key, e));
    return opts.env;
  }

  const row = await prisma.appSecret.findUnique({ where: { key } });
  if (row) {
    cache.set(key, row.value);
    return row.value;
  }

  const value = opts.generate();
  try {
    const created = await prisma.appSecret.create({ data: { key, value } });
    cache.set(key, created.value);
    return created.value;
  } catch (e) {
    // Yaris: iki lambda ayni anda uretmeye kalkti. Ilk yazanin degeri gecerli.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const again = await prisma.appSecret.findUniqueOrThrow({ where: { key } });
      cache.set(key, again.value);
      return again.value;
    }
    throw e;
  }
}

/** Oturum ve passkey challenge cerezlerini imzalayan anahtar (HS256). */
export async function sessionSecret(): Promise<Uint8Array> {
  const s = await getSecret("SESSION_SECRET", {
    env: process.env.SESSION_SECRET,
    generate: () => randomBytes(48).toString("base64url"),
  });
  if (s.length < 32) throw new Error("SESSION_SECRET 32 karakterden kısa.");
  return new TextEncoder().encode(s);
}
