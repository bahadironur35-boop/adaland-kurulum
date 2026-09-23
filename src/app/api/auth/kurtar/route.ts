import { z } from "zod";
import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, HttpError } from "@/lib/auth";
import { tempPassword, normalizeCode } from "@/lib/password";

/**
 * Kurtarma koduyla sifre sifirlama: tek hesapli ailenin kilidini acan tek yol.
 * Kod kurulumda BIR KEZ gosterilir, burada bcrypt'e karsi dogrulanir ve
 * kullanildiginda SILINIR (tek seferlik). Oturum gerektirmez: zaten disarida kalan kisi cagiriyor.
 * Sonuc: gecici sifre + mustChangePassword, acik oturumlar kapanir.
 */
const body = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().min(6).max(40),
});

export async function POST(req: Request) {
  return handle(async () => {
    const { email, code } = body.parse(await req.json());
    const [parent, row] = await Promise.all([
      prisma.parent.findUnique({ where: { email }, select: { id: true, name: true } }),
      prisma.appSecret.findUnique({ where: { key: "KURTARMA_KODU" } }),
    ]);
    // Ayni mesaj: hangisinin yanlis oldugu disari sizmasin.
    const normalized = normalizeCode(code);
    if (!parent || !row || !(await verifyPassword(normalized, row.value))) {
      throw new HttpError(401, "E-posta ya da kurtarma kodu yanlış.");
    }
    const pw = tempPassword();
    await prisma.$transaction([
      prisma.parent.update({ where: { id: parent.id }, data: { passwordHash: await hashPassword(pw), sessionsValidFrom: new Date(), mustChangePassword: true } }),
      prisma.appSecret.delete({ where: { key: "KURTARMA_KODU" } }),
    ]);
    return { name: parent.name, password: pw };
  });
}
