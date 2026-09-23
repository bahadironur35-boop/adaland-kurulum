import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword, HttpError } from "@/lib/auth";
import { loginSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  return handle(async () => {
    const { email, password } = loginSchema.parse(await req.json());
    const parent = await prisma.parent.findUnique({ where: { email } });
    // Ayni mesaj: e-posta var mi yok mu disari sizmasin.
    if (!parent || !(await verifyPassword(password, parent.passwordHash))) {
      throw new HttpError(401, "E-posta ya da şifre yanlış.");
    }
    await prisma.parent.update({ where: { id: parent.id }, data: { lastLoginAt: new Date() } });
    await createSession({ id: parent.id, email: parent.email, name: parent.name });
    return { ok: true, name: parent.name };
  });
}
