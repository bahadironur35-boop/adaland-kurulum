import { getBirthDate } from "@/lib/brand";
import { listMeasurements } from "@/lib/queries";
import { Growth } from "@/components/Growth";

export const metadata = { title: "Büyüme" };
export const dynamic = "force-dynamic";

export default async function BuyumePage() {
  const [birth, measurements] = await Promise.all([getBirthDate(), listMeasurements()]);
  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Büyüme</h1>
      <Growth measurements={measurements} birth={birth} />
    </div>
  );
}
