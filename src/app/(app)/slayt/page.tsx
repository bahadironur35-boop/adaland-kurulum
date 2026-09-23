import { requireBrand } from "@/lib/brand";
import { listPhotos, listSayings } from "@/lib/queries";
import { slaytDizisiOlustur } from "@/lib/slayt";
import { EmptyState } from "@/components/EmptyState";
import { Slaytgosterisi } from "@/components/Slaytgosterisi";

export const metadata = { title: "Slayt" };
export const dynamic = "force-dynamic";

export default async function SlaytPage() {
  const [brand, photos, sayings] = await Promise.all([requireBrand(), listPhotos(), listSayings()]);
  const kareler = slaytDizisiOlustur(photos, sayings);

  if (kareler.length === 0) {
    return (
      <EmptyState
        title="Henüz gösterecek bir şey yok"
        hint="Birkaç fotoğraf ya da söz eklenince, burada güzel bir gösteri oluşur."
      />
    );
  }

  return <Slaytgosterisi kareler={kareler} birth={brand.birthDate} siteName={brand.siteName} childName={brand.childName} />;
}
