import { after } from "next/server";
import { redirect } from "next/navigation";
import { getSessionParent } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { QuickAdd } from "@/components/QuickAdd";
import { AutoRefresh } from "@/components/AutoRefresh";
import { getBrand } from "@/lib/brand";
import { BrandProvider } from "@/lib/brand-client";
import { tembelBakim } from "@/lib/bakim";
import { DEMO } from "@/lib/demo";
import { DemoBanner } from "@/components/DemoBanner";

// Kapi burada: oturum yoksa hicbir (app) sayfasi render edilmez.
// API uclari ayrica requireParent() ile kendi kapisini tutar.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Kurulum sihirbazi calismadiysa (cocuk adi yok) hicbir sayfa acilmaz.
  const brand = await getBrand();
  if (!brand) redirect("/kurulum");
  const parent = await getSessionParent();
  if (!parent) redirect("/giris");
  // Gecici sifreyle gelen once kendi sifresini belirlesin, icerigi gormeden.
  if (parent.mustChangePassword) redirect("/sifre-belirle");
  // Cron bozulsa bile cop birikmesin; gunde bir kez, yanit gonderildikten sonra.
  after(tembelBakim);
  return (
    <BrandProvider value={{ childName: brand.childName, siteName: brand.siteName }}>
      <div className="min-h-dvh pb-28 md:pb-10">
        {DEMO && <DemoBanner />}
        <Nav name={parent.name} />
        <main className="mx-auto w-full max-w-3xl px-4 pt-4 md:pt-8">{children}</main>
        <QuickAdd />
        <AutoRefresh />
      </div>
    </BrandProvider>
  );
}
