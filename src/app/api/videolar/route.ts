import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent } from "@/lib/auth";
import { videoCreate } from "@/lib/schemas";
import { fromDateStr } from "@/lib/dates";
import { listVideos } from "@/lib/queries";

export async function GET() {
  return handle(async () => {
    await requireParent();
    return { videos: await listVideos() };
  });
}

/** Istemci Blob'a yukledikten sonra meta veriyi buraya yazar. */
export async function POST(req: Request) {
  return handle(async () => {
    const me = await requireParent();
    const d = videoCreate.parse(await req.json());
    const v = await prisma.video.create({
      data: {
        addedById: me.id,
        path: d.path,
        posterPath: d.posterPath ?? null,
        takenAt: fromDateStr(d.takenAt),
        caption: d.caption ?? null,
        durationSec: d.durationSec ?? null,
        sizeBytes: d.sizeBytes,
        mime: d.mime,
      },
    });
    return { id: v.id };
  });
}
