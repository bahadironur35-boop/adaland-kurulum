import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent } from "@/lib/auth";
import { sayingCreate } from "@/lib/schemas";
import { fromDateStr } from "@/lib/dates";
import { listSayings } from "@/lib/queries";

export async function GET() {
  return handle(async () => {
    await requireParent();
    return { sayings: await listSayings() };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const me = await requireParent();
    const d = sayingCreate.parse(await req.json());
    const s = await prisma.saying.create({
      data: {
        addedById: me.id,
        text: d.text,
        saidAt: fromDateStr(d.saidAt),
        context: d.context ?? null,
        isFavorite: d.isFavorite ?? false,
        audioPath: d.audioPath ?? null,
        audioMime: d.audioMime ?? null,
      },
    });
    return { id: s.id };
  });
}
