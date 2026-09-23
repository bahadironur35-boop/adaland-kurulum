import { listTrash, TRASH_DAYS } from "@/lib/trash";
import { Trash } from "./Trash";

export const metadata = { title: "Çöp kutusu" };
export const dynamic = "force-dynamic";

export default async function CopPage() {
  const items = await listTrash();
  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Çöp kutusu</h1>
      <p className="font-hand text-lg text-ink-soft mb-6">
        Silinenler {TRASH_DAYS} gün burada bekler. Yanlışlıkla sildiysen geri alabilirsin.
      </p>
      <Trash items={items} />
    </div>
  );
}
