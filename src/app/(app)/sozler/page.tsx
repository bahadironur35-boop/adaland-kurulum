import { getBirthDate } from "@/lib/brand";
import { listSayings } from "@/lib/queries";
import { SayingList } from "@/components/SayingList";

export const metadata = { title: "Sözler" };
export const dynamic = "force-dynamic";

export default async function SozlerPage() {
  const [birth, sayings] = await Promise.all([getBirthDate(), listSayings()]);
  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <h1 className="text-3xl font-bold">Sözler</h1>
        <span className="font-hand text-lg text-ink-soft">{sayings.length} söz</span>
      </div>
      <SayingList sayings={sayings} birth={birth} />
    </div>
  );
}
