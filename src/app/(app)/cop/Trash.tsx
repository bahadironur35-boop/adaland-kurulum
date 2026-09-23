"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2, Trash2, MessageCircle, Camera, Clapperboard, Star, Mic, Mail, Ruler } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/client";
import { formatDateTr } from "@/lib/dates";
import { EmptyState } from "@/components/EmptyState";
import type { TrashItem, TrashType } from "@/lib/trash";

const ICON: Record<TrashType, typeof MessageCircle> = {
  saying: MessageCircle,
  photo: Camera,
  video: Clapperboard,
  milestone: Star,
  recording: Mic,
  letter: Mail,
  measurement: Ruler,
};
const LABEL: Record<TrashType, string> = {
  saying: "Söz", photo: "Fotoğraf", video: "Video", milestone: "İlk",
  recording: "Ses", letter: "Mektup", measurement: "Ölçüm",
};

export function Trash({ items }: { items: TrashItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(item: TrashItem, action: "restore" | "purge") {
    if (action === "purge" && !confirm(`"${item.title}" kalıcı olarak silinsin mi? Bu geri alınamaz.`)) return;
    setBusy(item.type + item.id);
    try {
      await api("/api/cop", { method: "POST", json: { action, type: item.type, id: item.id } });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return <EmptyState title="Çöp kutusu boş" hint="Sildiğin bir şey olursa burada bekler, aceleyle kaybolmaz." />;
  }

  return (
    <ul className="space-y-3">
      {items.map((it) => {
        const Icon = ICON[it.type];
        const key = it.type + it.id;
        const acele = it.daysLeft <= 3;
        return (
          <li key={key} className="bg-paper rounded-2xl shadow-paper p-3 flex items-center gap-3">
            {it.thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.thumbUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 bg-sky-deep" />
            ) : (
              <span className="w-14 h-14 rounded-lg bg-sky grid place-items-center shrink-0 text-ink-soft">
                <Icon size={22} />
              </span>
            )}

            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{it.title}</div>
              <div className="text-xs text-ink-faint">
                {LABEL[it.type]}
                {it.date && ` · ${formatDateTr(it.date)}`}
              </div>
              <div className={clsx("text-xs mt-0.5", acele ? "text-crayon font-semibold" : "text-ink-faint")}>
                {it.daysLeft === 0 ? "Bugün kalıcı silinecek" : `${it.daysLeft} gün sonra kalıcı silinecek`}
              </div>
            </div>

            <div className="flex gap-1 shrink-0">
              <button onClick={() => act(it, "restore")} disabled={busy === key}
                className="btn btn-soft h-10 min-h-0 px-3 text-sm" aria-label={`${it.title} geri al`}>
                <Undo2 size={17} /> <span className="hidden sm:inline">Geri al</span>
              </button>
              <button onClick={() => act(it, "purge")} disabled={busy === key}
                className="btn btn-ghost h-10 w-10 min-h-0 p-0 hover:text-crayon" aria-label={`${it.title} kalıcı sil`}>
                <Trash2 size={17} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
