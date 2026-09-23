import { z } from "zod";
import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent, hashPassword, HttpError } from "@/lib/auth";
import { tempPassword } from "@/lib/password";

const body = z.object({ parentId: z.string().min(1).max(60) });

/**
 * Aile ici sifre kurtarma: giris yapabilen bir uye, sifresini unutan uyeye
 * gecici sifre uretir. Sifre YALNIZCA bu cevapta bir kez doner, saklanmaz.
 *
 * Neden e-posta linki degil: Adaland'da posta altyapisi yok ve uc kisilik bir
 * ailede en hizli yol zaten yan odadaki kisiye sesli soylemek. Herkes zaten tam
 * yetkili oldugu icin bu yeni bir yetki acmiyor.
 */
export async function POST(req: Request) {
  return handle(async () => {
    await requireParent();
    const { parentId } = body.parse(await req.json());
    const hedef = await prisma.parent.findUnique({ where: { id: parentId }, select: { id: true, name: true } });
    if (!hedef) throw new HttpError(404, "Bu hesap bulunamadı.");

    const pw = tempPassword();
    await prisma.parent.update({
      where: { id: hedef.id },
      // sessionsValidFrom: acik kalan eski oturumlari da kapatir.
      data: { passwordHash: await hashPassword(pw), sessionsValidFrom: new Date(), mustChangePassword: true },
    });
    return { name: hedef.name, password: pw };
  });
}
