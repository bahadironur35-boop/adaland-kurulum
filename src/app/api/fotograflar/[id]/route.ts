import { handle, pickSentKeys } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent, HttpError } from "@/lib/auth";
import { softDelete } from "@/lib/trash";
import { photoPatch } from "@/lib/schemas";
import { fromDateStr } from "@/lib/dates";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireParent();
    const { id } = await params;
    const raw = await req.json();
    const d = pickSentKeys(photoPatch.parse(raw), raw);
    const r = await prisma.photo.updateMany({
      where: { id },
      data: {
        ...(d.takenAt !== undefined && { takenAt: fromDateStr(d.takenAt) }),
        ...(d.caption !== undefined && { caption: d.caption }),
        ...(d.isFavorite !== undefined && { isFavorite: d.isFavorite }),
      },
    });
    if (r.count === 0) throw new HttpError(404, "Fotoğraf bulunamadı.");
    return { ok: true };
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireParent();
    const { id } = await params;
    // Kalici silmez: cop kutusuna tasir, 30 gun sonra cron temizler.
    if (!(await softDelete("photo", id))) throw new HttpError(404, "Fotoğraf bulunamadı.");
    return { ok: true };
  });
}
