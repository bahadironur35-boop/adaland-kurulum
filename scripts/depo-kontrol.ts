/**
 * Depo seciminin kurallari GERCEKTEN boyle mi davraniyor.
 *
 * En kritigi: uygulamadan kaydedilen anahtar, ORTAMDA UNUTULMUS eski bir
 * degiskeni ezmeli. Ters olsaydi hata sessiz olurdu — aile yeni deposunu
 * baglar, "baglanti calisiyor" yazisini gorur, uygulama eski depoya yazmaya
 * devam eder, hicbir yerde hata gorunmez.
 *
 * CALISTIRMA (bos, ayri bir semada):
 *   npx prisma migrate deploy           (DATABASE_URL_UNPOOLED="...&schema=depotest")
 *   DATABASE_SCHEMA=depotest npm run test:depo
 *
 * Betik AppSecret satirlarina yazip siliyor; bu yuzden `public` semasinda
 * CALISMAYI REDDEDER. Gercek bir kurulumda kosarsa ailenin depo ayarini bozardi.
 */
import { prisma } from "../src/lib/db";
import {
  depoAnahtari, depoAnahtariYaz, aktifDepoAdi, aktifDepoYaz, depoOnbellegiBosalt,
} from "../src/lib/storage/ayar";

const sema = process.env.DATABASE_SCHEMA;
if (!sema || sema === "public") {
  console.error(
    "Bu betik AppSecret'a yazıp siliyor. Gerçek veriyi bozmamak için ayrı bir\n" +
    "şema gerekiyor: DATABASE_SCHEMA=depotest npm run test:depo",
  );
  process.exit(1);
}

// Eski bir kurulumdan kalmis gibi davranan ortam degiskenleri.
process.env.R2_ACCOUNT_ID = "eskihesap0123456789abcdef012345";
process.env.R2_ACCESS_KEY_ID = "eski-erisim-anahtari";
process.env.R2_SECRET_ACCESS_KEY = "eski-gizli-anahtar";
process.env.R2_BUCKET = "eski-kova";

let hataVar = false;
function kontrol(ad: string, ok: boolean, gorulen: string) {
  console.log(`${ok ? "  ✓" : "  ✗"} ${ad.padEnd(52)} ${gorulen}`);
  if (!ok) hataVar = true;
}

async function calistir() {
  console.log(`\nşema: ${sema}\n`);

  console.log("== 1. Veritabanı boşken ortam değişkenine düşüyor (eski kurulum bozulmasın) ==");
  depoOnbellegiBosalt();
  const a1 = await depoAnahtari();
  kontrol("env'deki eski anahtar kullanılıyor", a1?.bucket === "eski-kova", `bucket=${a1?.bucket}`);
  kontrol("aktif depo blob", (await aktifDepoAdi()) === "blob", await aktifDepoAdi());

  console.log("\n== 2. Uygulamadan kaydedilen anahtar env'i EZİYOR ==");
  await depoAnahtariYaz({
    saglayici: "b2",
    endpoint: "https://s3.eu-central-003.backblazeb2.com",
    accessKeyId: "yeni-erisim",
    secretAccessKey: "yeni-gizli",
    bucket: "yeni-kova",
  });
  const a2 = await depoAnahtari();
  kontrol("veritabanındaki yeni anahtar kazandı", a2?.bucket === "yeni-kova", `bucket=${a2?.bucket}`);
  kontrol("sağlayıcı b2 okundu", a2?.saglayici === "b2", String(a2?.saglayici));
  kontrol("adres veritabanından geldi", !!a2?.endpoint.includes("backblazeb2"), String(a2?.endpoint));

  console.log("\n== 3. Anahtar kaydedilmesi TEK BAŞINA depoyu değiştirmiyor ==");
  kontrol("göç bitmeden depo blob", (await aktifDepoAdi()) === "blob", await aktifDepoAdi());
  await aktifDepoYaz("harici");
  kontrol("göç bitince harici", (await aktifDepoAdi()) === "harici", await aktifDepoAdi());

  console.log("\n== 4. Anahtar yoksa harici seçilemiyor (medya adresi sessizce boş dönmesin) ==");
  await prisma.appSecret.deleteMany({ where: { key: { startsWith: "DEPO_" } } });
  depoOnbellegiBosalt();
  kontrol("env yedeğine düştü", (await depoAnahtari())?.bucket === "eski-kova", String((await depoAnahtari())?.bucket));

  await prisma.appSecret.deleteMany({
    where: { OR: [{ key: { startsWith: "DEPO_" } }, { key: "MEDIA_BACKEND" }] },
  });
  await prisma.$disconnect();
  console.log(hataVar ? "\nSONUÇ: HATA VAR\n" : "\nSONUÇ: hepsi geçti\n");
  process.exit(hataVar ? 1 : 0);
}

calistir();
