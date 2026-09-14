"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/client";
import { formatDateTr, monthLabelTr, todayStr } from "@/lib/dates";
import type { PhotoDTO } from "@/lib/types";
import { AgeBadge } from "./AgeBadge";
import { EmptyState } from "./EmptyState";

export function PhotoCard({ photo, birth, onOpen, href, small }: { photo: PhotoDTO; birth: string; onOpen?: () => void; href?: string; small?: boolean }) {
  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.thumbUrl} alt={photo.caption ?? ""} width={photo.width} height={photo.height} loading="lazy"
        className="w-full aspect-square object-cover rounded-sm bg-sky-deep" />
      <div className={clsx("flex items-end justify-between gap-2 pt-2", small ? "text-xs" : "text-sm")}>
        <span className="font-hand text-ink-soft truncate text-[1.05em]">{photo.caption || formatDateTr(photo.takenAt)}</span>
        {photo.isFavorite && <Heart size={14} className="text-crayon shrink-0" fill="currentColor" />}
      </div>
      {!small && <AgeBadge birth={birth} at={photo.takenAt} tone="grape" className="absolute -top-2 -left-2 text-[11px] px-2" />}
    </>
  );
  const cls = "polaroid text-left w-full block relative hover:shadow-lift transition-shadow";
  const label = photo.caption ?? `Fotoğraf, ${formatDateTr(photo.takenAt)}`;
  if (href) return <Link href={href} className={cls} aria-label={label}>{inner}</Link>;
  return <button onClick={onOpen} className={clsx(cls, !onOpen && "cursor-default")} aria-label={label}>{inner}</button>;
}

export function Lightbox({ photos, index, birth, onClose, onIndex, readOnly }: {
  photos: PhotoDTO[]; index: number; birth: string; onClose: () => void; onIndex: (i: number) => void; readOnly?: boolean;
}) {
  const router = useRouter();
  const p = photos[index];
  const [caption, setCaption] = useState(p.caption ?? "");
  const [takenAt, setTakenAt] = useState(p.takenAt);
  const [fav, setFav] = useState(p.isFavorite);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      if (e.key === "ArrowRight" && index < photos.length - 1) onIndex(index + 1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [index, photos.length, onClose, onIndex]);

  async function save(extra: Partial<{ caption: string | null; takenAt: string; isFavorite: boolean }> = {}) {
    setBusy(true);
    try {
      await api(`/api/fotograflar/${p.id}`, { method: "PATCH", json: { caption: caption.trim() || null, takenAt, ...extra } });
      router.refresh();
    } finally { setBusy(false); }
  }
  async function toggleFav() { setFav(!fav); await save({ isFavorite: !fav }); }
  async function remove() {
    if (!confirm("Bu fotoğraf silinsin mi? Geri alınamaz.")) return;
    setBusy(true);
    await api(`/api/fotograflar/${p.id}`, { method: "DELETE" });
    router.refresh();
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-ink/90 flex flex-col" role="dialog" aria-modal="true" aria-label="Fotoğraf">
      <div className="flex items-center justify-between p-3 text-white">
        <span className="font-hand text-lg opacity-80">{index + 1} / {photos.length}</span>
        <button onClick={onClose} className="btn btn-ghost text-white h-10 w-10 min-h-0 p-0" aria-label="Kapat"><X /></button>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2">
        {index > 0 && <button onClick={() => onIndex(index - 1)} className="absolute left-2 btn btn-ghost text-white h-12 w-12 min-h-0 p-0" aria-label="Önceki"><ChevronLeft size={28} /></button>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.url} alt={p.caption ?? ""} className="max-h-full max-w-full object-contain rounded-md" />
        {index < photos.length - 1 && <button onClick={() => onIndex(index + 1)} className="absolute right-2 btn btn-ghost text-white h-12 w-12 min-h-0 p-0" aria-label="Sonraki"><ChevronRight size={28} /></button>}
      </div>
      <div className="bg-paper rounded-t-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2 mb-2">
          <AgeBadge birth={birth} at={takenAt} tone="grape" />
          <span className="text-ink-faint text-sm">{formatDateTr(takenAt)}{p.addedBy && ` · ${p.addedBy} ekledi`}</span>
        </div>
        {readOnly ? (
          p.caption && <p className="font-hand text-xl">{p.caption}</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <input className="field font-hand text-lg flex-1" placeholder="Bir not ekle..." value={caption}
              onChange={(e) => setCaption(e.target.value)} onBlur={() => caption !== (p.caption ?? "") && save()} aria-label="Fotoğraf notu" />
            <input className="field sm:w-44" type="date" max={todayStr()} value={takenAt} aria-label="Çekim tarihi"
              onChange={(e) => setTakenAt(e.target.value)} onBlur={() => takenAt !== p.takenAt && save()} />
            <div className="flex gap-1">
              <button onClick={toggleFav} disabled={busy} aria-pressed={fav} aria-label="Favori"
                className={clsx("btn h-11 w-11 min-h-0 p-0", fav ? "bg-crayon-soft text-crayon" : "btn-soft text-ink-faint")}>
                <Heart size={20} fill={fav ? "currentColor" : "none"} />
              </button>
              <button onClick={remove} disabled={busy} className="btn btn-soft h-11 w-11 min-h-0 p-0 text-ink-faint hover:text-crayon" aria-label="Sil"><Trash2 size={20} /></button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function PhotoGrid({ photos, birth, readOnly = false }: { photos: PhotoDTO[]; birth: string; readOnly?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);

  if (photos.length === 0) {
    return <EmptyState title="Henüz fotoğraf yok" hint="İlk anıyı yukarıdaki düğmeden yükle." />;
  }

  const groups: { month: string; items: { p: PhotoDTO; i: number }[] }[] = [];
  photos.forEach((p, i) => {
    const m = p.takenAt.slice(0, 7);
    const g = groups[groups.length - 1];
    if (g && g.month === m) g.items.push({ p, i });
    else groups.push({ month: m, items: [{ p, i }] });
  });

  return (
    <div>
      {groups.map((g) => (
        <section key={g.month} className="mb-8">
          <h2 className="text-lg text-ink-soft mb-4 px-1">{monthLabelTr(`${g.month}-01`)}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {g.items.map(({ p, i }, k) => (
              <div key={p.id} className={k % 3 === 1 ? "tilt-r" : "tilt-l"}>
                <PhotoCard photo={p} birth={birth} onOpen={() => setOpen(i)} />
              </div>
            ))}
          </div>
        </section>
      ))}
      {open !== null && <Lightbox key={photos[open].id} photos={photos} index={open} birth={birth} onClose={() => setOpen(null)} onIndex={setOpen} readOnly={readOnly} />}
    </div>
  );
}
