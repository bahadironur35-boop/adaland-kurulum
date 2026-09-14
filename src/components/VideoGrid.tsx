"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Play, Trash2, X, Camera } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/client";
import { regeneratePoster } from "@/lib/media-client";
import { formatDateTr, formatDuration, monthLabelTr, todayStr } from "@/lib/dates";
import type { VideoDTO } from "@/lib/types";
import { AgeBadge } from "./AgeBadge";
import { EmptyState } from "./EmptyState";

export function VideoCard({ video, birth, onOpen, href, small }: {
  video: VideoDTO; birth: string; onOpen?: () => void; href?: string; small?: boolean;
}) {
  const inner = (
    <>
      <div className="relative aspect-square rounded-sm overflow-hidden bg-ink">
        {video.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.posterUrl} alt="" loading="lazy" className="w-full h-full object-cover opacity-90" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-grape to-ink" />
        )}
        <span className="absolute inset-0 grid place-items-center">
          <span className={clsx("grid place-items-center rounded-full bg-paper/90 text-crayon shadow-lift", small ? "w-9 h-9" : "w-12 h-12")}>
            <Play size={small ? 16 : 22} fill="currentColor" className="ml-0.5" />
          </span>
        </span>
        {video.durationSec != null && (
          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-ink/80 text-white text-[11px] font-display px-1.5 py-0.5">{formatDuration(video.durationSec)}</span>
        )}
      </div>
      <div className={clsx("pt-2", small ? "text-xs" : "text-sm")}>
        <span className="font-hand text-ink-soft truncate block text-[1.05em]">{video.caption || formatDateTr(video.takenAt)}</span>
      </div>
      {!small && <AgeBadge birth={birth} at={video.takenAt} tone="grass" className="absolute -top-2 -left-2 text-[11px] px-2" />}
    </>
  );
  const cls = "polaroid text-left w-full block relative hover:shadow-lift transition-shadow";
  const label = video.caption ?? `Video, ${formatDateTr(video.takenAt)}`;
  if (href) return <Link href={href} className={cls} aria-label={label}>{inner}</Link>;
  return <button onClick={onOpen} className={clsx(cls, !onOpen && "cursor-default")} aria-label={label}>{inner}</button>;
}

export function VideoPlayer({ video, birth, onClose, readOnly }: { video: VideoDTO; birth: string; onClose: () => void; readOnly?: boolean }) {
  const router = useRouter();
  const [caption, setCaption] = useState(video.caption ?? "");
  const [takenAt, setTakenAt] = useState(video.takenAt);
  const [busy, setBusy] = useState(false);
  const [posterMsg, setPosterMsg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  async function save() {
    setBusy(true);
    try {
      await api(`/api/videolar/${video.id}`, { method: "PATCH", json: { caption: caption.trim() || null, takenAt } });
      router.refresh();
    } finally { setBusy(false); }
  }
  async function makePoster() {
    setBusy(true);
    setPosterMsg("Kare alınıyor…");
    videoRef.current?.pause();
    try {
      await regeneratePoster(video.id, video.url, videoRef.current?.currentTime);
      setPosterMsg("Kapak güncellendi.");
      router.refresh();
    } catch (err) {
      setPosterMsg(err instanceof Error ? err.message : "Kapak alınamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Bu video silinsin mi? Geri alınamaz.")) return;
    setBusy(true);
    await api(`/api/videolar/${video.id}`, { method: "DELETE" });
    router.refresh();
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-ink/95 flex flex-col" role="dialog" aria-modal="true" aria-label="Video">
      <div className="flex items-center justify-end p-3">
        <button onClick={onClose} className="btn btn-ghost text-white h-10 w-10 min-h-0 p-0" aria-label="Kapat"><X /></button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center px-2">
        <video ref={videoRef} src={video.url} poster={video.posterUrl ?? undefined} crossOrigin="anonymous" controls autoPlay playsInline className="max-h-full max-w-full rounded-md bg-black" />
      </div>
      <div className="bg-paper rounded-t-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2 mb-2">
          <AgeBadge birth={birth} at={takenAt} tone="grass" />
          <span className="text-ink-faint text-sm">{formatDateTr(takenAt)}{video.durationSec != null && ` · ${formatDuration(video.durationSec)}`}{video.addedBy && ` · ${video.addedBy} ekledi`}</span>
        </div>
        {readOnly ? (
          video.caption && <p className="font-hand text-xl">{video.caption}</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <input className="field font-hand text-lg flex-1" placeholder="Bir not ekle..." value={caption} aria-label="Video notu"
              onChange={(e) => setCaption(e.target.value)} onBlur={() => caption !== (video.caption ?? "") && save()} />
            <input className="field sm:w-44" type="date" max={todayStr()} value={takenAt} aria-label="Çekim tarihi"
              onChange={(e) => setTakenAt(e.target.value)} onBlur={() => takenAt !== video.takenAt && save()} />
            <div className="flex gap-1 shrink-0">
              <button onClick={makePoster} disabled={busy} className="btn btn-soft h-11 min-h-0 px-3"
                aria-label="Şu an görünen kareyi kapak yap" title="Şu an görünen kareyi kapak yap">
                <Camera size={18} /> <span className="hidden sm:inline text-sm">Kapak yap</span>
              </button>
              <button onClick={remove} disabled={busy} className="btn btn-soft h-11 w-11 min-h-0 p-0 text-ink-faint hover:text-crayon" aria-label="Sil"><Trash2 size={20} /></button>
            </div>
          </div>
        )}
        {posterMsg && <p className="text-sm text-ink-soft mt-2">{posterMsg}</p>}
      </div>
    </div>,
    document.body,
  );
}

export function VideoGrid({ videos, birth, readOnly = false }: { videos: VideoDTO[]; birth: string; readOnly?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const current = videos.find((v) => v.id === open);

  if (videos.length === 0) {
    return <EmptyState title="Henüz video yok" hint="İlk videoyu yukarıdaki düğmeden yükle. Büyük dosyaları Wi-Fi'deyken göndermek daha rahat." />;
  }

  const groups: { month: string; items: VideoDTO[] }[] = [];
  for (const v of videos) {
    const m = v.takenAt.slice(0, 7);
    const g = groups[groups.length - 1];
    if (g && g.month === m) g.items.push(v);
    else groups.push({ month: m, items: [v] });
  }

  return (
    <div>
      {groups.map((g) => (
        <section key={g.month} className="mb-8">
          <h2 className="text-lg text-ink-soft mb-4 px-1">{monthLabelTr(`${g.month}-01`)}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {g.items.map((v, k) => (
              <div key={v.id} className={k % 3 === 1 ? "tilt-r" : "tilt-l"}>
                <VideoCard video={v} birth={birth} onOpen={() => setOpen(v.id)} />
              </div>
            ))}
          </div>
        </section>
      ))}
      {current && <VideoPlayer key={current.id} video={current} birth={birth} onClose={() => setOpen(null)} readOnly={readOnly} />}
    </div>
  );
}
