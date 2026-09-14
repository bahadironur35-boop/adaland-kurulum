/**
 * Public ayna repo: Deploy Button yalnizca PUBLIC bir repoyu klonlayabiliyor,
 * asil repo ise private. Bu betik calisma agacinin anlik goruntusunu ayna repoya
 * TEK COMMIT olarak zorla iter.
 *
 *   npm run ayna
 *
 * Neden gecmis tasinmiyor: asil reponun commit gecmisi Onur'un e-postasini ve
 * kisisel notlarini tasiyor; ayna sadece "su anki kod" olmali.
 * Gecmis olmadigi icin gecmiste bir sir kalmis olma riski de kokten kapanir.
 *
 * Ayna repo `.git` disinda hicbir sey saklamaz; her calistirmada silinip yeniden yazilir.
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const KAYNAK = resolve(import.meta.dirname, "..");
const AYNA_DIR = join(KAYNAK, ".ayna");
const REPO = process.env.AYNA_REPO ?? "bahadironur35-boop/adaland-kurulum";
/**
 * Deploy Button'in kurulum sirasinda ailenin hesabinda olusturacagi depolar
 * (vercel.com/docs/deploy-button/source > `stores`):
 * - Neon Postgres (Marketplace entegrasyonu) -> DATABASE_URL ailenin hesabina enjekte edilir
 * Boylece aile hicbir ortam degiskeni girmez.
 *
 * Vercel Blob BILEREK YOK: fotograf/video deposu hicbir zaman Vercel'de olmuyor,
 * aile kurulum sihirbazinin zorunlu adiminda Backblaze/Cloudflare bagliyor
 * (10 GB ucretsiz). Blob store acilmayinca aile panelde kullanilmayan bir kaynak
 * gormuyor. (bkz. src/app/kurulum/KurulumSihirbazi.tsx, src/lib/storage/ayar.ts)
 */
const STORES = [
  { type: "integration", integrationSlug: "neon", productSlug: "neon", protocol: "storage" },
];

/** Ayna repoya GIRMEYECEK olanlar. */
const ATLA = new Set([
  ".git", ".ayna", ".next", "node_modules", ".vercel", ".tmp",
  ".env", ".env.local", ".env.development.local", ".env.production.local",
  "DEVIR.md", "SUNUM.md",
  // Ayna kendi README'sini alir; asil README gelistirici belgesi olarak yeniden adlandirilir.
  "README.md", "AYNA-README.md",
  // Ajan yonergeleri ve derleme artigi: aileye gidecek repoda isi yok.
  "CLAUDE.md", "AGENTS.md", "tsconfig.tsbuildinfo",
  // .env.demo: demo kurulumunun anahtarlari, asla aynaya gitmez.
  ".env.demo",
]);

function git(args: string[], cwd = AYNA_DIR): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function main() {
  // 1) Kaynakta commitlenmemis degisiklik varsa dur: ayna yaniltici olmasin.
  const durum = execFileSync("git", ["status", "--porcelain"], { cwd: KAYNAK, encoding: "utf8" }).trim();
  if (durum) {
    console.error("Çalışma ağacı temiz değil. Önce commit et:\n" + durum);
    process.exit(1);
  }

  // 2) Ayna calisma alanini SIFIRDAN kur. .git dahil her sey silinir: ayna her zaman
  // TEK commit olmali, yoksa force-push'lar ust uste birikip gecmis olustururdu.
  rmSync(AYNA_DIR, { recursive: true, force: true });
  mkdirSync(AYNA_DIR);
  git(["init", "-q", "-b", "main"]);
  git(["remote", "add", "origin", `https://github.com/${REPO}.git`]);

  // 3) Dosyalari kopyala
  for (const ad of readdirSync(KAYNAK)) {
    if (ATLA.has(ad)) continue;
    cpSync(join(KAYNAK, ad), join(AYNA_DIR, ad), { recursive: true });
  }
  // Gelistirici README'si adini degistirerek gelir; kok README aile-yuzlu olan.
  cpSync(join(KAYNAK, "README.md"), join(AYNA_DIR, "README-GELISTIRME.md"));
  const kurUrl = `https://vercel.com/new/clone?${new URLSearchParams({
    "repository-url": `https://github.com/${REPO}`,
    "project-name": "cocugumun-sayfasi",
    "repository-name": "cocugumun-sayfasi",
    stores: JSON.stringify(STORES),
  })}`;
  const ayna = execFileSync("node", ["-e", `process.stdout.write(require("fs").readFileSync(${JSON.stringify(join(KAYNAK, "AYNA-README.md"))},"utf8"))`], { encoding: "utf8" })
    .replace("<!-- KUR-DUGMESI -->", `[![Vercel ile kur](https://vercel.com/button)](${kurUrl})`);
  writeFileSync(join(AYNA_DIR, "README.md"), ayna);

  // 4) Guvenlik agi: kopyalanan agacta gercek bir sir degeri var mi?
  const sirKalibi = /(postgres(ql)?:\/\/[^\s"']{20,}|vercel_blob_rw_[A-Za-z0-9_]{20,}|BEGIN [A-Z ]*PRIVATE KEY)/;
  const tara = (dizin: string) => {
    for (const ad of readdirSync(dizin, { withFileTypes: true })) {
      if (ad.name === ".git" || ad.name === "node_modules") continue;
      const yol = join(dizin, ad.name);
      if (ad.isDirectory()) { tara(yol); continue; }
      if (!/\.(ts|tsx|js|jsx|json|md|css|sql|toml|ya?ml)$/.test(ad.name)) continue;
      const icerik = execFileSync("node", ["-e", `process.stdout.write(require("fs").readFileSync(${JSON.stringify(yol)},"utf8"))`], { encoding: "utf8" });
      if (sirKalibi.test(icerik)) { console.error("SIR ŞÜPHESİ, iptal:", yol); process.exit(1); }
    }
  };
  tara(AYNA_DIR);

  writeFileSync(join(AYNA_DIR, ".gitignore"), "node_modules\n.next\n.env*\n.vercel\n.tmp\n");

  // 5) Tek commit olarak zorla it
  git(["add", "-A"]);
  const kaynakSha = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: KAYNAK, encoding: "utf8" }).trim();
  git(["-c", "user.email=bahadironur35@gmail.com", "-c", "user.name=Onur Bahadır",
    "commit", "-q", "--allow-empty", "-m", `Anlık görüntü (${kaynakSha})`]);
  git(["push", "-q", "--force", "origin", "main"]);
  console.log(`Ayna güncellendi: https://github.com/${REPO} (kaynak ${kaynakSha})`);
}

main();
