import { redirect } from "next/navigation";
import { kurulumGerekli } from "@/lib/kurulum";
import { KurulumSihirbazi } from "./KurulumSihirbazi";

export const metadata = { title: "Kurulum" };
export const dynamic = "force-dynamic";

/**
 * Ilk calistirma. (app) grubunun DISINDA: Nav gorunmez, yonlendirme dongusu olmaz
 * (/sifre-belirle ile ayni gerekce). Hesap varsa kapali.
 */
export default async function KurulumPage() {
  if (!(await kurulumGerekli())) redirect("/giris");
  return (
    <main className="min-h-dvh flex items-start sm:items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg">
        <KurulumSihirbazi />
      </div>
    </main>
  );
}
