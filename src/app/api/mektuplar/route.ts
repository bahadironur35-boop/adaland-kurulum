import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent } from "@/lib/auth";
import { letterCreate } from "@/lib/schemas";
import { fromDateStr } from "@/lib/dates";
import { listLetters } from "@/lib/queries";

export async function GET() {
  return handle(async () => {
    const me = await requireParent();
    return { letters: await listLetters(me.id) };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const me = await requireParent();
    const d = letterCreate.parse(await req.json());
    const l = await prisma.letter.create({ data: { authorId: me.id, title: d.title, body: d.body, openAt: fromDateStr(d.openAt) } });
    return { id: l.id };
  });
}
