"use client";

import { useState } from "react";
import { HardDrive, Check, Loader2, AlertTriangle } from "lucide-react";
import { DepoBagla, DepoBagliSatiri, type BaglantiSonucu } from "@/components/DepoBagla";
import { depoyaTasiVeAktifEt, tasimaHatasiMetni } from "@/lib/depo-tasi";

/**
 * "Alani 10 GB'a cikar": kurulumla gelen Vercel Blob (ucretsiz 1 GB) yerine
 * S3 uyumlu bir harici depo. Bastan sona UYGULAMANIN ICINDE — aile hicbir
 * panele ortam degiskeni girmiyor, komut satiri acmiyor.
 *
 * ONERILEN BACKBLAZE B2: 10 GB ucretsiz ve KAYITTA KREDI KARTI ISTEMIYOR.
 * Cloudflare R2 de ayni alani veriyor ama ucretsiz katmanda bile kart zorunlu;
 * yine de duruyor, cunku kart sorun olmayan aile icin ikisi de calisiyor.
 *
 * CORS adimi YOK: bucket kuralini uygulama kendisi yaziyor (bkz. corsAyarla).
 *
 * DOSYALARI BU SAYFA TASIR: imzali adresle kaynaktan indirip imzali adresle
 * hedefe yukluyor. Sunucudan gecirmek, tek bir buyuk videoda fonksiyon
 * suresini asar ve goc hep ayni yerde takilirdi.
 */
type Adim = "kapali" | "rehber" | "tasima" | "bitti";

function bayt(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function DepoYukseltme({ aktifDepo, kullanilanBayt }: { aktifDepo: "blob" | "harici"; kullanilanBayt: number | null }) {
  const [adim, setAdim] = useState<Adim>("kapali");
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [baglanti, setBaglanti] = useState<BaglantiSonucu | null>(null);
  const [corsUyari, setCorsUyari] = useState(false);
  const [ilerleme, setIlerleme] = useState<{ toplam: number; biten: number; dosya: string } | null>(null);

  if (aktifDepo === "harici") {
    return (
      <div className="mt-4 rounded-2xl bg-grass-soft border-2 border-grass/40 p-4 flex items-start gap-3">
        <Check size={20} className="text-grass shrink-0 mt-0.5" />
        <p className="text-sm">
          <strong>Alanınız kendi deponuzda, 10 GB ücretsiz.</strong> Sınırı aşarsanız hiçbir şey kapanmaz;
          gigabayt başına ayda birkaç kuruş tutarında bir ücret başlar, fotoğraflarınıza bakmak ücretsizdir.
        </p>
      </div>
    );
  }

  function baglandi(r: BaglantiSonucu) {
    setBaglanti(r);
    setCorsUyari(!r.cors);
    setAdim("tasima");
  }

  async function tasi() {
    setHata(null);
    setMesgul(true);
    try {
      await depoyaTasiVeAktifEt((i) => setIlerleme(i));
      setAdim("bitti");
    } catch (e) {
      setHata(tasimaHatasiMetni(e));
    } finally {
      setMesgul(false);
    }
  }

  if (adim === "bitti") {
    return (
      <div className="mt-4 rounded-2xl bg-grass-soft border-2 border-grass/40 p-4">
        <p className="text-sm mb-3">
          <strong>Bitti, artık 10 GB alanınız var.</strong> Fotoğraf ve videolarınızın hepsi yeni depoya kopyalandı;
          hiçbiri silinmedi. Eski kopyalar bir süre daha Vercel&apos;de durabilir, acelesi yok.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => location.reload()}>Sayfayı yenile</button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {adim === "kapali" ? (
        <button type="button" className="btn btn-ghost w-full justify-start gap-2" onClick={() => setAdim("rehber")}>
          <HardDrive size={18} />
          Alanı 10 GB&apos;a çıkar
        </button>
      ) : (
        <div className="rounded-2xl bg-sky p-4">
          <h3 className="font-bold mb-1">Alanı 10 GB&apos;a çıkarma</h3>
          <p className="text-sm text-ink-soft mb-3">
            Kurulumla gelen alan 1 GB{kullanilanBayt != null ? ` (şu an ${bayt(kullanilanBayt)} dolu)` : ""}. Kendi
            deponuzu bağlayınca 10 GB oluyor ve sınır aşılsa bile hiçbir şey kapanmıyor. Bir kereye mahsus,
            yaklaşık on dakikalık bir iş. Fotoğraflarınız yine sizin hesabınızda kalır.
          </p>

          {adim === "rehber" && (
            <DepoBagla
              onBasarili={baglandi}
              ikincilDugme={
                <button type="button" className="btn btn-ghost" onClick={() => setAdim("kapali")}>Vazgeç</button>
              }
            />
          )}

          {adim === "tasima" && (
            <>
              {baglanti && <DepoBagliSatiri sonuc={baglanti} />}
              {corsUyari && (
                <p className="text-sm mb-3 flex items-start gap-1.5 text-ink-soft">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  Deponun tarayıcı ayarı yazılamadı; bu beklenmedik. Yine de deneyelim — taşıma başlamazsa
                  anahtarı silip <b>Type of Access: Read and Write</b> ile yeniden üretin.
                </p>
              )}
              <p className="text-sm mb-3">
                Şimdi mevcut fotoğraf ve videolar yeni depoya kopyalanacak. <strong>Hiçbir şey silinmiyor</strong>;
                taşıma bitene kadar sayfanız eskisi gibi çalışmaya devam eder. Bu sekmeyi açık bırakın.
              </p>
              {ilerleme && (
                <div className="mb-3">
                  <div className="h-3 rounded-full bg-sky-deep overflow-hidden" role="progressbar"
                    aria-valuenow={Math.round((ilerleme.biten / Math.max(1, ilerleme.toplam)) * 100)} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-grass transition-[width]" style={{ width: `${Math.min(100, (ilerleme.biten / Math.max(1, ilerleme.toplam)) * 100)}%` }} />
                  </div>
                  <p className="text-xs text-ink-faint mt-1.5 truncate">
                    {bayt(ilerleme.biten)} / {bayt(ilerleme.toplam)}{ilerleme.dosya ? ` · ${ilerleme.dosya}` : ""}
                  </p>
                </div>
              )}
              <button type="button" className="btn btn-primary" disabled={mesgul} onClick={tasi}>
                {mesgul ? <Loader2 size={16} className="animate-spin" /> : null} {ilerleme ? "Devam et" : "Dosyaları taşı"}
              </button>
            </>
          )}

          {hata && (
            <p className="text-sm text-crayon mt-3 flex items-start gap-1.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {hata}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
