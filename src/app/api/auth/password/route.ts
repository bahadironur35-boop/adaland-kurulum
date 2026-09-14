import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent, verifyPassword, hashPassword, HttpError } from "@/lib/auth";
import { passwordChange } from "@/lib/schemas";

export async function POST(req: Request) {
  return handle(async () => {
    const me = await requireParent();
    const { current, next } = passwordChange.parse(await req.json());
    const parent = await prisma.parent.findUniqueOrThrow({ where: { id: me.id } });
    if (!(await verifyPassword(current, parent.passwordHash))) throw new HttpError(400, "Mevcut şifre yanlış.");
    await prisma.parent.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(next), mustChangePassword: false } });
    return { ok: true };
  });
}
