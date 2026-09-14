"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/client";
import { formatDateTr } from "@/lib/dates";
import type { RecordingDTO } from "@/lib/types";
import { AgeBadge } from "./AgeBadge";
import { AudioPlayer } from "./AudioPlayer";
import { Sheet } from "./Sheet";
import { RecordingForm } from "./RecordingForm";

/** Sozden bagimsiz ses: sarki, masal, kahkaha. Mikrofon ikonu + oynatici. */
export function RecordingCard({ recording, birth, tilt, readOnly = false }: {
  recording: RecordingDTO; birth: string; tilt?: "l" | "r"; readOnly?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Bu ses kaydı silinsin mi? Geri alınamaz.")) return;
    setBusy(true);
    try {
      await api(`/api/sesler/${recording.id}`, { method: "DELETE" });
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <article className={clsx("relative bg-paper rounded-2xl shadow-paper p-4", tilt === "l" && "tilt-l", tilt === "r" && "tilt-r")}>
      <AgeBadge birth={birth} at={recording.recordedAt} tone="grape" className="absolute -top-3 -right-2" />
      <h3 className="text-xl font-bold leading-tight flex items-center gap-1.5 pr-16">
        <Mic size={18} className="text-grape shrink-0" />
        <span className="truncate">{recording.title}</span>
      </h3>
      {recording.note && <p className="font-hand text-lg text-ink-soft mt-1">{recording.note}</p>}
      {recording.url ? <AudioPlayer src={recording.url} className="mt-3" /> : <p className="text-ink-faint text-sm mt-2">Ses adresi alınamadı.</p>}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-ink-faint text-sm font-semibold">
          <time dateTime={recording.recordedAt}>{formatDateTr(recording.recordedAt)}</time>
          {recording.addedBy && <span className="font-normal"> · {recording.addedBy} ekledi</span>}
        </span>
        {!readOnly && (
          <div className="flex items-center gap-1">
            <button onClick={() => setEditing(true)} className="btn btn-ghost h-9 w-9 min-h-0 p-0" aria-label="Düzenle"><Pencil size={17} /></button>
            <button onClick={remove} disabled={busy} className="btn btn-ghost h-9 w-9 min-h-0 p-0 hover:text-crayon" aria-label="Sil"><Trash2 size={17} /></button>
          </div>
        )}
      </div>
      <Sheet open={editing} onClose={() => setEditing(false)} title="Sesi düzenle">
        <RecordingForm initial={recording} onDone={() => setEditing(false)} />
      </Sheet>
    </article>
  );
}
