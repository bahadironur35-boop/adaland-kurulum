"use client";

import { useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";

const KEY = "adaland-theme";
type Theme = "rose" | "sky" | "lavender" | "dark";
const THEMES: { value: Theme; label: string; hint: string; swatch: string; swatch2: string }[] = [
  { value: "sky", label: "Gökyüzü", hint: "Varsayılan", swatch: "#eaf3fa", swatch2: "#d5e6f4" },
  { value: "rose", label: "Toz pembe", hint: "Sıcak, pembe", swatch: "#fbeef0", swatch2: "#f3d9de" },
  { value: "lavender", label: "Lavanta", hint: "Mor tonlu", swatch: "#f2effb", swatch2: "#e2dbf5" },
  { value: "dark", label: "Gece", hint: "Yıldızlı lacivert", swatch: "#141c3a", swatch2: "#1f2a52" },
];
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return THEMES.some((x) => x.value === t) ? (t as Theme) : "sky";
  } catch {
    return "sky";
  }
}
function write(t: Theme) {
  try { localStorage.setItem(KEY, t); } catch {}
  if (t === "sky") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Duvar rengi: kagit ve boya kalemleri sabit, sadece zemin degisir. Tercih cihazda saklanir. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "sky" as Theme);
  return (
    <section className="bubble p-5">
      <h2 className="text-xl font-bold mb-1">Görünüm</h2>
      <p className="text-ink-soft text-sm mb-3">Duvar rengini seç. Bu cihaz için saklanır; Gece modu uykudan önce göz yormaz.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Görünüm">
        {THEMES.map((t) => {
          const on = theme === t.value;
          return (
            <button key={t.value} role="radio" aria-checked={on} onClick={() => write(t.value)}
              className={clsx("relative rounded-2xl p-3 text-left border-2 transition-colors", on ? "border-grape" : "border-line hover:border-grape/50")}
              style={{ background: t.swatch }}>
              <span className="block h-8 rounded-lg mb-2" style={{ background: `radial-gradient(${t.swatch2} 1.5px, transparent 1.5px) 0 0/10px 10px, ${t.swatch}` }} aria-hidden />
              <span className={clsx("block font-display font-bold text-sm", t.value === "dark" ? "text-white" : "text-[#23305a]")}>{t.label}</span>
              <span className={clsx("block text-xs", t.value === "dark" ? "text-white/70" : "text-[#5b6584]")}>{t.hint}</span>
              {on && <span className="absolute top-2 right-2 grid place-items-center w-6 h-6 rounded-full bg-grape text-white"><Check size={14} strokeWidth={3} /></span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
