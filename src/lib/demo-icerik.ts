import type { PrismaClient } from "@prisma/client";

/**
 * Demonun sabit icerigi: uydurma cocuk "Zeynep". TEK KAYNAK — hem ilk
 * doldurma betigi (scripts/demo-doldur.ts) hem gunluk sifirlama buradan okur.
 *
 * Gercek cocuk sozu DEGIL; hepsi uydurma. Bkz. `npm run tara:ornek` kurali:
 * public ornekler gercek icerikle kelime koku paylasmamali.
 */
export const DEMO_COCUK = "Zeynep";
export const DEMO_SITE = "Zeynep'in Dünyası";
export const DEMO_DOGUM = "2023-04-09";

export const DEMO_SOZLER: [string, string, string | null][] = [
  ["Ay neden hep peşimizden geliyor?", "2026-03-14", "Akşam yürüyüşünde, gökyüzüne bakarken"],
  ["Balıklar uyurken ıslanmıyor mu?", "2026-05-02", "Akvaryumda"],
  ["Ben büyüyünce hem itfaiyeci hem kedi olacağım.", "2026-05-21", null],
  ["Bulutlar yorulunca yağmur oluyor galiba.", "2026-06-03", "Yağmurlu bir sabah"],
  ["Gökyüzü bitince arkasında ne var?", "2026-06-19", null],
  ["Bu çorba biraz kızgın.", "2026-07-01", "Sıcak çorbayı üflerken"],
  ["Uyumak istemiyorum, sadece gözlerim istiyor.", "2026-07-14", null],
  ["Karıncalar da pazara gidiyor mu?", "2026-08-02", "Bahçede"],
  ["Sen küçükken renkli miydin?", "2026-08-20", "Eski fotoğraflara bakarken"],
  ["Rüzgâr ağaçları gıdıklıyor.", "2026-09-05", null],
];

export const DEMO_ILKLER: [string, string, string | null][] = [
  ["İlk adım", "2024-03-18", "Mutfakta, buzdolabına doğru"],
  ["İlk kelime", "2024-01-27", "\"kedi\""],
  ["İlk kardan adam", "2024-12-11", "Bahçede, havuç burunlu"],
  ["İlk bisiklet", "2026-04-22", "Üç tekerlekli, parkta"],
];

export const DEMO_OLCUMLER: [string, number, number][] = [
  ["2024-04-09", 74.5, 9.2], ["2024-10-09", 81.0, 10.6],
  ["2025-04-09", 88.5, 12.1], ["2025-10-09", 94.0, 13.4],
  ["2026-04-09", 100.5, 15.2], ["2026-09-09", 104.0, 16.1],
];

export const DEMO_MEKTUP = {
  title: "On sekizinci yaşına",
  openAt: "2041-04-09",
  body: "Bunu yazdığımda üç yaşındaydın ve bulutların yorulduğunu düşünüyordun. Umarım hâlâ öyle düşünüyorsundur.",
};

const gun = (t: string) => new Date(`${t}T00:00:00Z`);

/**
 * En son gece 03:00 (Türkiye saati) ani. Sifirlama bu andan sonra bir kez
 * calisir: gece kimse demoyu gezmiyor, yani ziyaretci kendi ekledigini
 * oturumu sirasinda kaybetmez.
 *
 * Turkiye 2016'dan beri yil boyu UTC+3, yaz saati yok — 03:00 Istanbul tam
 * olarak 00:00 UTC. Bu yuzden UTC gununun basi dogru sinir.
 */
export function sonSifirlamaSiniri(simdi = new Date()): Date {
  const s = new Date(simdi);
  s.setUTCHours(0, 0, 0, 0);
  return s;
}

/**
 * Metin icerigini sifirlar: ziyaretcilerin ekledigi ve degistirdigi her sey
 * gider, Zeynep'in icerigi aynen geri gelir. Fotograflara DOKUNULMAZ — demoda
 * fotograf yazma uclari kapali oldugu icin bozulamazlar, Blob'a da tekrar
 * yuklemek gerekmez. Ebeveynler ve paylasim linki de yerinde kalir.
 *
 * Tek transaction: sifirlama sirasinda sayfa acan biri ya eski ya yeni halini
 * gorur, yari bos bir demo asla.
 */
export async function demoIcerigiSifirla(prisma: PrismaClient): Promise<void> {
  const anne = await prisma.parent.findUnique({ where: { email: "anne@demo.local" } });
  const baba = await prisma.parent.findUnique({ where: { email: "baba@demo.local" } });
  if (!anne || !baba) throw new Error("Demo ebeveynleri yok; önce scripts/demo-doldur.ts çalıştırılmalı.");

  await prisma.$transaction([
    prisma.saying.deleteMany(),
    prisma.milestone.deleteMany(),
    prisma.measurement.deleteMany(),
    prisma.letter.deleteMany(),
    prisma.recording.deleteMany(),
    prisma.video.deleteMany(),
    prisma.settings.updateMany({ where: { id: 1 }, data: { childName: DEMO_COCUK, siteName: DEMO_SITE, birthDate: gun(DEMO_DOGUM) } }),
    prisma.saying.createMany({
      data: DEMO_SOZLER.map(([text, t, context], i) => ({
        text, context, saidAt: gun(t), isFavorite: i % 4 === 0, addedById: i % 2 ? baba.id : anne.id,
      })),
    }),
    prisma.milestone.createMany({
      data: DEMO_ILKLER.map(([title, t, note]) => ({ title, note, date: gun(t), addedById: anne.id })),
    }),
    prisma.measurement.createMany({
      data: DEMO_OLCUMLER.map(([t, heightCm, weightKg]) => ({ date: gun(t), heightCm, weightKg })),
    }),
    prisma.letter.create({
      data: { title: DEMO_MEKTUP.title, body: DEMO_MEKTUP.body, openAt: gun(DEMO_MEKTUP.openAt), authorId: anne.id },
    }),
  ]);
}
