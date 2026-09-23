import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParentAllowTemp, hashPassword, HttpError } from "@/lib/auth";
import { passwordSet } from "@/lib/schemas";

/**
 * Gecici sifreyle giren kisi kendi sifresini belirler. Mevcut sifre sorulmaz:
 * kullanici saniyeler once zaten onunla girdi.
 *
 * YALNIZCA mustChangePassword acikken calisir; normal sifre degistirme hep
 * mevcut sifreyi ister (/api/auth/password). Boylece bu uc, o kontrolu atlatmak
 * icin kullanilamaz.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const me = await requireParentAllowTemp();
    if (!me.mustChangePassword) throw new HttpError(400, "Şifren zaten belirlenmiş.");
    const { next } = passwordSet.parse(await req.json());
    await prisma.parent.update({
      where: { id: me.id },
      data: { passwordHash: await hashPassword(next), mustChangePassword: false },
    });
    return { ok: true };
  });
}
