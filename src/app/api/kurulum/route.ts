import { z } from "zod";
import { put, del } from "@vercel/blob";
import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { createSession, hashPassword, HttpError } from "@/lib/auth";
import { sessionSecret } from "@/lib/secrets";
import { getVapidPublicKey } from "@/lib/push";
import { tempPassword, normalizeCode } from "@/lib/password";
import { dateStr } from "@/lib/schemas";
import { blobYapilandirildi } from "@/lib/storage/blob";
import { harici } from "@/lib/storage/harici";

/**
 * Ilk calistirma: cocuk + site adi, ilk ebeveyn (kendi sifresiyle), istege bagli
 * ikinci ebeveyn (gecici sifreyle) ya da tek seferlik kurtarma kodu.
 *
 * Kilit: parent.count() === 0. Transaction icinde YENIDEN kontrol edilir; iki kisi
 * ayni anda kurulum linkini acarsa ikincisi 409 alir.
 *
 * Sonunda kendini kontrol eder: veritabani, depo (Blob'a yaz-oku-sil), bildirim
 * anahtari. Her satir sihirbazin son ekraninda yesil/kirmizi gorunur.
 */
const body = z.object({
  childName: z.string().trim().min(1, "Çocuğun adı gerekli").max(40),
  siteName: z.string().trim().min(1, "Sayfanın adı gerekli").max(60),
  birthDate: dateStr,
  parent: z.object({
    name: z.string().trim().min(1, "Adın gerekli").max(60),
    email: z.string().trim().toLowerCase().email("Geçerli bir e-posta gir"),
    password: z.string().min(8, "Şifre en az 8 karakter olmalı").max(200),
  }),
  second: z
    .object({
      name: z.string().trim().min(1).max(60),
      email: z.string().trim().toLowerCase().email("Geçerli bir e-posta gir"),
    })
    .nullable()
    .optional(),
});

function kurtarmaKodu(): string {
  // Telefonda okunup yazilabilsin: 3 blok x 4 karakter
  const s = tempPassword(12);
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export async function POST(req: Request) {
  return handle(async () => {
    const d = body.parse(await req.json());
    if (d.second && d.second.email === d.parent.email) throw new HttpError(400, "İki hesap aynı e-postayı kullanamaz.");

    const gecici = d.second ? tempPassword() : null;
    const kod = d.second ? null : kurtarmaKodu();

    const ilk = await prisma.$transaction(async (tx) => {
      if ((await tx.parent.count()) > 0) throw new HttpError(409, "Kurulum zaten yapılmış.");
      await tx.settings.upsert({
        where: { id: 1 },
        update: { childName: d.childName, siteName: d.siteName, birthDate: new Date(`${d.birthDate}T00:00:00Z`), contactEmail: d.parent.email, installedAt: new Date() },
        create: { id: 1, childName: d.childName, siteName: d.siteName, birthDate: new Date(`${d.birthDate}T00:00:00Z`), contactEmail: d.parent.email, installedAt: new Date() },
      });
      const ilk = await tx.parent.create({
        data: { email: d.parent.email, name: d.parent.name, passwordHash: await hashPassword(d.parent.password), mustChangePassword: false, careReminders: true },
      });
      if (d.second && gecici) {
        await tx.parent.create({
          data: { email: d.second.email, name: d.second.name, passwordHash: await hashPassword(gecici), mustChangePassword: true, careReminders: true },
        });
      }
      if (kod) {
        // Tiresiz hali saklanir; /api/auth/kurtar da tiresiz karsilastirir.
        const hash = await hashPassword(normalizeCode(kod));
        await tx.appSecret.upsert({ where: { key: "KURTARMA_KODU" }, update: { value: hash }, create: { key: "KURTARMA_KODU", value: hash } });
      }
      return ilk;
    });

    // Sirlar: yoksa simdi uretilir (oturum imzasi, VAPID cifti)
    const checks: { veritabani: boolean; depo: boolean | null; bildirim: boolean; depoNotu?: string } = { veritabani: true, depo: null, bildirim: false };
    try { await sessionSecret(); await getVapidPublicKey(); checks.bildirim = true; } catch (e) { console.error("[kurulum] sir", e); }

    // Depo: bu asamada NORMALDE hicbiri bagli degildir — sihirbazin bir sonraki
    // (zorunlu) adimi depolama baglamak. Bagli degil = HATA degil, henuz sira
    // gelmedi demek; mesaj ona gore notr. Iki istisna:
    //  - blobYapilandirildi(): Deploy Button ESKI SURUMUYLE acilmis bir proje
    //    (Blob store hala baglıysa test edilir).
    //  - harici.configured(): env ile onceden kurulmus, sihirbazi hic gormeyen kurulum.
    if (blobYapilandirildi()) {
      try {
        const t = await put("kurulum/kontrol.txt", "ok", { access: "private", addRandomSuffix: true });
        await del(t.url);
        checks.depo = true;
      } catch (e) {
        checks.depo = false;
        checks.depoNotu = e instanceof Error ? e.message : String(e);
      }
    } else if (await harici.configured()) {
      checks.depo = true;
    } else {
      checks.depo = false;
      checks.depoNotu = "Henüz bağlı değil; bir sonraki adımda bağlayacaksınız.";
    }

    await createSession({ id: ilk.id, email: ilk.email, name: ilk.name });
    return { ok: true, tempPassword: gecici, recoveryCode: kod, checks };
  });
}
