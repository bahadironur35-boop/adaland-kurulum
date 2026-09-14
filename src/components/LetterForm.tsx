"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { api, confetti } from "@/lib/client";
import { formatDateTr, fromDateStr, todayStr } from "@/lib/dates";
import type { LetterDTO } from "@/lib/types";
import { useBrand } from "@/lib/brand-client";

function addYears(birth: string, years: number, md?: string) {
  const b = fromDateStr(birth);
  const y = b.getUTCFullYear() + years;
  return md ? `${y}-${md}` : `${y}-${String(b.getUTCMonth() + 1).padStart(2, "0")}-${String(b.getUTCDate()).padStart(2, "0")}`;
}

export function LetterForm({ initial, birth, onDone }: { initial?: LetterDTO; birth: string; onDone: () => void }) {
  const b = useBrand();
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [openAt, setOpenAt] = useState(initial?.openAt ?? addYears(birth, 18));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const presets = [
    { label: "4. doğum günü", date: addYears(birth, 4) },
    { label: "İlkokula başlarken", date: addYears(birth, 6, "09-01") },
    { label: "10. doğum günü", date: addYears(birth, 10) },
    { label: "18. doğum günü", date: addYears(birth, 18) },
  ].filter((p) => p.date > todayStr());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = { title, body, openAt };
      if (initial) await api(`/api/mektuplar/${initial.id}`, { method: "PATCH", json: payload });
      else { await api("/api/mektuplar", { method: "POST", json: payload }); confetti(); }
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="l-title">Başlık</label>
        <input id="l-title" className="field font-display text-lg" required maxLength={120} autoFocus placeholder={`Sevgili ${b.ad},`} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="l-body">Mektup</label>
        <textarea id="l-body" className="field font-hand text-xl leading-relaxed" rows={8} required maxLength={20000}
          placeholder="Bugün üç buçuk yaşındasın ve..." value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <div>
        <span className="label">Ne zaman açılsın?</span>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {presets.map((p) => (
            <button key={p.label} type="button" onClick={() => setOpenAt(p.date)}
              className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold border-2", openAt === p.date ? "border-grape bg-grape-soft text-grape" : "border-line text-ink-soft hover:border-grape")}>
              {p.label}
            </button>
          ))}
        </div>
        <input className="field" type="date" required min={todayStr()} value={openAt} onChange={(e) => setOpenAt(e.target.value)} aria-label="Açılış tarihi" />
        <p className="text-ink-faint text-xs mt-1">
          {formatDateTr(openAt)} gününe kadar sadece sen okuyabilirsin; o gün akışta &quot;bir mektup açıldı&quot; diye görünür.
        </p>
      </div>
      {error && <p role="alert" className="text-crayon text-sm font-semibold">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy || !title.trim() || !body.trim()} type="submit">
        {busy ? <span className="dots"><span /><span /><span /></span> : initial ? "Kaydet" : "Mühürle"}
      </button>
    </form>
  );
}
