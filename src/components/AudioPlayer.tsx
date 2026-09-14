"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import clsx from "clsx";
import { formatDuration } from "@/lib/dates";

/** Kucuk, yuvarlak oynatici: cocugun sesi icin. Native kontroller yerine tek dugme + cubuk. */
export function AudioPlayer({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState<number | null>(null);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onTime = () => setT(a.currentTime);
    const onMeta = () => setDur(Number.isFinite(a.duration) ? a.duration : null);
    const onEnd = () => { setPlaying(false); setT(0); };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("ended", onEnd);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, [src]);

  function toggle() {
    const a = ref.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setPlaying(false));
    else a.pause();
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const a = ref.current;
    if (!a || !dur) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - r.left) / r.width) * dur;
  }

  const pct = dur ? Math.min(100, (t / dur) * 100) : 0;

  return (
    <div className={clsx("flex items-center gap-3 rounded-full bg-sun-soft px-2 py-1.5", className)}>
      <audio ref={ref} src={src} preload="metadata" />
      <button type="button" onClick={toggle} aria-label={playing ? "Duraklat" : "Dinle"}
        className="btn btn-primary h-10 w-10 min-h-0 p-0 shrink-0">
        {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
      </button>
      <div className="flex-1 h-2.5 rounded-full bg-paper cursor-pointer relative" onClick={seek} role="progressbar" aria-valuenow={Math.round(pct)}>
        <div className="absolute inset-y-0 left-0 rounded-full bg-crayon" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-display text-sm text-ink-soft tabular-nums pr-1.5 min-w-[2.5rem] text-right">
        {playing ? formatDuration(t) : formatDuration(dur ?? 0)}
      </span>
    </div>
  );
}
