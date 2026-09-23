"use client";

import { Share2, MessageCircle } from "lucide-react";
import { useBrand } from "@/lib/brand-client";

const DESTEK_NUMARASI = "905432344125";

/**
 * Akraba linkinden FARKLI: bu, cocugun icerigini degil bugunnededi
 * URUNUNU paylasiyor. Kod uretimi bilerek burada YOK — tek kontrol noktasi
 * hala admin paneli (kota + kanal olcumu icin). Bu yuzden "Paylas" yalnizca
 * tanitim linkini gonderiyor; "Kod talep et" de aileyi degil, mesaji ALAN
 * arkadasi (bugunnededi.com'da) hedefliyor - Onur'a WhatsApp'tan dogrudan
 * o kisinin kendi numarasiyla ulasiyor.
 */
export function PaylasEt() {
  const b = useBrand();

  async function paylas() {
    const adres = `https://bugunnededi.com?ref=${encodeURIComponent(b.site)}`;
    const metin = `${b.site} bugünnededi ile tutuluyor 💛 Sen de kendi ailen için kurabilirsin: ${adres}`;
    if (navigator.share) {
      try {
        await navigator.share({ text: metin });
        return;
      } catch {
        return; // vazgecti; sessiz kal
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(metin)}`, "_blank", "noopener");
  }

  function kodTalepEt() {
    const metin = `Merhaba, ${b.site} bana bugünnededi'yi önerdi. Bir kurulum kodu alabilir miyim?`;
    window.open(`https://wa.me/${DESTEK_NUMARASI}?text=${encodeURIComponent(metin)}`, "_blank", "noopener");
  }

  return (
    <section className="bubble p-5">
      <h2 className="text-xl font-bold mb-1">bugünnededi&apos;yi paylaş</h2>
      <p className="text-ink-soft text-sm mb-4">
        Bu sayfayı beğenen bir arkadaşın kendi ailesi için de kurabilir. Verisi kendi hesabında durur, senin de bize de hiç erişimi olmaz.
      </p>
      <div className="flex flex-wrap gap-2">
        <button onClick={paylas} className="btn btn-soft"><Share2 size={18} /> Paylaş</button>
        <button onClick={kodTalepEt} className="btn btn-ghost text-ink-soft"><MessageCircle size={18} /> Kod talep et</button>
      </div>
    </section>
  );
}
