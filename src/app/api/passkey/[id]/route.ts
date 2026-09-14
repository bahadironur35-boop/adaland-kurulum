import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent, HttpError } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

/** Sadece kendi passkey'ini silebilir. */
export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const me = await requireParent();
    const { id } = await params;
    const r = await prisma.passkey.deleteMany({ where: { id, parentId: me.id } });
    if (r.count === 0) throw new HttpError(404, "Bulunamadı.");
    return { ok: true };
  });
}
