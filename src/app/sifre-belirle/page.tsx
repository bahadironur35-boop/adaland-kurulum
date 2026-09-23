import { redirect } from "next/navigation";
import { getSessionParent } from "@/lib/auth";
import { SetPasswordForm } from "./SetPasswordForm";
import { getBrandSafe } from "@/lib/brand";
import { BrandProvider } from "@/lib/brand-client";
import { ilgi } from "@/lib/turkce";

export const metadata = { title: "Şifreni belirle" };
export const dynamic = "force-dynamic";

/**
 * Gecici sifreyle girenin ilk durgi. (app) grubunun disinda duruyor ki
 * oradaki yonlendirme ile sonsuz donguye girmesin; Nav de gorunmez, ekran tek isli kalir.
 */
export default async function SifreBelirlePage() {
  const me = await getSessionParent();
  if (!me) redirect("/giris");
  if (!me.mustChangePassword) redirect("/");
  const { childName, siteName } = await getBrandSafe();
  return (
    <BrandProvider value={{ childName: childName ?? "", siteName }}>
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bubble tilt-r p-7 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo.svg" alt="" width={44} height={44} className="rounded-xl" />
            <div>
              <h1 className="text-2xl leading-none font-bold">Hoş geldin {me.name}</h1>
              <p className="text-ink-soft text-sm mt-1">Şimdi kendi şifreni belirle</p>
            </div>
          </div>
          <p className="text-ink-soft text-sm mb-5">
            Şu an geçici bir şifreyle girdin. Onu başkası da biliyor olabilir, o yüzden
            burada yalnızca senin bileceğin bir şifre belirle.
          </p>
          <SetPasswordForm />
        </div>
        <p className="text-center text-ink-faint mt-8 font-hand text-base">
          {childName ? `${ilgi(childName)} anıları burada, iyi saklayalım.` : "Anılar burada, iyi saklayalım."}
        </p>
      </div>
    </main>
    </BrandProvider>
  );
}
