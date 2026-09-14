"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, Star } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/client";
import { formatDateTr } from "@/lib/dates";
import type { MilestoneDTO } from "@/lib/types";
import { AgeBadge } from "./AgeBadge";
import { Sheet } from "./Sheet";
import { MilestoneForm } from "./MilestoneForm";

/** Bir "ilk": yildizli kart. Zaman cizelgesinde ve akista ayni bilesen. */
export function MilestoneCard({ milestone, birth, tilt, readOnly = false, compact = false }: {
  milestone: MilestoneDTO;
  birth: string;
  tilt?: "l" | "r";
  readOnly?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Bu ilk silinsin mi? Geri alınamaz.")) return;
    setBusy(true);
    try {
      await api(`/api/ilkler/${milestone.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={clsx("relative bg-paper rounded-2xl shadow-paper p-4 pl-5", tilt === "l" && "tilt-l", tilt === "r" && "tilt-r")}>
      <AgeBadge birth={birth} at={milestone.date} tone="grass" className="absolute -top-3 -right-2" />
      <div className="flex gap-3">
        {milestone.photoThumbUrl && (
          <Link href="/fotograflar" className="polaroid shrink-0 w-20 p-1 pb-1.5 -rotate-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={milestone.photoThumbUrl} alt="" className="w-full aspect-square object-cover rounded-sm" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold leading-tight flex items-center gap-1.5">
            <Star size={18} className="text-sun shrink-0" fill="currentColor" />
            <span className="truncate">{milestone.title}</span>
          </h3>
          {milestone.note && !compact && <p className="font-hand text-lg text-ink-soft mt-1 whitespace-pre-wrap">{milestone.note}</p>}
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-ink-faint text-sm font-semibold">
              <time dateTime={milestone.date}>{formatDateTr(milestone.date)}</time>
              {milestone.addedBy && <span className="font-normal"> · {milestone.addedBy} ekledi</span>}
            </span>
            {!readOnly && !compact && (
              <div className="flex items-center gap-1">
                <button onClick={() => setEditing(true)} className="btn btn-ghost h-9 w-9 min-h-0 p-0" aria-label="Düzenle"><Pencil size={17} /></button>
                <button onClick={remove} disabled={busy} className="btn btn-ghost h-9 w-9 min-h-0 p-0 hover:text-crayon" aria-label="Sil"><Trash2 size={17} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Sheet open={editing} onClose={() => setEditing(false)} title="İlki düzenle">
        <MilestoneForm initial={milestone} onDone={() => setEditing(false)} />
      </Sheet>
    </article>
  );
}
