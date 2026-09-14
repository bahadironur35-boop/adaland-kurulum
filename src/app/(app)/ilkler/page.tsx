import { getBirthDate } from "@/lib/brand";
import { listMilestones } from "@/lib/queries";
import { MilestoneTimeline } from "@/components/MilestoneTimeline";

export const metadata = { title: "İlkler" };
export const dynamic = "force-dynamic";

export default async function IlklerPage() {
  const [birth, milestones] = await Promise.all([getBirthDate(), listMilestones()]);
  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">İlkler</h1>
      <MilestoneTimeline milestones={milestones} birth={birth} />
    </div>
  );
}
