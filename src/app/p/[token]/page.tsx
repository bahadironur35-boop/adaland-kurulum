import type { Metadata } from "next";
import { openShareLink } from "@/lib/share";
import { requireBrand, getBrandSafe } from "@/lib/brand";
import { BrandProvider } from "@/lib/brand-client";

import { listMilestones, listPhotos, listRecordings, listSayings, listVideos } from "@/lib/queries";
import { ageLabel, todayStr } from "@/lib/dates";
import { ShareFeed } from "@/components/ShareFeed";

export const dynamic = "force-dynamic";

// OG karti bilerek genel: WhatsApp onizlemesinde cocugun fotografi degil logo cikar,
// link yanlis ele gecse bile onizleme bir sey sizdirmaz. Bu yuzden YALNIZCA sayfa adi
// okunur, cocugun adi asla; getBrandSafe firlatmaz.
export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getBrandSafe();
  return {
    title: { absolute: siteName },
    description: "Aile anıları. Sadece aile için paylaşıldı.",
    openGraph: { title: siteName, description: "Aile anıları", images: ["/icons/icon-512.png"], type: "website" },
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await openShareLink(token);

  const { siteName } = await getBrandSafe();
  if (!link) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6">
        <div className="bubble tilt-l p-7 max-w-sm text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/logo.svg" alt="" width={56} height={56} className="rounded-2xl mx-auto mb-3" />
          <h1 className="text-2xl font-bold">Bu link artık geçerli değil</h1>
          <p className="font-hand text-lg text-ink-soft mt-2">
            Süresi dolmuş ya da kapatılmış olabilir. Ailesinden yeni bir link isteyebilirsin.
          </p>
        </div>
      </main>
    );
  }

  const [brand, sayings, photos, videos, milestones, recordings] = await Promise.all([
    requireBrand(), listSayings(), listPhotos(), listVideos(), listMilestones(), listRecordings(),
  ]);
  const birth = brand.birthDate;

  return (
    <BrandProvider value={{ childName: brand.childName, siteName: brand.siteName }}>
    <div className="min-h-dvh pb-10">
      <header className="sticky top-0 z-30 bg-sky/85 backdrop-blur border-b border-line/70">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo.svg" alt="" width={30} height={30} className="rounded-lg" />
            <span className="display text-2xl font-bold leading-none">{siteName}</span>
          </span>
          <span className="font-hand text-lg text-ink-soft">Merhaba {link.label}</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pt-4 md:pt-8">
        <section className="mb-6">
          <p className="font-hand text-xl text-ink-soft">Bugün {brand.childName}</p>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">{ageLabel(birth, todayStr())}</h1>
          <p className="text-ink-faint text-sm mt-2">Bu sayfa sadece seninle paylaşıldı; lütfen linki başkasına iletme.</p>
        </section>
        <ShareFeed birth={birth} sayings={sayings} photos={photos} videos={videos} milestones={milestones} recordings={recordings} />
      </main>
    </div>
    </BrandProvider>
  );
}
