import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent } from "@/lib/auth";
import { settingsPatch } from "@/lib/schemas";
import { fromDateStr } from "@/lib/dates";

export async function PATCH(req: Request) {
  return handle(async () => {
    await requireParent();
    const d = settingsPatch.parse(await req.json());
    if (d.birthDate) {
      await prisma.settings.upsert({
        where: { id: 1 },
        update: { birthDate: fromDateStr(d.birthDate) },
        create: { id: 1, birthDate: fromDateStr(d.birthDate) },
      });
    }
    if (d.yearbookAge !== undefined) {
      await prisma.settings.updateMany({ where: { id: 1 }, data: { lastYearbookAge: d.yearbookAge } });
    }
    if (d.childName !== undefined || d.siteName !== undefined) {
      await prisma.settings.updateMany({ where: { id: 1 }, data: { childName: d.childName, siteName: d.siteName } });
    }
    return { ok: true };
  });
}
