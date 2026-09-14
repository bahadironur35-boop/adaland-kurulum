import { handle, pickSentKeys } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent, HttpError } from "@/lib/auth";
import { softDelete } from "@/lib/trash";
import { videoPatch } from "@/lib/schemas";
import { fromDateStr } from "@/lib/dates";
import { deleteMedia } from "@/lib/media";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireParent();
    const { id } = await params;
    const raw = await req.json();
    const d = pickSentKeys(videoPatch.parse(raw), raw);
    const existing = await prisma.video.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Video bulunamadı.");

    await prisma.video.update({
      where: { id },
      data: {
        ...(d.takenAt !== undefined && { takenAt: fromDateStr(d.takenAt) }),
        ...(d.caption !== undefined && { caption: d.caption }),
        ...(d.posterPath !== undefined && { posterPath: d.posterPath }),
      },
    });

    // Kapak degistiyse eskisi depoda yer kaplamasin
    if (d.posterPath !== undefined && existing.posterPath && existing.posterPath !== d.posterPath) {
      await deleteMedia([existing.posterPath]);
    }
    return { ok: true };
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireParent();
    const { id } = await params;
    // Kalici silmez: cop kutusuna tasir, 30 gun sonra cron temizler.
    if (!(await softDelete("video", id))) throw new HttpError(404, "Video bulunamadı.");
    return { ok: true };
  });
}
