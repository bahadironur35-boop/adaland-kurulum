"use client";

import { useSyncExternalStore } from "react";
import { FlaskConical, X } from "lucide-react";

/**
 * Demo modunda her sayfanin ustunde. Ziyaretci nerede oldugunu ve neyin
 * kapali oldugunu bilsin; "neden silemiyorum" sorusu dogmadan cevaplansin.
 *
 * Kapatilabilir: okuyan kisi ekranin tamamini gormek isteyebilir. Kapatma
 * SEKMEYE ozel (sessionStorage) — baska bir ziyaretci ya da yeni bir sekme
 * uyariyi yine gorur. Serit kapaliyken de kimse karanlikta kalmiyor: engellenen
 * her istek kendi aciklamasini donduruyor (DEMO_RET_MESAJI).
 *
 * NEDEN useSyncExternalStore, neden useEffect+setState DEGIL: sessionStorage
 * sunucuda yok, yani deger ancak tarayicida okunabiliyor. Bunu effect icinde
 * setState ile yapmak React'in "cascading render" kuralini ihlal ediyor
 * (eslint react-hooks/set-state-in-effect). Dogru model bu: sessionStorage
 * DIS BIR DEPO; sunucu anlik goruntusu daima "acik", tarayici kendi degerini
 * okuyor, kapatma hem depoya yaziyor hem aboneleri uyandiriyor.
 */
const ANAHTAR = "adaland-demo-serit";

const aboneler = new Set<() => void>();

function abone(bildir: () => void) {
  aboneler.add(bildir);
  return () => {
    aboneler.delete(bildir);
  };
}

function tarayiciDegeri() {
  try {
    return sessionStorage.getItem(ANAHTAR) === "kapali";
  } catch {
    // Gizli sekmede depolama kapali olabilir; serit acik kalir, sorun degil.
    return false;
  }
}

/** Sunucuda sessionStorage yok; serit daima acik gelir, tarayici duzeltir. */
const sunucuDegeri = () => false;

function kapat() {
  try {
    sessionStorage.setItem(ANAHTAR, "kapali");
  } catch {
    // Yazilamadiysa serit bu sekmede yine kapanir (abonelere haber veriyoruz),
    // yalnizca sayfa yenilenince geri gelir.
  }
  aboneler.forEach((bildir) => bildir());
}

export function DemoBanner() {
  const kapali = useSyncExternalStore(abone, tarayiciDegeri, sunucuDegeri);

  if (kapali) return null;

  return (
    <div className="bg-sun-soft border-b border-sun/60 text-ink text-sm print:hidden" role="status">
      <div className="mx-auto max-w-3xl px-4 py-2 flex items-start gap-2">
        <FlaskConical size={16} className="shrink-0 mt-0.5" />
        <p className="min-w-0">
          <strong className="font-display">Bu bir demo.</strong> Söz, ilk, ölçüm ve mektup ekleyip
          düzenleyebilirsin; silme ve dosya yükleme kapalı. Yazdıkların her gece 03:00&apos;te
          silinir, demo tazelenir.{" "}
          <a href="https://bugunnededi.com/kur" className="underline font-semibold">Kendi sayfanı kur</a>
        </p>
        <button
          type="button"
          onClick={kapat}
          aria-label="Demo bilgisini kapat"
          title="Kapat"
          className="shrink-0 -mr-1.5 -mt-0.5 p-1.5 rounded-full text-ink-soft hover:text-ink hover:bg-sun/40 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
