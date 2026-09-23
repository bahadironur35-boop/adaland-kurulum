"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil } from "lucide-react";
import { api, confetti } from "@/lib/client";
import { ageLabel, formatDateTr, todayStr } from "@/lib/dates";
import type { MeasurementDTO } from "@/lib/types";
import { GrowthChart, fmt } from "./GrowthChart";
import { Sheet } from "./Sheet";
import { EmptyState } from "./EmptyState";

function MeasurementForm({ initial, onDone }: { initial?: MeasurementDTO; onDone: () => void }) {
  const router = useRouter();
  const [date, setDate] = useState(initial?.date ?? todayStr());
  const [height, setHeight] = useState(initial?.heightCm != null ? String(initial.heightCm) : "");
  const [weight, setWeight] = useState(initial?.weightKg != null ? String(initial.weightKg) : "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const h = num(height);
    const w = num(weight);
    if ((h != null && Number.isNaN(h)) || (w != null && Number.isNaN(w))) { setError("Sayı gir (örn. 98,5)."); return; }
    if (h == null && w == null) { setError("Boy ya da kilo gir."); return; }
    setBusy(true);
    try {
      const body = { date, heightCm: h, weightKg: w, note: note.trim() || null };
      if (initial) await api(`/api/olcumler/${initial.id}`, { method: "PATCH", json: body });
      else { await api("/api/olcumler", { method: "POST", json: body }); confetti(); }
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
        <label className="label" htmlFor="o-date">Ölçüm tarihi</label>
        <input id="o-date" className="field" type="date" required max={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="o-h">Boy (cm)</label>
          <input id="o-h" className="field font-display text-lg" inputMode="decimal" placeholder="98,5" value={height} onChange={(e) => setHeight(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="o-w">Kilo (kg)</label>
          <input id="o-w" className="field font-display text-lg" inputMode="decimal" placeholder="15,2" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="o-note">Not <span className="font-normal text-ink-faint">(isteğe bağlı)</span></label>
        <input id="o-note" className="field" maxLength={300} placeholder="Doktor kontrolü, evde duvar ölçümü..." value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-crayon text-sm font-semibold">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy} type="submit">
        {busy ? <span className="dots"><span /><span /><span /></span> : initial ? "Kaydet" : "Ölçümü sakla"}
      </button>
    </form>
  );
}

function Stat({ label, value, unit, delta, color }: { label: string; value: number | null; unit: string; delta: number | null; color: string }) {
  return (
    <div className="bg-paper rounded-2xl shadow-paper p-4 flex-1 min-w-[140px]">
      <div className="text-ink-soft text-sm font-display font-semibold">{label}</div>
      <div className="text-3xl font-display font-bold leading-tight" style={{ color }}>
        {value == null ? "—" : <>{fmt(value)} <span className="text-base text-ink-faint font-semibold">{unit}</span></>}
      </div>
      {delta != null && delta !== 0 && (
        <div className="text-xs text-ink-faint mt-1">{delta > 0 ? "+" : ""}{fmt(delta)} {unit} bir önceki ölçümden beri</div>
      )}
    </div>
  );
}

export function Growth({ measurements, birth }: { measurements: MeasurementDTO[]; birth: string }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<MeasurementDTO | null>(null);

  const withH = measurements.filter((m) => m.heightCm != null);
  const withW = measurements.filter((m) => m.weightKg != null);
  const lastH = withH[withH.length - 1] ?? null;
  const prevH = withH[withH.length - 2] ?? null;
  const lastW = withW[withW.length - 1] ?? null;
  const prevW = withW[withW.length - 2] ?? null;
  const latest = measurements[measurements.length - 1] ?? null;

  async function remove(m: MeasurementDTO) {
    if (!confirm("Bu ölçüm silinsin mi?")) return;
    await api(`/api/olcumler/${m.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-5">
        <span className="font-hand text-lg text-ink-soft leading-snug pt-2">
          {latest ? `Son ölçüm ${formatDateTr(latest.date)}, ${ageLabel(birth, latest.date)}` : `${measurements.length} ölçüm`}
        </span>
        <button className="btn btn-primary shrink-0 whitespace-nowrap" onClick={() => setAdding(true)}><Plus size={20} strokeWidth={2.6} /> Ölçüm ekle</button>
      </div>

      {measurements.length === 0 ? (
        <EmptyState title="Henüz ölçüm yok" hint="Doktor kontrolünden ya da duvardaki çizgiden boy ve kiloyu gir; iki ölçümden sonra grafik çıkar." />
      ) : (
        <>
          <div className="flex flex-wrap gap-4 mb-8">
            <Stat label="Boy" value={lastH?.heightCm ?? null} unit="cm" color="#7b5fd8"
              delta={lastH && prevH ? (lastH.heightCm ?? 0) - (prevH.heightCm ?? 0) : null} />
            <Stat label="Kilo" value={lastW?.weightKg ?? null} unit="kg" color="#f0565e"
              delta={lastW && prevW ? (lastW.weightKg ?? 0) - (prevW.weightKg ?? 0) : null} />
          </div>

          <section className="bg-paper rounded-2xl shadow-paper p-4 mb-8">
            <h2 className="text-lg font-bold mb-1">Boy</h2>
            <GrowthChart data={measurements} field="heightCm" unit="cm" color="#7b5fd8" birth={birth} label="Boy" />
          </section>
          <section className="bg-paper rounded-2xl shadow-paper p-4 mb-8">
            <h2 className="text-lg font-bold mb-1">Kilo</h2>
            <GrowthChart data={measurements} field="weightKg" unit="kg" color="#f0565e" birth={birth} label="Kilo" />
          </section>

          <section>
            <h2 className="text-lg text-ink-soft mb-3 px-1">Tüm ölçümler</h2>
            <div className="bg-paper rounded-2xl shadow-paper overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-faint font-display">
                    <th className="px-4 py-2.5">Tarih</th><th className="px-2 py-2.5">Yaş</th>
                    <th className="px-2 py-2.5 text-right">Boy</th><th className="px-2 py-2.5 text-right">Kilo</th>
                    <th className="px-2 py-2.5">Not</th><th className="px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {[...measurements].reverse().map((m) => (
                    <tr key={m.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                      <td className="px-4 py-2 whitespace-nowrap font-semibold">{formatDateTr(m.date)}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-ink-soft">{ageLabel(birth, m.date)}</td>
                      <td className="px-2 py-2 text-right font-display">{m.heightCm != null ? `${fmt(m.heightCm)} cm` : "—"}</td>
                      <td className="px-2 py-2 text-right font-display">{m.weightKg != null ? `${fmt(m.weightKg)} kg` : "—"}</td>
                      <td className="px-2 py-2 text-ink-soft font-hand text-base">{m.note}</td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        <button onClick={() => setEditing(m)} className="btn btn-ghost h-8 w-8 min-h-0 p-0" aria-label="Düzenle"><Pencil size={15} /></button>
                        <button onClick={() => remove(m)} className="btn btn-ghost h-8 w-8 min-h-0 p-0 hover:text-crayon" aria-label="Sil"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Yeni ölçüm">
        <MeasurementForm onDone={() => setAdding(false)} />
      </Sheet>
      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Ölçümü düzenle">
        {editing && <MeasurementForm key={editing.id} initial={editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </div>
  );
}
