import { handle, pickSentKeys } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent, HttpError } from "@/lib/auth";
import { softDelete } from "@/lib/trash";
import { milestonePatch } from "@/lib/schemas";
import { fromDateStr } from "@/lib/dates";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireParent();
    const { id } = await params;
    const raw = await req.json();
    const d = pickSentKeys(milestonePatch.parse(raw), raw);
    if (d.photoId && !(await prisma.photo.findUnique({ where: { id: d.photoId }, select: { id: true } }))) {
      throw new HttpError(400, "Seçilen fotoğraf bulunamadı.");
    }
    const r = await prisma.milestone.updateMany({
      where: { id },
      data: {
        ...(d.title !== undefined && { title: d.title }),
        ...(d.date !== undefined && { date: fromDateStr(d.date) }),
        ...(d.note !== undefined && { note: d.note }),
        ...(d.photoId !== undefined && { photoId: d.photoId }),
      },
    });
    if (r.count === 0) throw new HttpError(404, "Kayıt bulunamadı.");
    return { ok: true };
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireParent();
    const { id } = await params;
    // Kalici silmez: cop kutusuna tasir, 30 gun sonra cron temizler.
    if (!(await softDelete("milestone", id))) throw new HttpError(404, "Kayıt bulunamadı.");
    return { ok: true };
  });
}
