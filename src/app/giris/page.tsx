import { redirect } from "next/navigation";
import { getSessionParent } from "@/lib/auth";
import { LoginForm } from "./LoginForm";
import { PasskeyLogin } from "@/components/PasskeyLogin";
import { ForgotPassword } from "@/components/ForgotPassword";
import { getBrandSafe } from "@/lib/brand";
import { BrandProvider } from "@/lib/brand-client";
import { ilgi } from "@/lib/turkce";
import { kurulumGerekli } from "@/lib/kurulum";

export const metadata = { title: "Giriş" };

export default async function GirisPage() {
  if (await kurulumGerekli()) redirect("/kurulum");
  if (await getSessionParent()) redirect("/");
  const { childName, siteName } = await getBrandSafe();
  return (
    <BrandProvider value={{ childName: childName ?? "", siteName }}>
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bubble tilt-l p-7 sm:p-8">
          <div className="flex items-center gap-3 mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo.svg" alt="" width={44} height={44} className="rounded-xl" />
            <div>
              <h1 className="text-3xl leading-none font-bold">{siteName}</h1>
              <p className="text-ink-soft text-sm mt-1">{childName ? `${ilgi(childName)} sözleri ve anıları` : "Sözler ve anılar"}</p>
            </div>
          </div>
          <LoginForm />
          <PasskeyLogin />
          <ForgotPassword />
        </div>
        <p className="text-center text-ink-faint text-xs mt-8 font-hand text-base">
          Burası sadece aile için. Akrabalara link Ayarlar&apos;dan verilir.
        </p>
      </div>
    </main>
    </BrandProvider>
  );
}
