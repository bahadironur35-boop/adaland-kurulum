import { notFound } from "next/navigation";
import { DEMO } from "@/lib/demo";

export const metadata = { title: "Demo" };

/**
 * Adsiz gelen ziyaretciye once cocugun adini soran ekran.
 *
 * NEDEN VAR: karekodu okutan ya da adresi dogrudan acan kisi, ad tasimadigi
 * icin uydurma ailenin adiyla ("Zeynep") karsilasiyordu — demonun en iyi yani
 * olan kisisellestirme tam da orada kayboluyordu.
 *
 * IKI ALAN: cocugun adi ve sayfanin adi ayri ayri soruluyor — kurulum
 * sihirbazindaki gibi. Tek kutu varken "Adaland" yazan kisi "Adaland'in
 * Dunyasi" ve "Bugun Adaland" ile karsilasiyordu.
 *
 * Istemci betigi YOK: duz bir GET formu `/demo?ad=...&sayfa=...` adresine gidiyor,
 * oradaki uc cerezi yazip akisa dusuruyor. Adi olan (ya da daha once yazmis
 * olan) buraya hic ugramaz.
 */
export default function DemoBaslaPage() {
  if (!DEMO) notFound();
  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bubble tilt-l p-7 sm:p-8">
          <div className="flex items-center gap-3 mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo.svg" alt="" width={44} height={44} className="rounded-xl" />
            <div>
              <h1 className="text-2xl leading-none font-bold">Demoyu açalım</h1>
              <p className="text-ink-soft text-sm mt-1">Kendi adlarınızla gezin</p>
            </div>
          </div>

          <form action="/demo" method="get" className="space-y-4">
            <div>
              <label className="label" htmlFor="ad">Çocuğunuzun adı</label>
              <input
                id="ad" name="ad" className="field" type="text"
                placeholder="ör. Zeynep" maxLength={32}
                autoComplete="off" autoCapitalize="words" required autoFocus
              />
            </div>
            <div>
              <label className="label" htmlFor="sayfa">Sayfanın adı</label>
              <input
                id="sayfa" name="sayfa" className="field" type="text"
                placeholder="ör. Zeynep'in Dünyası" maxLength={32}
                autoComplete="off" autoCapitalize="words"
              />
              <p className="text-ink-faint text-sm mt-1.5">
                İstediğinizi koyabilirsiniz — &quot;Adaland&quot; gibi. Boş bırakırsanız &quot;Zeynep&apos;in Dünyası&quot; olur.
              </p>
            </div>
            <button className="btn btn-primary w-full" type="submit">Demoyu aç →</button>
          </form>

          <p className="text-ink-faint text-sm mt-4">
            Örnek bir ailenin sayfasını baştan sona gezersiniz. Demo herkese açık,
            o yüzden gerçek bilgi girmeyin.
          </p>
        </div>

        <p className="text-center mt-6">
          <a href="/demo?atla=1" className="text-ink-faint text-sm underline">Adsız devam et</a>
        </p>
      </div>
    </main>
  );
}
