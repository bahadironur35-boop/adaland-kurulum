/**
 * oyunBaglantisiGetirYaDaOlustur() gercekten calisiyor mu — bos bir semada.
 *
 * CALISTIRMA: DATABASE_SCHEMA=paylasimtest npx tsx scripts/oyun-baglantisi-kontrol.ts
 * (public semada REDDEDER, gercek veriyi bozmasin diye.)
 */
import { prisma } from "../src/lib/db";
import { oyunBaglantisiGetirYaDaOlustur, OYUN_ODASI_LINK_ETIKETI } from "../src/lib/share";
import { listShareLinks } from "../src/app/api/paylasim/route";

const sema = process.env.DATABASE_SCHEMA;
if (!sema || sema === "public") {
  console.error("Gercek veriyi bozmamak icin ayri sema gerekiyor: DATABASE_SCHEMA=paylasimtest npx tsx scripts/oyun-baglantisi-kontrol.ts");
  process.exit(1);
}

let hataVar = false;
function satir(ad: string, ok: boolean, not = "") {
  console.log(`  ${ok ? "✓" : "✗"} ${ad.padEnd(48)} ${not}`);
  if (!ok) hataVar = true;
}

async function main() {
  console.log(`\nşema: ${sema}\n`);
  await prisma.shareLink.deleteMany({});

  console.log("== 1. İlk çağrı: yoksa oluşturur ==");
  const a = await oyunBaglantisiGetirYaDaOlustur();
  satir("etiket doğru", a.label === OYUN_ODASI_LINK_ETIKETI, a.label);
  satir("süresiz (expiresAt null)", a.expiresAt === null);

  console.log("\n== 2. İkinci çağrı: AYNI linki döndürür, yeni üretmez ==");
  const b = await oyunBaglantisiGetirYaDaOlustur();
  satir("aynı id", a.id === b.id, `${a.id} / ${b.id}`);
  const toplam1 = await prisma.shareLink.count();
  satir("toplam satır hâlâ 1", toplam1 === 1, String(toplam1));

  console.log("\n== 3. İptal edilirse yenisi kendiliğinden oluşur ==");
  await prisma.shareLink.update({ where: { id: a.id }, data: { revokedAt: new Date() } });
  const c = await oyunBaglantisiGetirYaDaOlustur();
  satir("yeni bir link üretildi", c.id !== a.id);
  satir("yenisi de süresiz", c.expiresAt === null);

  console.log("\n== 4. Akraba paylaşım listesinde GÖRÜNMÜYOR ==");
  await prisma.shareLink.create({ data: { token: "test-akraba-token-xxxxxxxxxxxx", label: "Babaanne" } });
  const liste = await listShareLinks();
  satir("listede yalnızca Babaanne var", liste.length === 1 && liste[0].label === "Babaanne", JSON.stringify(liste.map((l) => l.label)));

  await prisma.shareLink.deleteMany({});
  await prisma.$disconnect();
  console.log(hataVar ? "\nSONUÇ: HATA VAR\n" : "\nSONUÇ: hepsi geçti\n");
  process.exit(hataVar ? 1 : 0);
}

main();
