"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, confetti } from "@/lib/client";
import { todayStr } from "@/lib/dates";
import { uploadPrivate } from "@/lib/upload";
import type { RecordingDTO } from "@/lib/types";
import { AudioRecorder, audioExt, type AudioDraft } from "./AudioRecorder";

const SUGGESTIONS = ["Şarkı söylüyor", "Masal anlatıyor", "Kahkaha", "Sayı sayıyor", "İyi geceler diyor", "Alfabe"];

/** Yeni ses: baslik + tarih + kayit (mikrofon ya da dosya). Duzenlemede sadece metinler. */
export function RecordingForm({ initial, onDone }: { initial?: RecordingDTO; onDone: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [recordedAt, setRecordedAt] = useState(initial?.recordedAt ?? todayStr());
  const [note, setNote] = useState(initial?.note ?? "");
  const [audio, setAudio] = useState<AudioDraft>({ kind: initial ? "keep" : "remove" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<false | "ses" | "kayıt">(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (initial) {
        setBusy("kayıt");
        await api(`/api/sesler/${initial.id}`, { method: "PATCH", json: { title, recordedAt, note: note.trim() || null } });
      } else {
        if (audio.kind !== "new") { setError("Önce bir ses kaydet ya da dosya seç."); return; }
        setBusy("ses");
        const path = `audio/${recordedAt.slice(0, 4)}/rec-${crypto.randomUUID()}.${audioExt(audio.mime)}`;
        const res = await uploadPrivate(path, audio.blob, audio.mime);
        const durationSec = await probeDuration(audio.blob).catch(() => null);
        setBusy("kayıt");
        await api("/api/sesler", { method: "POST", json: { title, recordedAt, note: note.trim() || null, path: res.pathname, mime: audio.mime, durationSec, sizeBytes: audio.blob.size } });
        confetti();
      }
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="r-title">Ne var bu seste?</label>
        <input id="r-title" className="field font-display text-lg" required maxLength={120} autoFocus placeholder="Şarkı söylüyor" value={title} onChange={(e) => setTitle(e.target.value)} />
        {!initial && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setTitle(s)} className="rounded-full px-2.5 py-1 text-xs font-semibold border-2 border-line text-ink-soft hover:border-grape">{s}</button>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className="label" htmlFor="r-date">Ne zaman</label>
        <input id="r-date" className="field" type="date" required max={todayStr()} value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="r-note">Not <span className="font-normal text-ink-faint">(isteğe bağlı)</span></label>
        <input id="r-note" className="field" maxLength={500} placeholder="Banyoda, uykudan önce..." value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {!initial && <AudioRecorder existingUrl={null} draft={audio} onChange={setAudio} />}
      {error && <p role="alert" className="text-crayon text-sm font-semibold">{error}</p>}
      <button className="btn btn-primary w-full" disabled={!!busy || !title.trim()} type="submit">
        {busy === "ses" ? "Ses yükleniyor…" : busy ? <span className="dots"><span /><span /><span /></span> : initial ? "Kaydet" : "Sesi sakla"}
      </button>
    </form>
  );
}

function probeDuration(blob: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const a = document.createElement("audio");
    const url = URL.createObjectURL(blob);
    a.preload = "metadata";
    a.onloadedmetadata = () => { const d = a.duration; URL.revokeObjectURL(url); resolve(Number.isFinite(d) ? Math.round(d) : null); };
    a.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    setTimeout(() => resolve(null), 4000);
    a.src = url;
  });
}
