"use client";

import { useState } from "react";
import { Mic } from "lucide-react";
import type { RecordingDTO } from "@/lib/types";
import { monthLabelTr } from "@/lib/dates";
import { RecordingCard } from "@/components/RecordingCard";
import { RecordingForm } from "@/components/RecordingForm";
import { Sheet } from "@/components/Sheet";
import { EmptyState } from "@/components/EmptyState";

export function Recordings({ recordings, birth }: { recordings: RecordingDTO[]; birth: string }) {
  const [adding, setAdding] = useState(false);

  const groups: { month: string; items: RecordingDTO[] }[] = [];
  for (const r of recordings) {
    const m = r.recordedAt.slice(0, 7);
    const g = groups[groups.length - 1];
    if (g && g.month === m) g.items.push(r);
    else groups.push({ month: m, items: [r] });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5">
        <span className="font-hand text-lg text-ink-soft">{recordings.length} ses</span>
        <button className="btn btn-primary shrink-0 whitespace-nowrap" onClick={() => setAdding(true)}><Mic size={20} strokeWidth={2.6} /> Ses ekle</button>
      </div>
      {recordings.length === 0 && (
        <EmptyState title="Henüz ses yok" hint="Şarkı söylerken, masal anlatırken, kahkaha atarken... Sesi yıllar sonra duymak gibisi yok." />
      )}
      {groups.map((g) => (
        <section key={g.month} className="mb-8">
          <h2 className="text-lg text-ink-soft mb-4 px-1">{monthLabelTr(`${g.month}-01`)}</h2>
          <div className="space-y-6">
            {g.items.map((r, i) => <RecordingCard key={r.id} recording={r} birth={birth} tilt={i % 2 ? "r" : "l"} />)}
          </div>
        </section>
      ))}
      <Sheet open={adding} onClose={() => setAdding(false)} title="Yeni ses">
        <RecordingForm onDone={() => setAdding(false)} />
      </Sheet>
    </div>
  );
}
