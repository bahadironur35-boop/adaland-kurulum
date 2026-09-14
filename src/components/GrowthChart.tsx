"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ageLabel, formatDateTr, fromDateStr } from "@/lib/dates";
import type { MeasurementDTO } from "@/lib/types";

/**
 * Tek seri, tek eksen (boy ve kilo ayri grafik). Isaretler >= 8px, cizgi 2px,
 * izgara geri planda; hover'da tarih + deger + yas.
 */
export function GrowthChart({ data, field, unit, color, birth, label }: {
  data: MeasurementDTO[];
  field: "heightCm" | "weightKg";
  unit: string;
  color: string;
  birth: string;
  label: string;
}) {
  const points = data
    .filter((m) => m[field] != null)
    .map((m) => ({ t: fromDateStr(m.date).getTime(), v: m[field] as number, date: m.date }));

  if (points.length < 2) {
    return (
      <div className="h-40 grid place-items-center text-ink-faint text-sm font-hand text-lg">
        {points.length === 0 ? `Henüz ${label.toLocaleLowerCase("tr-TR")} ölçümü yok.` : "Grafik için en az iki ölçüm gerekli."}
      </div>
    );
  }

  const vals = points.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = Math.max(1, (max - min) * 0.15);

  return (
    <div className="h-56 -ml-2" role="img" aria-label={`${label} grafiği, ${points.length} ölçüm`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} scale="time"
            tickFormatter={(t: number) => shortDate(t)} tick={{ fill: "#8e97b3", fontSize: 12, fontFamily: "var(--font-body)" }}
            axisLine={{ stroke: "var(--color-line)" }} tickLine={false} minTickGap={28} />
          <YAxis domain={[Math.floor(min - pad), Math.ceil(max + pad)]} width={40}
            tick={{ fill: "#8e97b3", fontSize: 12, fontFamily: "var(--font-body)" }} axisLine={false} tickLine={false}
            tickFormatter={(v: number) => `${v}`} />
          <Tooltip cursor={{ stroke: "var(--color-line)", strokeWidth: 1 }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as { v: number; date: string };
            return (
              <div className="bg-paper rounded-xl shadow-lift px-3 py-2 text-sm">
                <div className="font-display font-bold text-ink text-base">{fmt(p.v)} {unit}</div>
                <div className="text-ink-soft">{formatDateTr(p.date)}</div>
                <div className="text-ink-faint">{ageLabel(birth, p.date)}</div>
              </div>
            );
          }} />
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={{ r: 4, fill: color, stroke: "var(--color-paper)", strokeWidth: 2 }}
            activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function fmt(n: number) {
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 1 });
}

const MONTHS_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
function shortDate(t: number) {
  const d = new Date(t);
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
}
