import { getBirthDate } from "@/lib/brand";
import { listRecordings } from "@/lib/queries";
import { Recordings } from "./Recordings";

export const metadata = { title: "Sesler" };
export const dynamic = "force-dynamic";

export default async function SeslerPage() {
  const [birth, recordings] = await Promise.all([getBirthDate(), listRecordings()]);
  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Sesler</h1>
      <Recordings recordings={recordings} birth={birth} />
    </div>
  );
}
