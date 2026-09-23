"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { confetti } from "@/lib/client";
import { isImageFile, isVideoFile, uploadPhoto, uploadVideo } from "@/lib/media-client";
import { EmptyState } from "@/components/EmptyState";
import { useBrand } from "@/lib/brand-client";

const SHARE_CACHE = "adaland-share";
type Item = { file: File; kind: "photo" | "video" | "other"; status: "bekliyor" | "küçültülüyor" | "yükleniyor" | "tamam" | "hata"; pct?: number; error?: string };

/** sw.js'in Cache'e koydugu dosyalari okur, tek dugmeyle yukler. */
export function ShareReceiver() {
  const b = useBrand();
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!("caches" in window)) { if (alive) setItems([]); return; }
        const cache = await caches.open(SHARE_CACHE);
        const keys = await cache.keys();
        const out: Item[] = [];
        for (const k of [...keys].sort((a, b) => a.url.localeCompare(b.url))) {
          const res = await cache.match(k);
          if (!res) continue;
          const name = decodeURIComponent(res.headers.get("X-File-Name") ?? "dosya");
          const lastModified = Number(res.headers.get("X-Last-Modified") ?? Date.now());
          const type = res.headers.get("Content-Type") ?? "";
          const file = new File([await res.blob()], name, { type, lastModified });
          out.push({ file, kind: isVideoFile(file) ? "video" : isImageFile(file) ? "photo" : "other", status: "bekliyor" });
        }
        if (alive) setItems(out);
      } catch {
        if (alive) setItems([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  function patch(i: number, p: Partial<Item>) {
    setItems((xs) => (xs ? xs.map((x, k) => (k === i ? { ...x, ...p } : x)) : xs));
  }

  async function uploadAll() {
    if (!items) return;
    setBusy(true);
    let ok = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === "other") { patch(i, { status: "hata", error: "Desteklenmeyen dosya" }); continue; }
      try {
        patch(i, { status: "yükleniyor", pct: 0 });
        if (it.kind === "photo") await uploadPhoto(it.file);
        else await uploadVideo(it.file, { onShrink: (pct) => patch(i, { status: "küçültülüyor", pct }), onUpload: (pct) => patch(i, { status: "yükleniyor", pct }) });
        patch(i, { status: "tamam", pct: 100 });
        ok++;
      } catch (err) {
        patch(i, { status: "hata", error: err instanceof Error ? err.message : "Yüklenemedi" });
      }
    }
    setBusy(false);
    if (ok > 0) {
      confetti();
      try { const cache = await caches.open(SHARE_CACHE); for (const k of await cache.keys()) await cache.delete(k); } catch {}
    }
  }

  if (items === null) return <p className="text-ink-soft"><span className="dots"><span /><span /><span /></span></p>;
  if (items.length === 0) {
    return (
      <EmptyState title="Paylaşılan dosya yok" hint={`Android'de galeriden bir fotoğrafı seçip Paylaş → ${b.site} de; burada görünür.`}>
        <Link href="/fotograflar" className="btn btn-soft">Fotoğraflara git</Link>
      </EmptyState>
    );
  }
  const done = items.every((x) => x.status === "tamam" || x.status === "hata");

  return (
    <div>
      <ul className="space-y-2 mb-5">
        {items.map((it, i) => (
          <li key={i} className="bg-paper rounded-2xl shadow-paper p-3 flex items-center gap-3">
            <span className="text-2xl" aria-hidden>{it.kind === "video" ? "🎬" : it.kind === "photo" ? "🖼️" : "📄"}</span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{it.file.name}</div>
              <div className="text-xs text-ink-faint">{(it.file.size / 1024 / 1024).toFixed(1)} MB · {it.error ?? (it.status === "yükleniyor" ? `%${it.pct ?? 0}` : it.status)}</div>
            </div>
            <span className={it.status === "tamam" ? "text-grass" : it.status === "hata" ? "text-crayon" : "text-ink-faint"}>
              {it.status === "tamam" ? "✓" : it.status === "hata" ? "✕" : "…"}
            </span>
          </li>
        ))}
      </ul>
      {done ? (
        <div className="flex gap-2">
          <Link href="/fotograflar" className="btn btn-primary">Fotoğraflara git</Link>
          <Link href="/videolar" className="btn btn-soft">Videolara git</Link>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={uploadAll} disabled={busy}>
          <Upload size={18} /> {busy ? "Yükleniyor" : `${items.length} dosyayı ${b.siteYonelme} ekle`}
        </button>
      )}
    </div>
  );
}
