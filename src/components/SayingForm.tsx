"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadPrivate } from "@/lib/upload";
import { Heart } from "lucide-react";
import clsx from "clsx";
import { api, confetti } from "@/lib/client";
import { todayStr } from "@/lib/dates";
import type { SayingDTO } from "@/lib/types";
import { AudioRecorder, audioExt, type AudioDraft } from "./AudioRecorder";
import { useBrand } from "@/lib/brand-client";

export function SayingForm({ initial, onDone }: { initial?: SayingDTO; onDone: () => void }) {
  const b = useBrand();
  const router = useRouter();
  const [text, setText] = useState(initial?.text ?? "");
  const [saidAt, setSaidAt] = useState(initial?.saidAt ?? todayStr());
  const [context, setContext] = useState(initial?.context ?? "");
  const [isFavorite, setFav] = useState(initial?.isFavorite ?? false);
  const [audio, setAudio] = useState<AudioDraft>({ kind: "keep" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<false | "ses" | "kayıt">(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const body: Record<string, unknown> = { text, saidAt, context: context.trim() || null, isFavorite };

      if (audio.kind === "new") {
        setBusy("ses");
        const path = `audio/${saidAt.slice(0, 4)}/${crypto.randomUUID()}.${audioExt(audio.mime)}`;
        const res = await uploadPrivate(path, audio.blob, audio.mime);
        body.audioPath = res.pathname;
        body.audioMime = audio.mime;
      } else if (audio.kind === "remove") {
        body.audioPath = null;
        body.audioMime = null;
      }

      setBusy("kayıt");
      if (initial) await api(`/api/sozler/${initial.id}`, { method: "PATCH", json: body });
      else {
        await api("/api/sozler", { method: "POST", json: body });
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
        <label className="label" htmlFor="s-text">{b.ad} ne dedi?</label>
        <textarea id="s-text" className="field font-hand text-xl leading-snug" rows={3} autoFocus required maxLength={1000}
          placeholder="“Anne, ay bizi takip ediyor!”" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
        <div>
          <label className="label" htmlFor="s-date">Ne zaman</label>
          <input id="s-date" className="field" type="date" required max={todayStr()} value={saidAt} onChange={(e) => setSaidAt(e.target.value)} />
        </div>
        <button type="button" onClick={() => setFav((f) => !f)} aria-pressed={isFavorite}
          className={clsx("btn h-11 w-11 min-h-0 p-0", isFavorite ? "bg-crayon-soft text-crayon" : "btn-soft text-ink-faint")}
          aria-label={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}>
          <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div>
        <label className="label" htmlFor="s-ctx">Nerede, nasıl oldu? <span className="font-normal text-ink-faint">(isteğe bağlı)</span></label>
        <input id="s-ctx" className="field" maxLength={500} placeholder="Arabada, akşam yemeğinde, uykudan önce..."
          value={context} onChange={(e) => setContext(e.target.value)} />
      </div>
      <AudioRecorder existingUrl={initial?.audioUrl ?? null} draft={audio} onChange={setAudio} />
      {error && <p role="alert" className="text-crayon text-sm font-semibold">{error}</p>}
      <button className="btn btn-primary w-full" disabled={!!busy || !text.trim()} type="submit">
        {busy === "ses" ? "Ses yükleniyor…" : busy ? <span className="dots"><span /><span /><span /></span> : initial ? "Kaydet" : "Sözü sakla"}
      </button>
    </form>
  );
}
