import { requireBrand } from "@/lib/brand";
import { yonelme } from "@/lib/turkce";
import { getSessionParent } from "@/lib/auth";
import { listLetters } from "@/lib/queries";
import { Letters } from "./Letters";

export async function generateMetadata() {
  const b = await requireBrand().catch(() => null);
  return { title: b ? `${yonelme(b.childName)} mektuplar` : "Mektuplar" };
}
export const dynamic = "force-dynamic";

export default async function MektuplarPage() {
  const me = await getSessionParent();
  const brand = await requireBrand();
  const birth = brand.birthDate;
  const letters = await listLetters(me?.id ?? "");
  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">{yonelme(brand.childName)} mektuplar</h1>
      <Letters letters={letters} birth={birth} />
    </div>
  );
}
