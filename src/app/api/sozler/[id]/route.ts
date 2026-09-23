import { handle, pickSentKeys } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent, HttpError } from "@/lib/auth";
import { softDelete } from "@/lib/trash";
import { sayingPatch } from "@/lib/schemas";
import { fromDateStr } from "@/lib/dates";
import { deleteMedia } from "@/lib/media";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireParent();
    const { id } = await params;
    const raw = await req.json();
    const d = pickSentKeys(sayingPatch.parse(raw), raw);
    const existing = await prisma.saying.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Söz bulunamadı.");

    // Ses degistiyse eskisini blob'dan sil
    if ("audioPath" in d && existing.audioPath && existing.audioPath !== d.audioPath) {
      await deleteMedia([existing.audioPath]);
    }
    await prisma.saying.update({
      where: { id },
      data: {
        ...(d.text !== undefined && { text: d.text }),
        ...(d.saidAt !== undefined && { saidAt: fromDateStr(d.saidAt) }),
        ...(d.context !== undefined && { context: d.context }),
        ...(d.isFavorite !== undefined && { isFavorite: d.isFavorite }),
        ...(d.audioPath !== undefined && { audioPath: d.audioPath }),
        ...(d.audioMime !== undefined && { audioMime: d.audioMime }),
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
    if (!(await softDelete("saying", id))) throw new HttpError(404, "Söz bulunamadı.");
    return { ok: true };
  });
}
