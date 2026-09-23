import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent } from "@/lib/auth";
import { recordingCreate } from "@/lib/schemas";
import { fromDateStr } from "@/lib/dates";
import { listRecordings } from "@/lib/queries";

export async function GET() {
  return handle(async () => {
    await requireParent();
    return { recordings: await listRecordings() };
  });
}

/** Ses dosyasi istemciden depoya yuklendikten sonra kaydi yazar. */
export async function POST(req: Request) {
  return handle(async () => {
    const me = await requireParent();
    const d = recordingCreate.parse(await req.json());
    const r = await prisma.recording.create({
      data: {
        addedById: me.id,
        title: d.title,
        recordedAt: fromDateStr(d.recordedAt),
        path: d.path,
        mime: d.mime,
        durationSec: d.durationSec ?? null,
        sizeBytes: d.sizeBytes ?? 0,
        note: d.note ?? null,
      },
    });
    return { id: r.id };
  });
}
