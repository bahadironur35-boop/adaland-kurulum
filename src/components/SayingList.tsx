"use client";

import { useMemo, useState } from "react";
import { Heart, Search } from "lucide-react";
import clsx from "clsx";
import type { SayingDTO } from "@/lib/types";
import { monthLabelTr } from "@/lib/dates";
import { SayingBubble } from "./SayingBubble";
import { EmptyState } from "./EmptyState";
import { useBrand } from "@/lib/brand-client";

function normalize(s: string) {
  return s.toLocaleLowerCase("tr-TR");
}

export function SayingList({ sayings, birth }: { sayings: SayingDTO[]; birth: string }) {
  const b = useBrand();
  const [q, setQ] = useState("");
  const [onlyFav, setOnlyFav] = useState(false);

  const filtered = useMemo(() => {
    const nq = normalize(q.trim());
    return sayings.filter((s) => (!onlyFav || s.isFavorite) && (!nq || normalize(s.text + " " + (s.context ?? "")).includes(nq)));
  }, [sayings, q, onlyFav]);

  // Aya gore grupla (liste zaten tarih-azalan)
  const groups: { month: string; items: SayingDTO[] }[] = [];
  for (const s of filtered) {
    const m = s.saidAt.slice(0, 7);
    const g = groups[groups.length - 1];
    if (g && g.month === m) g.items.push(s);
    else groups.push({ month: m, items: [s] });
  }

  if (sayings.length === 0) {
    return <EmptyState title="Henüz söz yok" hint={`${b.adBelirtme} dinlemeye devam. İlk sözü sağ alttaki düğmeden ekle.`} />;
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <label className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input className="field pl-10" placeholder="Sözlerde ara" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Sözlerde ara" />
        </label>
        <button onClick={() => setOnlyFav((f) => !f)} aria-pressed={onlyFav}
          className={clsx("btn h-11 min-h-0 px-3.5", onlyFav ? "bg-crayon-soft text-crayon" : "btn-soft text-ink-soft")}>
          <Heart size={18} fill={onlyFav ? "currentColor" : "none"} /> Favoriler
        </button>
      </div>
      {filtered.length === 0 && <EmptyState title="Eşleşen söz yok" hint="Başka bir kelime dene." />}
      {groups.map((g) => (
        <section key={g.month} className="mb-8">
          <h2 className="text-lg text-ink-soft mb-4 px-1">{monthLabelTr(`${g.month}-01`)}</h2>
          <div className="space-y-7">
            {g.items.map((s, i) => (
              <SayingBubble key={s.id} saying={s} birth={birth} tilt={i % 2 ? "r" : "l"} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
