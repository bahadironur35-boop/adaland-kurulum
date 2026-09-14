import { handle, pickSentKeys } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent, HttpError } from "@/lib/auth";
import { softDelete } from "@/lib/trash";
import { measurementPatch } from "@/lib/schemas";
import { fromDateStr } from "@/lib/dates";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireParent();
    const { id } = await params;
    const raw = await req.json();
    const d = pickSentKeys(measurementPatch.parse(raw), raw);
    const existing = await prisma.measurement.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Ölçüm bulunamadı.");
    const height = d.heightCm !== undefined ? d.heightCm : existing.heightCm == null ? null : Number(existing.heightCm);
    const weight = d.weightKg !== undefined ? d.weightKg : existing.weightKg == null ? null : Number(existing.weightKg);
    if (height == null && weight == null) throw new HttpError(400, "Boy ya da kilo gir.");
    await prisma.measurement.update({
      where: { id },
      data: {
        ...(d.date !== undefined && { date: fromDateStr(d.date) }),
        ...(d.heightCm !== undefined && { heightCm: d.heightCm }),
        ...(d.weightKg !== undefined && { weightKg: d.weightKg }),
        ...(d.note !== undefined && { note: d.note }),
      },
    });
    return { ok: true };
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireParent();
    const { id } = await params;
    // Kalici silmez: cop kutusuna tasir, 30 gun sonra cron temizler.
    if (!(await softDelete("measurement", id))) throw new HttpError(404, "Ölçüm bulunamadı.");
    return { ok: true };
  });
}
