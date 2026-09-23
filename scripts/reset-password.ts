/**
 * SON CARE: herkes disarida kaldiysa, sifreyi dogrudan veritabaninda sifirlar.
 * Normalde buna gerek yok - aile uyelerinden biri Ayarlar > Aile hesaplari'ndan
 * digerine gecici sifre verebilir.
 *
 *   npm run sifre:sifirla -- e-posta-adresin
 *
 * Ayrica o hesabin acik tum oturumlarini kapatir (kayip telefon durumu).
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { tempPassword } from "../src/lib/password";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Kullanım: npm run sifre:sifirla -- <e-posta>");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL yok. `npx vercel env pull .env.local` çalıştır.");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const parent = await prisma.parent.findUnique({ where: { email } });
  if (!parent) {
    const hepsi = await prisma.parent.findMany({ select: { email: true } });
    throw new Error(`${email} bulunamadı. Kayıtlı hesaplar: ${hepsi.map((p) => p.email).join(", ")}`);
  }

  const pw = tempPassword();
  await prisma.parent.update({
    where: { id: parent.id },
    data: { passwordHash: await bcrypt.hash(pw, 12), sessionsValidFrom: new Date(), mustChangePassword: true },
  });
  console.log(`\n${parent.name} <${parent.email}> için geçici şifre:\n\n    ${pw}\n`);
  console.log("Bu hesabın açık tüm oturumları kapatıldı. Girdikten sonra Ayarlar'dan kendi şifreni belirle.\n");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("\n" + (e instanceof Error ? e.message : String(e)) + "\n");
  process.exit(1);
});
