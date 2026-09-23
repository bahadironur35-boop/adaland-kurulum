import Link from "next/link";
import { X } from "lucide-react";
import { requireBrand } from "@/lib/brand";
import { oyunBaglantisiGetirYaDaOlustur } from "@/lib/share";
import { rp } from "@/lib/webauthn";

export const metadata = { title: "Oyun Odası" };
export const dynamic = "force-dynamic";

const OYUN_ODASI_ADRESI = "https://oyun.bugunnededi.com";

/**
 * Oyun Odası artik AYRI SEKMEYE ACILMIYOR — (app) Nav'inin icinde, tam
 * ekran bir iframe olarak gomulu. Onceden route.ts NextResponse.redirect
 * ile disari cikariyordu; Onur "iki ayri uygulamaymis gibi" hissettigini
 * soyleyince buraya tasindi. Boyama tarafinda X-Frame-Options/CSP yok,
 * gomme serbest.
 *
 * Kapi ARTIK (app)/layout.tsx'ten geliyor (brand/parent/mustChangePassword
 * ayni ucleme) — burada tekrar kontrol YOK, kod tekrari onceki halin
 * "kapiyi kendisi tutuyor" yorumunu gecersiz kildi.
 *
 * baglan= ve yas= parametreleri AYNEN korunuyor (bkz. boyama/src/App.tsx) —
 * tek fark tasima yontemi: redirect yerine iframe src.
 *
 * TAM VIEWPORT KAPLAR (Nav/DemoBanner/QuickAdd'in USTUNE, z-50 — Sheet
 * modaliyla ayni kat): Nav'in yuksekligini sabit varsaymak (ornegin top-14)
 * DEMO'da DemoBanner eklenince yanlis cikardi. Cocuk oyuna girince gercekten
 * tam ekran oynasin diye zaten bu daha dogrusu.
 *
 * GERI DONUS INCE BIR UST SERIT, IFRAME'IN USTUNE BINEN BIR DUGME DEGIL:
 * boyama'nin kendi ekranlari zaten hem sol-ust (Geri) hem sag-ust (ayarlar
 * dislisi, Eslestir'de "yeniden") koseleri kullaniyor — ustlerine baska bir
 * dugme binerse cakisir. Serit, iframe'in disinda ayri bir alan.
 */
/** Render disinda: Date.now() gibi saf-olmayan cagrilar bilesen govdesinde olmamali. */
async function oyunAdresiUret(): Promise<string> {
  const brand = await requireBrand();
  const { origin } = await rp();
  const link = await oyunBaglantisiGetirYaDaOlustur();
  const dogum = Date.parse(`${brand.birthDate}T00:00:00Z`);
  const gun = Math.max(0, Math.floor((Date.now() - dogum) / 86_400_000));

  const url = new URL(OYUN_ODASI_ADRESI);
  url.searchParams.set("baglan", `${origin}/p/${link.token}`);
  url.searchParams.set("yas", String(gun));
  return url.toString();
}

export default async function OyunOdasiPage() {
  const url = await oyunAdresiUret();

  return (
    <div className="fixed inset-0 z-50 bg-[#fdf6e8] flex flex-col">
      <Link href="/" className="flex items-center gap-1.5 shrink-0 h-10 px-3 text-ink-soft text-sm font-display font-semibold">
        <X size={16} strokeWidth={2.6} /> Adaland&apos;a dön
      </Link>
      <iframe src={url} title="Oyun Odası" className="flex-1 w-full border-0" allow="autoplay" />
    </div>
  );
}
