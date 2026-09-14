/**
 * DEMO kurulumunu ornek icerikle doldurur ve suresiz bir paylasim linki uretir.
 *
 *   DEMO_DATABASE_URL=... BLOB_READ_WRITE_TOKEN=... npx tsx scripts/demo-doldur.ts
 *
 * NEDEN AYRI BIR KURULUM: fotografci demoyu gostermek icin Onur'un gercek
 * sayfasini acmak zorunda kalmasin. Demoda gercek cocuk verisi YOK.
 *
 * NEDEN PAYLASIM LINKI: `/p/<token>` zaten SALT OKUNUR ve giris istemiyor.
 * Yani demo adresi kimseye sifre vermeden acilabiliyor ve kimse icerigi
 * bozamiyor. Ekleme akisini gostermek isteyen, demo hesabiyla girer.
 *
 * TEKRAR CALISTIRILABILIR: once demo icerigini siler, sonra yeniden yazar.
 * Metin icerigi ayrica HER GUN cron'la sifirlanir (src/lib/demo-icerik.ts);
 * bu betik yalniz ilk kurulum ve fotograflarin yenilenmesi icin gerekli.
 * Uretim veritabanina ASLA baglanma — DEMO_DATABASE_URL zorunlu, DATABASE_URL degil.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.demo" });
import { randomBytes } from "node:crypto";
import { deflateSync } from "node:zlib";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { put } from "@vercel/blob";

import {
  DEMO_COCUK as COCUK, DEMO_SITE as SITE, DEMO_DOGUM as DOGUM, demoIcerigiSifirla,
} from "../src/lib/demo-icerik";
// Sozler, ilkler, olcumler, mektup: src/lib/demo-icerik.ts (gunluk sifirlama da oradan okur).

// ---------- Basit PNG uretici (bagimlilik yok) ----------
// Demodaki "fotograflar" duz renkli illustrasyonlar: gercek bir cocuk fotografi
// kullanmak istemedik, stok fotograf da sahtelik hissi verirdi.
function png(genislik: number, yukseklik: number, boya: (x: number, y: number) => [number, number, number]): Buffer {
  const satirlar: Buffer[] = [];
  for (let y = 0; y < yukseklik; y++) {
    const satir = Buffer.alloc(1 + genislik * 3); // filtre baytı + RGB
    for (let x = 0; x < genislik; x++) {
      const [r, g, b] = boya(x / genislik, y / yukseklik);
      satir[1 + x * 3] = r; satir[2 + x * 3] = g; satir[3 + x * 3] = b;
    }
    satirlar.push(satir);
  }
  const ham = deflateSync(Buffer.concat(satirlar));
  const parca = (tip: string, veri: Buffer) => {
    const uzunluk = Buffer.alloc(4); uzunluk.writeUInt32BE(veri.length);
    const govde = Buffer.concat([Buffer.from(tip, "ascii"), veri]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(govde));
    return Buffer.concat([uzunluk, govde, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(genislik, 0); ihdr.writeUInt32BE(yukseklik, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8 bit, truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    parca("IHDR", ihdr), parca("IDAT", ham), parca("IEND", Buffer.alloc(0)),
  ]);
}
const CRC_TABLO = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLO[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const karistir = (a: number[], b: number[], t: number) =>
  [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as [number, number, number];

/** Basit, duz renkli sahneler. Daire = gunes/top, band = ufuk. */
// ---------- Basit WAV uretici (bagimlilik yok) ----------
// Demodaki "sesler" gercek cocuk sesi DEGIL, yumusak birer ezgi. Fotograflar
// nasil duz renkli illustrasyonsa bunlar da oyle: sayfanin dolu gorunmesi ve
// oynaticinin calistigini gostermesi icin. Ziyaretci demoda oldugunu zaten
// ustteki seritten biliyor.
function wav(saniye: number, ton: (t: number) => number, hz = 22050): Buffer {
  const n = Math.floor(saniye * hz);
  const veri = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, ton(i / hz)));
    veri.writeInt16LE(Math.round(v * 32767 * 0.55), i * 2);
  }
  const bas = Buffer.alloc(44);
  bas.write("RIFF", 0); bas.writeUInt32LE(36 + veri.length, 4); bas.write("WAVE", 8);
  bas.write("fmt ", 12); bas.writeUInt32LE(16, 16); bas.writeUInt16LE(1, 20);
  bas.writeUInt16LE(1, 22); bas.writeUInt32LE(hz, 24); bas.writeUInt32LE(hz * 2, 28);
  bas.writeUInt16LE(2, 32); bas.writeUInt16LE(16, 34);
  bas.write("data", 36); bas.writeUInt32LE(veri.length, 40);
  return Buffer.concat([bas, veri]);
}

/** [frekans, baslangic sn, sure sn] -> yumusak giris/cikisli ezgi */
function ezgi(notalar: [number, number, number][]) {
  return (t: number) => {
    let v = 0;
    for (const [hz, bas, sur] of notalar) {
      if (t >= bas && t < bas + sur) {
        const y = (t - bas) / sur;
        v += Math.sin(2 * Math.PI * hz * t) * Math.sin(Math.PI * y) ** 1.5 * 0.5;
      }
    }
    return v;
  };
}

const SESLER: { ad: string; baslik: string; tarih: string; sure: number; notalar: [number, number, number][] }[] = [
  { ad: "sarki", baslik: "Şarkı söylerken", tarih: "2026-06-12", sure: 2.4,
    notalar: [[523, 0, .5], [587, .5, .5], [659, 1, .5], [784, 1.5, .9]] },
  { ad: "masal", baslik: "Masal anlatırken", tarih: "2026-04-03", sure: 2.2,
    notalar: [[440, 0, .6], [392, .6, .6], [440, 1.2, .5], [523, 1.7, .5]] },
  { ad: "kahkaha", baslik: "Kahkaha", tarih: "2026-08-19", sure: 1.8,
    notalar: [[659, 0, .3], [784, .3, .3], [659, .6, .3], [880, .9, .9]] },
];

const SAHNELER: { ad: string; baslik: string; tarih: string; ciz: (x: number, y: number) => [number, number, number] }[] = [
  {
    ad: "kardan-adam", baslik: "ilk kardan adam", tarih: "2024-12-11",
    // Kardan adam bilerek YUZSUZ bir illustrasyon: demoyu gezen kisi cocuguna
    // kendi adini veriyor, sahnedeki cocuk onun cocugunun cinsiyetini soylemesin.
    ciz: (x, y) => {
      const govde = Math.hypot((x - 0.5) * 1.0, (y - 0.74) * 1.0) < 0.21;
      const kafa = Math.hypot((x - 0.5) * 1.0, (y - 0.42) * 1.0) < 0.14;
      const sapkaKenar = y > 0.275 && y < 0.315 && x > 0.355 && x < 0.645;
      const sapkaTepe = y > 0.15 && y <= 0.275 && x > 0.405 && x < 0.595;
      const goz = Math.hypot(x - 0.452, y - 0.395) < 0.019 || Math.hypot(x - 0.548, y - 0.395) < 0.019;
      const burun = x > 0.5 && x < 0.64 && Math.abs(y - 0.45) < 0.028 * (1 - (x - 0.5) / 0.14);
      const atki = y > 0.545 && y < 0.6 && Math.hypot((x - 0.5) * 1.0, (y - 0.42) * 1.0) < 0.2;
      const dugme = [0.66, 0.75, 0.84].some((d) => Math.hypot(x - 0.5, y - d) < 0.021) && govde;

      if (sapkaKenar || sapkaTepe) return [61, 74, 110];
      if (goz) return [45, 56, 92];
      if (burun) return [244, 133, 48];
      if (atki) return [226, 74, 84];
      if (dugme) return [45, 56, 92];
      if (kafa || govde) return karistir([255, 255, 255], [222, 232, 246], (y - 0.3) * 1.2);
      if (y > 0.72) return [236, 242, 250];
      const kar = (Math.sin(x * 47) * Math.cos(y * 61) + 1) / 2 > 0.985;
      return kar ? [255, 255, 255] : karistir([90, 118, 168], [186, 208, 236], y);
    },
  },
  {
    ad: "pasta", baslik: "üç yaş", tarih: "2026-04-09",
    ciz: (x, y) => {
      const mum = x > 0.47 && x < 0.53 && y > 0.28 && y < 0.5;
      const alev = Math.hypot(x - 0.5, (y - 0.25) * 1.7) < 0.05;
      if (alev) return [255, 197, 49];
      if (mum) return [255, 255, 255];
      if (y > 0.5) return karistir([240, 86, 94], [201, 58, 66], (y - 0.5) * 2);
      return [255, 243, 199];
    },
  },
  {
    ad: "deniz", baslik: "ilk deniz", tarih: "2026-07-28",
    ciz: (x, y) => {
      if (y > 0.78) return karistir([246, 222, 176], [226, 197, 146], (y - 0.78) * 4);
      if (y > 0.45) {
        const dalga = Math.sin(x * 22 + y * 30) > 0.82;
        return dalga ? [255, 255, 255] : karistir([58, 138, 176], [30, 96, 138], (y - 0.45) * 3);
      }
      const gunes = Math.hypot((x - 0.74) * 1.0, (y - 0.2) * 1.0) < 0.09;
      return gunes ? [255, 197, 49] : karistir([164, 214, 240], [214, 238, 250], y * 2);
    },
  },
];

async function main() {
  const url = process.env.DEMO_DATABASE_URL;
  if (!url) throw new Error("DEMO_DATABASE_URL yok. Üretim veritabanına bağlanmamak için bu değişken ZORUNLU.");
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN yok (demo kurulumunun Blob anahtarı).");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  // Fotograflar burada silinip yeniden yuklenir; metin icerigini demoIcerigiSifirla temizler.
  await prisma.photo.deleteMany();
  // ShareLink BILEREK silinmiyor: yayimlanmis demo adresi (bugunnededi.com/demo
  // yonlendirmesi ve teklif sayfasindaki baglanti) bu token'a bagli. Yeniden
  // doldurmak icerigi tazelemeli, adresi bozmamali.

  const sifre = await bcrypt.hash("demo1234", 10);
  const anne = await prisma.parent.upsert({
    where: { email: "anne@demo.local" },
    update: { name: "Anne", passwordHash: sifre, mustChangePassword: false },
    create: { email: "anne@demo.local", name: "Anne", passwordHash: sifre },
  });
  const baba = await prisma.parent.upsert({
    where: { email: "baba@demo.local" },
    update: { name: "Baba", passwordHash: sifre, mustChangePassword: false },
    create: { email: "baba@demo.local", name: "Baba", passwordHash: sifre },
  });

  await prisma.settings.upsert({
    where: { id: 1 },
    update: { childName: COCUK, siteName: SITE, birthDate: new Date(`${DOGUM}T00:00:00Z`), installedAt: new Date() },
    create: { id: 1, childName: COCUK, siteName: SITE, birthDate: new Date(`${DOGUM}T00:00:00Z`), installedAt: new Date() },
  });

  // Metin icerigi: gunluk sifirlamayla ayni fonksiyon, ayrismasin.
  await demoIcerigiSifirla(prisma);

  // Fotograflar: duz renkli illustrasyonlar, gercek fotograf degil.
  for (const s of SAHNELER) {
    const buf = png(900, 900, s.ciz);
    const kucuk = png(300, 300, s.ciz);
    const yol = `photos/${s.tarih.slice(0, 4)}/demo-${s.ad}-${randomBytes(4).toString("hex")}.png`;
    const kucukYol = yol.replace(".png", ".thumb.png");
    await put(yol, buf, { access: "private", contentType: "image/png", addRandomSuffix: false, allowOverwrite: true });
    await put(kucukYol, kucuk, { access: "private", contentType: "image/png", addRandomSuffix: false, allowOverwrite: true });
    await prisma.photo.create({
      data: { path: yol, thumbPath: kucukYol, mime: "image/png", takenAt: new Date(`${s.tarih}T00:00:00Z`),
              caption: s.baslik, width: 900, height: 900, sizeBytes: buf.length, addedById: baba.id },
    });
  }

  // Sesler: /sesler sayfasi bos kalmasin; demoyu gezen "burada ne var" diye
  // bakinca listeyi ve oynaticiyi gorsun.
  for (const g of SESLER) {
    const buf = wav(g.sure, ezgi(g.notalar));
    const yol = `audio/${g.tarih.slice(0, 4)}/demo-${g.ad}-${randomBytes(4).toString("hex")}.wav`;
    await put(yol, buf, { access: "private", contentType: "audio/wav", addRandomSuffix: false, allowOverwrite: true });
    await prisma.recording.create({
      data: { title: g.baslik, path: yol, mime: "audio/wav", recordedAt: new Date(`${g.tarih}T00:00:00Z`),
              durationSec: Math.round(g.sure), sizeBytes: buf.length, addedById: anne.id },
    });
  }

  // Suresiz paylasim linki = demo adresi. Salt okunur, giris istemiyor.
  // Varsa mevcut token korunur; yalnizca ilk calistirmada uretilir.
  const mevcut = await prisma.shareLink.findFirst({ where: { label: "Demo", revokedAt: null } });
  const token = mevcut?.token ?? randomBytes(24).toString("base64url");
  if (!mevcut) await prisma.shareLink.create({ data: { token, label: "Demo", expiresAt: null } });

  const sayilar = {
    söz: await prisma.saying.count(), fotoğraf: await prisma.photo.count(),
    ilk: await prisma.milestone.count(), ölçüm: await prisma.measurement.count(),
    mektup: await prisma.letter.count(), ses: await prisma.recording.count(),
  };
  console.log("\nDemo dolduruldu:", JSON.stringify(sayilar));
  console.log(mevcut
    ? "\nDEMO ADRESİ (değişmedi, yayımlanmış bağlantılar sağlam):"
    : "\nDEMO ADRESİ (YENİ — cocugun-sozleri/vercel.json içindeki /demo yönlendirmesini ve teklif sayfasını güncelle):");
  console.log(`   <demo-adresi>/p/${token}\n`);
  console.log("Ekleme akışını göstermek için giriş: anne@demo.local / demo1234 (yalnız fotoğrafçıya ver)\n");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
