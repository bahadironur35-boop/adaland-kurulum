import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent, HttpError } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

/** Iptal: link aninda calismaz olur. Geri alinamaz; yeni link uretilir. */
export async function PATCH(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireParent();
    const { id } = await params;
    const r = await prisma.shareLink.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
    if (r.count === 0) throw new HttpError(404, "Link bulunamadı ya da zaten iptal edilmiş.");
    return { ok: true };
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireParent();
    const { id } = await params;
    const r = await prisma.shareLink.deleteMany({ where: { id } });
    if (r.count === 0) throw new HttpError(404, "Link bulunamadı.");
    return { ok: true };
  });
}
