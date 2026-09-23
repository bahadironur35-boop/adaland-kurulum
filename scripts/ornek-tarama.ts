/**
 * Aileye ve fotografciya giden PUBLIC sayfalardaki ornek sozler, gercek icerikle
 * kelime koku paylasmamali. Kural: o sayfalarda cocugun adi, dogum tarihi ya da
 * gercek bir soz ASLA gecmeyecek.
 *
 *   npm run tara:ornek
 *
 * Duz esitlik kontrolu yetmez: Turkce ekler yuzunden "dondurma" ile "dondurmami"
 * esit degildir ama ayni seyi anlatir. Bu yuzden ilk 5 harf kok sayilir.
 * (Gercek bir yakalama: aile sayfasinda "ilk dondurma" yaziyordu, veritabaninda da
 * "dondurmami" gecen bir soz vardi; duz karsilastirma bunu goremedi.)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { existsSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const SAYFALAR: [string, string][] = [
  ["AİLE", "C:/projeler/cocugun-sozleri/index.html"],
  ["TEKLİF", "C:/projeler/adaland-teklif/index.html"],
];

const norm = (s: string) =>
  s.replace(/I/g, "ı").replace(/İ/g, "i").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const kok = (w: string) => w.slice(0, 5);

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const [sozler, fotolar, ilkler, sesler, ayar] = await Promise.all([
    prisma.saying.findMany({ select: { text: true } }),
    prisma.photo.findMany({ select: { caption: true } }),
    prisma.milestone.findMany({ select: { title: true, note: true } }),
    prisma.recording.findMany({ select: { title: true } }),
    prisma.settings.findUnique({ where: { id: 1 }, select: { childName: true, birthDate: true } }),
  ]);

  const kokler = new Set<string>();
  const gercek = [
    ...sozler.map((s) => s.text),
    ...fotolar.map((f) => f.caption ?? ""),
    ...ilkler.flatMap((m) => [m.title, m.note ?? ""]),
    ...sesler.map((r) => r.title),
  ].filter(Boolean);
  for (const t of gercek) for (const w of norm(t).split(" ")) if (w.length > 4) kokler.add(kok(w));

  let sorun = 0;
  for (const [ad, yol] of SAYFALAR) {
    if (!existsSync(yol)) { console.log(`--- ${ad} --- dosya yok, atlandı: ${yol}`); continue; }
    const html = readFileSync(yol, "utf8");

    const adVar = ayar?.childName ? new RegExp(`\\b${ayar.childName}\\b`, "i").test(html) : false;
    const dogum = ayar ? ayar.birthDate.toISOString().slice(0, 10) : "";
    const dogumVar = !!dogum && html.includes(dogum);
    if (adVar || dogumVar) sorun++;
    console.log(`--- ${ad} --- çocuğun adı: ${adVar ? "VAR!" : "yok"} | doğum tarihi: ${dogumVar ? "VAR!" : "yok"}`);

    // Kullaniciya gorunen ornek metinler
    const gorunen = [
      ...[...html.matchAll(/class="said">“([^”]+)”/g)].map((m) => m[1]),
      ...[...html.matchAll(/<q>([^<]+)<\/q>/g)].map((m) => m[1]),
      ...[...html.matchAll(/class="cap">([^<]+)</g)].map((m) => m[1]),
      ...[...html.matchAll(/class="when">([^<]+)</g)].map((m) => m[1]),
      // Baglam satiri: gercek kartta context alanina karsilik geliyor, o da taranmali
      ...[...html.matchAll(/class="baglam">([^<]+)</g)].map((m) => m[1]),
    ];
    for (const g of gorunen) {
      const carpisan = norm(g).split(" ").filter((w) => w.length > 4 && kokler.has(kok(w)));
      if (carpisan.length) sorun++;
      console.log(`  ${carpisan.length ? `[ÇAKIŞMA: ${carpisan.join(", ")}]` : "[temiz]"} ${g}`);
    }
  }

  console.log(sorun === 0 ? "\nTEMİZ: örneklerin hiçbiri gerçek içerikle kesişmiyor." : `\n${sorun} SORUN VAR.`);
  await prisma.$disconnect();
  process.exit(sorun === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
