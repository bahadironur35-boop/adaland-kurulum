import { handle, pickSentKeys } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent, HttpError } from "@/lib/auth";
import { softDelete } from "@/lib/trash";
import { letterPatch } from "@/lib/schemas";
import { fromDateStr } from "@/lib/dates";

type Ctx = { params: Promise<{ id: string }> };

/** Sadece yazar duzenler/siler. */
export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const me = await requireParent();
    const { id } = await params;
    const raw = await req.json();
    const d = pickSentKeys(letterPatch.parse(raw), raw);
    const r = await prisma.letter.updateMany({
      where: { id, authorId: me.id },
      data: {
        ...(d.title !== undefined && { title: d.title }),
        ...(d.body !== undefined && { body: d.body }),
        ...(d.openAt !== undefined && { openAt: fromDateStr(d.openAt) }),
      },
    });
    if (r.count === 0) throw new HttpError(404, "Mektup bulunamadı ya da senin değil.");
    return { ok: true };
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const me = await requireParent();
    const { id } = await params;
    // Sadece yazari silebilir; kalici degil, cop kutusuna gider.
    const mine = await prisma.letter.findFirst({ where: { id, authorId: me.id, deletedAt: null }, select: { id: true } });
    if (!mine || !(await softDelete("letter", id))) throw new HttpError(404, "Mektup bulunamadı ya da senin değil.");
    return { ok: true };
  });
}
