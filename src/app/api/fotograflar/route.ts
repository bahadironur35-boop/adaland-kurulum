import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent } from "@/lib/auth";
import { photoCreate } from "@/lib/schemas";
import { fromDateStr } from "@/lib/dates";
import { listPhotos } from "@/lib/queries";

export async function GET() {
  return handle(async () => {
    await requireParent();
    return { photos: await listPhotos() };
  });
}

/** Istemci Blob'a yukledikten sonra meta veriyi buraya yazar. */
export async function POST(req: Request) {
  return handle(async () => {
    const me = await requireParent();
    const d = photoCreate.parse(await req.json());
    const p = await prisma.photo.create({
      data: {
        addedById: me.id,
        path: d.path,
        thumbPath: d.thumbPath ?? null,
        takenAt: fromDateStr(d.takenAt),
        caption: d.caption ?? null,
        width: d.width,
        height: d.height,
        sizeBytes: d.sizeBytes,
        mime: d.mime,
      },
    });
    return { id: p.id };
  });
}
