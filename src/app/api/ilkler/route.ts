import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent, HttpError } from "@/lib/auth";
import { milestoneCreate } from "@/lib/schemas";
import { fromDateStr } from "@/lib/dates";
import { listMilestones } from "@/lib/queries";

export async function GET() {
  return handle(async () => {
    await requireParent();
    return { milestones: await listMilestones() };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const me = await requireParent();
    const d = milestoneCreate.parse(await req.json());
    if (d.photoId && !(await prisma.photo.findUnique({ where: { id: d.photoId }, select: { id: true } }))) {
      throw new HttpError(400, "Seçilen fotoğraf bulunamadı.");
    }
    const m = await prisma.milestone.create({
      data: { title: d.title, date: fromDateStr(d.date), note: d.note ?? null, photoId: d.photoId ?? null, addedById: me.id },
    });
    return { id: m.id };
  });
}
