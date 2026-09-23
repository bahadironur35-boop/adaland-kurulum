import { handle, pickSentKeys } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent, HttpError } from "@/lib/auth";
import { softDelete } from "@/lib/trash";
import { recordingPatch } from "@/lib/schemas";
import { fromDateStr } from "@/lib/dates";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireParent();
    const { id } = await params;
    const raw = await req.json();
    const d = pickSentKeys(recordingPatch.parse(raw), raw);
    const r = await prisma.recording.updateMany({
      where: { id },
      data: {
        ...(d.title !== undefined && { title: d.title }),
        ...(d.recordedAt !== undefined && { recordedAt: fromDateStr(d.recordedAt) }),
        ...(d.note !== undefined && { note: d.note }),
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
    if (!(await softDelete("recording", id))) throw new HttpError(404, "Kayıt bulunamadı.");
    return { ok: true };
  });
}
