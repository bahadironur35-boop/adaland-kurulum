import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent } from "@/lib/auth";
import { measurementCreate } from "@/lib/schemas";
import { fromDateStr } from "@/lib/dates";
import { listMeasurements } from "@/lib/queries";

export async function GET() {
  return handle(async () => {
    await requireParent();
    return { measurements: await listMeasurements() };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireParent();
    const d = measurementCreate.parse(await req.json());
    const m = await prisma.measurement.create({
      data: { date: fromDateStr(d.date), heightCm: d.heightCm ?? null, weightKg: d.weightKg ?? null, note: d.note ?? null },
    });
    return { id: m.id };
  });
}
