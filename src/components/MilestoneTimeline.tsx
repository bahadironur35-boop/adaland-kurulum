"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { MilestoneDTO } from "@/lib/types";
import { ageLabel } from "@/lib/dates";
import { MilestoneCard } from "./MilestoneCard";
import { Sheet } from "./Sheet";
import { MilestoneForm } from "./MilestoneForm";
import { EmptyState } from "./EmptyState";

/** Dikey zaman cizelgesi: solda kesikli cizgi, her ilk icin yildiz dugum. En yeni ustte. */
export function MilestoneTimeline({ milestones, birth }: { milestones: MilestoneDTO[]; birth: string }) {
  const [adding, setAdding] = useState(false);

  // Yasa gore grupla ("2 yasinda", "1 yas 4 aylik"...) — yil bazinda
  const groups: { year: number; items: MilestoneDTO[] }[] = [];
  for (const m of milestones) {
    const y = yearsAt(birth, m.date);
    const g = groups[groups.length - 1];
    if (g && g.year === y) g.items.push(m);
    else groups.push({ year: y, items: [m] });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <span className="font-hand text-lg text-ink-soft">{milestones.length} ilk</span>
        <button className="btn btn-primary shrink-0 whitespace-nowrap" onClick={() => setAdding(true)}><Plus size={20} strokeWidth={2.6} /> İlk ekle</button>
      </div>

      {milestones.length === 0 && (
        <EmptyState title="Henüz ilk yok" hint="İlk adım, ilk diş, ilk kelime... Hatırladıkların için geriye dönük tarih girebilirsin." />
      )}

      <div className="relative pl-8">
        <div className="absolute left-3 top-2 bottom-2 border-l-2 border-dashed border-sky-deep" aria-hidden />
        {groups.map((g) => (
          <section key={g.year} className="mb-8">
            <h2 className="relative text-lg text-ink-soft mb-4 -ml-8 pl-8">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-sun-soft border-2 border-sun grid place-items-center text-[10px] font-display font-bold">{g.year}</span>
              {g.year === 0 ? "İlk yıl" : `${g.year} yaş`}
            </h2>
            <div className="space-y-6">
              {g.items.map((m, i) => (
                <div key={m.id} className="relative">
                  <span className="absolute -left-8 top-5 -translate-x-[3px] text-sun" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7L12 17.5 5.8 21l1.6-7L2 9.3l7.1-.7z" /></svg>
                  </span>
                  <MilestoneCard milestone={m} birth={birth} tilt={i % 2 ? "r" : "l"} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Yeni ilk">
        <MilestoneForm onDone={() => setAdding(false)} />
      </Sheet>
    </div>
  );
}

function yearsAt(birth: string, at: string): number {
  const label = ageLabel(birth, at);
  const m = label.match(/^(\d+) yaş/);
  return m ? Number(m[1]) : 0;
}
