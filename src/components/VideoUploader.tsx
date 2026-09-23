"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Shrink, FileVideo } from "lucide-react";
import clsx from "clsx";
import { confetti } from "@/lib/client";
import { uploadVideo } from "@/lib/media-client";
import { LARGE_UPLOAD_BYTES, MAX_VIDEO_BYTES, mb } from "@/lib/limits";

type Phase = "hazırlanıyor" | "küçültülüyor" | "yükleniyor" | "tamam" | "hata";
type Job = { name: string; status: Phase; error?: string; pct?: number; saved?: string };

function short(bytes: number) {
  return bytes >= 1024 * 1024 * 1024
    ? `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
    : `${Math.round(bytes / 1024 / 1024)} MB`;
}

export function VideoUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);
  const [heavy, setHeavy] = useState(0);
  const [mode, setMode] = useState<"compress" | "original">("compress");

  function patch(i: number, p: Partial<Job>) {
    setJobs((js) => js.map((j, k) => (k === i ? { ...j, ...p } : j)));
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setJobs(list.map((f) => ({ name: f.name, status: "hazırlanıyor" as Phase })));
    setBusy(true);
    setHeavy(list.some((f) => f.size > LARGE_UPLOAD_BYTES) ? list.reduce((a, f) => a + f.size, 0) : 0);
    let okCount = 0;

    for (let i = 0; i < list.length; i++) {
      try {
        await uploadVideo(
          list[i],
          {
            onShrink: (pct) => patch(i, { status: "küçültülüyor", pct }),
            onUpload: (pct) => patch(i, { status: "yükleniyor", pct }),
            onShrunk: (from, to) => patch(i, { saved: `${short(from)} → ${short(to)}` }),
          },
          mode,
        );
        patch(i, { status: "tamam", pct: 100 });
        okCount++;
      } catch (err) {
        patch(i, { status: "hata", error: err instanceof Error ? err.message : "Yüklenemedi" });
      }
    }

    setBusy(false);
    setHeavy(0);
    if (okCount > 0) {
      confetti();
      router.refresh();
      setTimeout(() => setJobs((js) => js.filter((j) => j.status === "hata")), 2500);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="video/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />

      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary" onClick={() => inputRef.current?.click()} disabled={busy}>
          <Clapperboard size={20} strokeWidth={2.4} /> {busy ? "Yükleniyor" : "Video ekle"}
        </button>
        <div className="inline-flex rounded-full bg-sky p-1 gap-1" role="radiogroup" aria-label="Yükleme boyutu">
          {([["compress", "Küçült", Shrink], ["original", "Orijinal", FileVideo]] as const).map(([v, label, Icon]) => (
            <button key={v} role="radio" aria-checked={mode === v} disabled={busy} onClick={() => setMode(v)}
              className={clsx("btn h-9 min-h-0 px-3 text-sm", mode === v ? "btn-soft" : "btn-ghost")}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-ink-faint text-xs mt-2">
        {mode === "compress"
          ? `Videolar 720p'ye küçültülüp yüklenir (en fazla ${mb(MAX_VIDEO_BYTES)}). Telefondaki orijinale dokunulmaz.`
          : `Dosya olduğu gibi yüklenir; ${mb(MAX_VIDEO_BYTES)}'ı geçemez ve depoda çok daha fazla yer kaplar.`}
      </p>

      {heavy > 0 && busy && (
        <p className="text-ink-soft text-sm mt-2">
          Toplam {mb(heavy)} işleniyor. Bu bir süre alabilir. Sayfayı kapatma.
        </p>
      )}

      {jobs.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {jobs.map((j, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className={j.status === "hata" ? "text-crayon" : j.status === "tamam" ? "text-grass" : "text-ink-soft"}>
                {j.status === "tamam" ? "✓" : j.status === "hata" ? "✕" : "…"}
              </span>
              <span className="truncate">{j.name}</span>
              <span className="text-ink-faint shrink-0">
                {j.error ??
                  (j.status === "tamam" && j.saved
                    ? j.saved
                    : j.status === "küçültülüyor" || j.status === "yükleniyor"
                      ? `${j.status} %${j.pct ?? 0}`
                      : j.status)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
