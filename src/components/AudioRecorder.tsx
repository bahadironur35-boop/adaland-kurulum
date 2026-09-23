"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Square, Upload, X } from "lucide-react";
import { AudioPlayer } from "./AudioPlayer";
import { useBrand } from "@/lib/brand-client";

export type AudioDraft =
  | { kind: "keep" }
  | { kind: "remove" }
  | { kind: "new"; blob: Blob; mime: string };

const MAX_SECONDS = 180;
const CANDIDATES = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];

export function baseMime(m: string) {
  return m.split(";")[0].trim().toLowerCase();
}
export function audioExt(mime: string) {
  const map: Record<string, string> = {
    "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/webm": "webm",
    "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav",
  };
  return map[baseMime(mime)] ?? "bin";
}

/**
 * Soz formunun ses bolumu: mikrofondan kaydet ya da dosya sec.
 * Yukleme burada yapilmaz; form kaydederken draft'i alir ve Blob'a yollar.
 */
export function AudioRecorder({ existingUrl, draft, onChange }: {
  existingUrl: string | null;
  draft: AudioDraft;
  onChange: (d: AudioDraft) => void;
}) {
  const b = useBrand();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Yeni kaydin onizleme URL'i; draft degisince eskisi serbest birakilir
  const previewUrl = useMemo(() => (draft.kind === "new" ? URL.createObjectURL(draft.blob) : null), [draft]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); recRef.current?.stream.getTracks().forEach((t) => t.stop()); }, []);

  async function start() {
    setError(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Bu tarayıcı ses kaydını desteklemiyor; dosya seçebilirsin.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      rec.onstop = () => {
        const type = rec.mimeType || mime || "audio/webm";
        const blob = new Blob(chunks.current, { type });
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        if (timer.current) window.clearInterval(timer.current);
        if (blob.size > 0) onChange({ kind: "new", blob, mime: baseMime(type) });
      };
      rec.start(250);
      recRef.current = rec;
      setRecording(true);
      setSeconds(0);
      timer.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS && rec.state === "recording") rec.stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("Mikrofona erişilemedi. Tarayıcı izinlerini kontrol et.");
    }
  }

  function stop() {
    const r = recRef.current;
    if (r && r.state === "recording") r.stop();
  }

  function pickFile(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("audio/")) { setError("Ses dosyası seç (m4a, mp3, webm...)."); return; }
    onChange({ kind: "new", blob: f, mime: baseMime(f.type) });
  }

  const hasExisting = draft.kind === "keep" && !!existingUrl;

  return (
    <div>
      <span className="label">{b.adIlgi} sesi <span className="font-normal text-ink-faint">(isteğe bağlı)</span></span>

      {draft.kind === "new" && previewUrl && (
        <div className="flex items-center gap-2">
          <AudioPlayer src={previewUrl} className="flex-1" />
          <button type="button" onClick={() => onChange(existingUrl ? { kind: "keep" } : { kind: "remove" })} className="btn btn-ghost h-10 w-10 min-h-0 p-0" aria-label="Kaydı at"><X size={18} /></button>
        </div>
      )}

      {hasExisting && (
        <div className="flex items-center gap-2">
          <AudioPlayer src={existingUrl!} className="flex-1" />
          <button type="button" onClick={() => onChange({ kind: "remove" })} className="btn btn-ghost h-10 w-10 min-h-0 p-0" aria-label="Sesi kaldır"><X size={18} /></button>
        </div>
      )}

      {draft.kind !== "new" && !hasExisting && (
        <div className="flex flex-wrap gap-2 items-center">
          {recording ? (
            <button type="button" onClick={stop} className="btn btn-primary">
              <Square size={16} fill="currentColor" /> Durdur · {seconds}s
            </button>
          ) : (
            <button type="button" onClick={start} className="btn btn-soft">
              <Mic size={18} /> Kaydet
            </button>
          )}
          <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-soft" disabled={recording}>
            <Upload size={18} /> Dosya seç
          </button>
          <input ref={fileRef} type="file" accept="audio/*" hidden onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
          {draft.kind === "remove" && existingUrl && (
            <button type="button" onClick={() => onChange({ kind: "keep" })} className="btn btn-ghost text-sm">Eski sesi geri al</button>
          )}
        </div>
      )}
      {recording && <p className="text-ink-soft text-sm mt-2 flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-crayon animate-pulse" /> Kaydediyor, en fazla 3 dakika.</p>}
      {error && <p role="alert" className="text-crayon text-sm font-semibold mt-2">{error}</p>}
    </div>
  );
}
