"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/client";
import { formatDateTr } from "@/lib/dates";
import type { SayingDTO } from "@/lib/types";
import { AgeBadge } from "./AgeBadge";
import { Sheet } from "./Sheet";
import { SayingForm } from "./SayingForm";
import { AudioPlayer } from "./AudioPlayer";

export function SayingBubble({ saying, birth, tilt, readOnly = false }: {
  saying: SayingDTO;
  birth: string;
  tilt?: "l" | "r";
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [fav, setFav] = useState(saying.isFavorite);
  const [busy, setBusy] = useState(false);

  async function toggleFav() {
    setFav(!fav);
    try {
      await api(`/api/sozler/${saying.id}`, { method: "PATCH", json: { isFavorite: !fav } });
      router.refresh();
    } catch {
      setFav(fav);
    }
  }

  async function remove() {
    if (!confirm("Bu söz silinsin mi? Geri alınamaz.")) return;
    setBusy(true);
    try {
      await api(`/api/sozler/${saying.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={clsx("bubble p-5 pb-6", tilt === "l" && "tilt-l", tilt === "r" && "tilt-r")}>
      <AgeBadge birth={birth} at={saying.saidAt} className="absolute -top-3 -right-2" />
      <p className="font-hand text-2xl leading-snug whitespace-pre-wrap break-words pr-6">“{saying.text}”</p>
      {saying.context && <p className="text-ink-soft text-sm mt-2">{saying.context}</p>}
      {saying.audioUrl && <AudioPlayer src={saying.audioUrl} className="mt-3" />}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-ink-faint text-sm font-semibold">
          <time dateTime={saying.saidAt}>{formatDateTr(saying.saidAt)}</time>
          {saying.addedBy && <span className="font-normal"> · {saying.addedBy} ekledi</span>}
        </span>
        {!readOnly && (
          <div className="flex items-center gap-1">
            <button onClick={toggleFav} aria-pressed={fav} aria-label={fav ? "Favorilerden çıkar" : "Favorilere ekle"}
              className={clsx("btn h-9 w-9 min-h-0 p-0", fav ? "text-crayon" : "btn-ghost text-ink-faint")}>
              <Heart size={18} fill={fav ? "currentColor" : "none"} />
            </button>
            <button onClick={() => setEditing(true)} className="btn btn-ghost h-9 w-9 min-h-0 p-0" aria-label="Düzenle"><Pencil size={17} /></button>
            <button onClick={remove} disabled={busy} className="btn btn-ghost h-9 w-9 min-h-0 p-0 hover:text-crayon" aria-label="Sil"><Trash2 size={17} /></button>
          </div>
        )}
        {readOnly && fav && <Heart size={18} className="text-crayon" fill="currentColor" />}
      </div>
      <Sheet open={editing} onClose={() => setEditing(false)} title="Sözü düzenle">
        <SayingForm initial={saying} onDone={() => setEditing(false)} />
      </Sheet>
    </article>
  );
}
