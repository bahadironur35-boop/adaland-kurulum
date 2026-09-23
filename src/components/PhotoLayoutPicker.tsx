"use client";

import { Check } from "lucide-react";
import clsx from "clsx";
import { PHOTO_LAYOUTS, setPhotoLayout, usePhotoLayout, type PhotoLayout } from "@/lib/photo-layout";

/** Kucuk onizleme: uc kagit parcasi, secilen yerlesimin duruşuyla. */
function Preview({ layout }: { layout: PhotoLayout }) {
  const style = (i: number): React.CSSProperties => {
    if (layout === "grid") return {};
    if (layout === "deck") {
      const back = 2 - i;
      return { position: i === 2 ? "relative" : "absolute", inset: i === 2 ? undefined : 0,
        transform: `rotate(${(back % 2 ? 1 : -1) * (back * 4 + 2)}deg) translate(${back * -4}px, ${back * 2}px)`, zIndex: i };
    }
    const offset = i - 1;
    return { marginLeft: i === 0 ? 0 : "-14%", transform: `rotate(${offset * 9}deg) translateY(${Math.abs(offset) * 3}px)`, zIndex: 2 - Math.abs(offset) };
  };
  const tones = ["#f0565e", "#5db86a", "#7b5fd8"];
  return (
    <span className={clsx("block h-14", layout === "grid" ? "grid grid-cols-3 gap-1" : layout === "deck" ? "relative w-10 mx-auto" : "flex justify-center items-start")}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ ...style(i), ...(layout === "fan" ? { width: "40%" } : {}) }}
          className={clsx("block rounded-[3px] bg-paper p-[2px] shadow-paper", layout === "deck" && "w-10")}>
          <span className="block aspect-square rounded-[2px]" style={{ background: tones[i] }} />
        </span>
      ))}
    </span>
  );
}

/** Ayarlar: akista ayni gunun fotograflari nasil dursun? */
export function PhotoLayoutPicker() {
  const current = usePhotoLayout();
  return (
    <section className="bubble p-5">
      <h2 className="text-xl font-bold mb-1">Akışta fotoğraflar</h2>
      <p className="text-ink-soft text-sm mb-3">
        Aynı güne birden fazla fotoğraf eklediğinde akışta nasıl dursunlar? Bu cihaz için saklanır.
      </p>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Akışta fotoğraf yerleşimi">
        {PHOTO_LAYOUTS.map((l) => {
          const on = current === l.value;
          return (
            <button key={l.value} role="radio" aria-checked={on} onClick={() => setPhotoLayout(l.value)}
              className={clsx("relative rounded-2xl p-3 border-2 text-left transition-colors",
                on ? "border-grape bg-grape-soft" : "border-line hover:border-grape/50")}>
              <Preview layout={l.value} />
              <span className="block font-display font-bold text-sm mt-2">{l.label}</span>
              <span className="block text-xs text-ink-faint leading-snug">{l.hint}</span>
              {on && (
                <span className="absolute top-2 right-2 grid place-items-center w-5 h-5 rounded-full bg-grape text-white">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
