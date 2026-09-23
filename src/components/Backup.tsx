"use client";

import { useState } from "react";
import { Download, FileJson } from "lucide-react";
import { useBrand } from "@/lib/brand-client";

const KINDS = [
  { value: "photos", label: "Fotoğraflar" },
  { value: "audio", label: "Ses kayıtları" },
  { value: "videos", label: "Videolar" },
] as const;

export function Backup({ years }: { years: number[] }) {
  const b = useBrand();
  const [year, setYear] = useState(years[0] ?? new Date().getFullYear());
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("photos");

  return (
    <section id="yedek" className="bubble p-5 scroll-mt-20">
      <h2 className="text-xl font-bold mb-1">Yedek</h2>
      <p className="text-ink-soft text-sm mb-4">
        {b.site} bir gün kapansa bile anılar sende kalsın. JSON dosyası tüm sözleri, tarihleri, notları ve ölçümleri içerir;
        medya dosyalarını yıl yıl ZIP olarak indir ve bir yere (bilgisayar, harici disk) sakla.
      </p>
      <a href="/api/yedek" download className="btn btn-primary mb-4"><FileJson size={18} /> Tüm verileri indir (JSON)</a>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div>
          <label className="label" htmlFor="bk-year">Yıl</label>
          <select id="bk-year" className="field" value={year} onChange={(e) => setYear(Number(e.target.value))} disabled={years.length === 0}>
            {years.length === 0 ? <option>—</option> : years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="bk-kind">Tür</label>
          <select id="bk-kind" className="field" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </div>
        <a href={years.length ? `/api/yedek/medya?yil=${year}&tur=${kind}` : undefined} download
          className={`btn btn-soft ${years.length ? "" : "pointer-events-none opacity-50"}`}>
          <Download size={18} /> ZIP indir
        </a>
      </div>
      <p className="text-ink-faint text-xs mt-2">Video ZIP&apos;leri büyük olabilir; Wi-Fi&apos;de indir. O yılda dosya yoksa &quot;dosya yok&quot; mesajı döner.</p>
    </section>
  );
}
