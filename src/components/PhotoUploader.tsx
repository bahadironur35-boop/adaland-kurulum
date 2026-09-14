"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { confetti } from "@/lib/client";
import { uploadPhoto } from "@/lib/media-client";

type Job = { name: string; status: "hazırlanıyor" | "yükleniyor" | "tamam" | "hata"; error?: string };

export function PhotoUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);

  function patch(i: number, p: Partial<Job>) {
    setJobs((js) => js.map((j, k) => (k === i ? { ...j, ...p } : j)));
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setJobs(list.map((f) => ({ name: f.name, status: "hazırlanıyor" })));
    setBusy(true);
    let okCount = 0;
    for (let i = 0; i < list.length; i++) {
      try {
        patch(i, { status: "yükleniyor" });
        await uploadPhoto(list[i]);
        patch(i, { status: "tamam" });
        okCount++;
      } catch (err) {
        patch(i, { status: "hata", error: err instanceof Error ? err.message : "Yüklenemedi" });
      }
    }
    setBusy(false);
    if (okCount > 0) {
      confetti();
      router.refresh();
      setTimeout(() => setJobs((js) => js.filter((j) => j.status === "hata")), 1500);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
      <button className="btn btn-primary" onClick={() => inputRef.current?.click()} disabled={busy}>
        <ImagePlus size={20} strokeWidth={2.4} /> {busy ? "Yükleniyor" : "Fotoğraf ekle"}
      </button>
      {jobs.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {jobs.map((j, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className={j.status === "hata" ? "text-crayon" : j.status === "tamam" ? "text-grass" : "text-ink-soft"}>
                {j.status === "tamam" ? "✓" : j.status === "hata" ? "✕" : "…"}
              </span>
              <span className="truncate">{j.name}</span>
              <span className="text-ink-faint">{j.error ?? j.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
