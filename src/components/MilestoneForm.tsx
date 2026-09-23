"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { api, confetti } from "@/lib/client";
import { todayStr } from "@/lib/dates";
import type { MilestoneDTO, PhotoDTO } from "@/lib/types";

const SUGGESTIONS = ["İlk adım", "İlk diş", "İlk kelime", "İlk saç kesimi", "İlk okul günü", "İlk bisiklet", "İlk deniz", "İlk uçak"];

export function MilestoneForm({ initial, onDone }: { initial?: MilestoneDTO; onDone: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? todayStr());
  const [note, setNote] = useState(initial?.note ?? "");
  const [photoId, setPhotoId] = useState<string | null>(initial?.photoId ?? null);
  const [photos, setPhotos] = useState<PhotoDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Fotograf secici: son 60 fotografi getir (aile olcegi, sayfalama gereksiz)
  useEffect(() => {
    let alive = true;
    api<{ photos: PhotoDTO[] }>("/api/fotograflar")
      .then((r) => alive && setPhotos(r.photos.slice(0, 60)))
      .catch(() => alive && setPhotos([]));
    return () => { alive = false; };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = { title, date, note: note.trim() || null, photoId };
      if (initial) await api(`/api/ilkler/${initial.id}`, { method: "PATCH", json: body });
      else {
        await api("/api/ilkler", { method: "POST", json: body });
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
        <label className="label" htmlFor="m-title">Ne oldu?</label>
        <input id="m-title" className="field font-display text-lg" required maxLength={120} autoFocus placeholder="İlk adım"
          value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => setTitle(s)}
              className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold border-2", title === s ? "border-grape bg-grape-soft text-grape" : "border-line text-ink-soft hover:border-grape")}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="m-date">Ne zaman</label>
        <input id="m-date" className="field" type="date" required max={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="m-note">Not <span className="font-normal text-ink-faint">(isteğe bağlı)</span></label>
        <textarea id="m-note" className="field font-hand text-lg" rows={2} maxLength={1000} placeholder="Nasıl oldu, kim vardı, ne dedi..."
          value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div>
        <span className="label">Fotoğraf <span className="font-normal text-ink-faint">(isteğe bağlı)</span></span>
        {photos === null ? (
          <p className="text-ink-faint text-sm">Fotoğraflar yükleniyor…</p>
        ) : photos.length === 0 ? (
          <p className="text-ink-faint text-sm">Henüz fotoğraf yok. Önce Fotoğraflar sayfasından yükle, sonra buradan seç.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" role="radiogroup" aria-label="Fotoğraf seç">
            <button type="button" role="radio" aria-checked={photoId === null} onClick={() => setPhotoId(null)}
              className={clsx("shrink-0 w-16 h-16 rounded-lg border-2 text-xs font-semibold text-ink-soft grid place-items-center", photoId === null ? "border-grape bg-grape-soft" : "border-line bg-paper")}>
              Yok
            </button>
            {photos.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={photoId === p.id} onClick={() => setPhotoId(p.id)}
                className={clsx("shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2", photoId === p.id ? "border-grape ring-2 ring-grape" : "border-line")}
                aria-label={p.caption ?? p.takenAt}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumbUrl} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p role="alert" className="text-crayon text-sm font-semibold">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy || !title.trim()} type="submit">
        {busy ? <span className="dots"><span /><span /><span /></span> : initial ? "Kaydet" : "İlki sakla"}
      </button>
    </form>
  );
}
