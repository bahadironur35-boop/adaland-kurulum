"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronLeft, ChevronRight, Pause, Play, Heart, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { ageLabel } from "@/lib/dates";
import { formatDateTr } from "@/lib/dates";
import type { SlaytKare } from "@/lib/slayt";

/** Fotograf 4,2 sn; soz, uzunluguna gore 4,2-9 sn arasi — okumaya yetecek kadar. */
function sureMs(kare: SlaytKare): number {
  if (kare.kind === "photo") return 4200;
  return Math.min(9000, Math.max(4200, 2200 + kare.saying.text.length * 55));
}

/** Soz kartlari icin donen sicak renkler — SayingBubble'daki cesitlilik hissi. */
const SOZ_RENKLERI = ["bg-crayon-soft", "bg-sun-soft", "bg-grass-soft", "bg-grape-soft"] as const;

type Asama = "kapak" | "oynatiliyor" | "bitti";

export function Slaytgosterisi({ kareler, birth, siteName, childName }: {
  kareler: SlaytKare[];
  birth: string;
  siteName: string;
  childName: string;
}) {
  const router = useRouter();
  const [asama, setAsama] = useState<Asama>("kapak");
  const [i, setI] = useState(0);
  const [duraklatildi, setDuraklatildi] = useState(false);
  const azaltilmisHareket = useAzaltilmisHareket();

  const fotoSayisi = kareler.filter((k) => k.kind === "photo").length;
  const sozSayisi = kareler.length - fotoSayisi;

  function baslat() {
    // Hareket hassasiyeti olan biri icin otomatik oynatma acilmasin; elle ilerletir.
    setDuraklatildi(azaltilmisHareket);
    setI(0);
    setAsama("oynatiliyor");
  }
  function ileri() {
    setI((n) => {
      if (n >= kareler.length - 1) { setAsama("bitti"); return n; }
      return n + 1;
    });
  }
  function geri() { setI((n) => Math.max(0, n - 1)); }
  function cik() { router.push("/"); }

  useAutoIlerle(asama === "oynatiliyor" && !duraklatildi, sureMs(kareler[i]), ileri, [i, asama, duraklatildi]);

  useEffect(() => {
    if (asama !== "oynatiliyor") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") cik();
      else if (e.key === "ArrowRight") ileri();
      else if (e.key === "ArrowLeft") geri();
      else if (e.key === " ") { e.preventDefault(); setDuraklatildi((d) => !d); }
    }
    document.addEventListener("keydown", onKey);
    const onceki = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = onceki; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asama]);

  if (asama === "kapak") {
    return (
      <div className="fixed inset-0 z-40 bg-sky flex flex-col items-center justify-center p-6 text-center">
        <Heart className="text-crayon mb-4" size={36} fill="currentColor" />
        <h1 className="text-3xl font-bold">{childName}&apos;in anıları</h1>
        <p className="font-hand text-xl text-ink-soft mt-2">
          {fotoSayisi > 0 && `${fotoSayisi} fotoğraf`}{fotoSayisi > 0 && sozSayisi > 0 && ", "}{sozSayisi > 0 && `${sozSayisi} söz`}
        </p>
        <button onClick={baslat} className="btn btn-primary mt-8 px-8">İzlemeye başla</button>
        <button onClick={() => router.push("/")} className="btn btn-ghost mt-2 text-ink-faint">Vazgeç</button>
      </div>
    );
  }

  if (asama === "bitti") {
    return (
      <div className="fixed inset-0 z-40 bg-sky flex flex-col items-center justify-center p-6 text-center">
        <p className="text-5xl mb-3" aria-hidden>🎉</p>
        <h1 className="text-2xl font-bold">Bu kadar!</h1>
        <p className="font-hand text-lg text-ink-soft mt-1">{siteName} büyümeye devam ediyor.</p>
        <div className="flex gap-2 mt-6">
          <button onClick={baslat} className="btn btn-soft"><RotateCcw size={17} /> Yeniden izle</button>
          <button onClick={cik} className="btn btn-primary">Kapat</button>
        </div>
      </div>
    );
  }

  const kare = kareler[i];

  return (
    <div className="fixed inset-0 z-40 bg-ink flex flex-col" role="dialog" aria-modal="true" aria-label="Slayt gösterisi">
      {/* Ust cubuk: ilerleme segmentleri + kapat */}
      <div className="flex items-center gap-3 p-3 pt-[max(.75rem,env(safe-area-inset-top))]">
        <div className="flex-1 flex gap-1">
          {kareler.map((_, k) => (
            <div key={k} className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden">
              <div
                className={clsx("h-full bg-white rounded-full", k === i && !azaltilmisHareket && "slayt-dolum")}
                style={
                  k < i ? { width: "100%" }
                  : k > i ? { width: "0%" }
                  : azaltilmisHareket ? { width: duraklatildi ? "0%" : "100%" }
                  : { animationDuration: `${sureMs(kare)}ms`, animationPlayState: duraklatildi ? "paused" : "running" }
                }
              />
            </div>
          ))}
        </div>
        <button onClick={cik} className="btn btn-ghost text-white h-9 w-9 min-h-0 p-0 shrink-0" aria-label="Kapat"><X size={20} /></button>
      </div>

      {/* Ana kare */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2">
        {i > 0 && (
          <button onClick={geri} className="absolute left-2 z-10 btn btn-ghost text-white h-11 w-11 min-h-0 p-0" aria-label="Önceki">
            <ChevronLeft size={26} />
          </button>
        )}
        {kare.kind === "photo" ? (
          <figure className="w-full h-full flex flex-col items-center justify-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={kare.photo.id} src={kare.photo.url} alt={kare.photo.caption ?? ""} className="max-h-[80%] max-w-full object-contain rounded-md" />
            <figcaption className="text-center px-8">
              <span className="sticker inline-block px-2.5 py-1 text-[13px] font-bold mb-1.5">{ageLabel(birth, kare.photo.takenAt)}</span>
              {kare.photo.caption && <p className="font-hand text-xl text-white">{kare.photo.caption}</p>}
            </figcaption>
          </figure>
        ) : (
          <div key={kare.saying.id} className={clsx("w-full h-full flex flex-col items-center justify-center gap-4 px-10 text-center", SOZ_RENKLERI[i % SOZ_RENKLERI.length])}>
            {kare.saying.isFavorite && <Heart className="text-crayon" size={22} fill="currentColor" />}
            <p className="font-hand text-3xl sm:text-4xl leading-snug max-w-xl">&ldquo;{kare.saying.text}&rdquo;</p>
            <span className="sticker inline-block px-2.5 py-1 text-[13px] font-bold">{ageLabel(birth, kare.saying.saidAt)}</span>
            <span className="text-ink-soft text-sm">{formatDateTr(kare.saying.saidAt)}</span>
          </div>
        )}
        {/* Son karede de bir cikis yolu olsun: sag ok "Sonraki" yerine "Bitir"e
            doner. Yoksa duraklatmis kullanici sureyi bekletmekten baska sansi
            olmayan bir kosede kalirdi. */}
        <button
          onClick={ileri}
          className="absolute right-2 z-10 btn btn-ghost text-white h-11 w-11 min-h-0 p-0"
          aria-label={i < kareler.length - 1 ? "Sonraki" : "Bitir"}
        >
          <ChevronRight size={26} />
        </button>
      </div>

      {/* Alt cubuk: duraklat/oynat */}
      <div className="flex items-center justify-center p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
        <button onClick={() => setDuraklatildi((d) => !d)} className="btn btn-ghost text-white h-10 px-4 gap-2" aria-pressed={duraklatildi}>
          {duraklatildi ? <Play size={17} /> : <Pause size={17} />} {duraklatildi ? "Oynat" : "Duraklat"}
        </button>
      </div>
    </div>
  );
}

function hareketAboneOl(bildir: () => void) {
  const m = window.matchMedia("(prefers-reduced-motion: reduce)");
  m.addEventListener("change", bildir);
  return () => m.removeEventListener("change", bildir);
}
function hareketOku(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function useAzaltilmisHareket(): boolean {
  return useSyncExternalStore(hareketAboneOl, hareketOku, () => false);
}

/** Belirtilen surede bir kez ilerle; bagimliliklardan biri degisince zamanlayici sifirlanir. */
function useAutoIlerle(aktif: boolean, ms: number, ilerle: () => void, deps: readonly unknown[]) {
  const ilerleRef = useRef(ilerle);
  // Render sirasinda ref'e YAZMA: her render sonrasi calisan bagimliliksiz
  // bir effect ile guncel tutuluyor (bkz. react-hooks/refs).
  useEffect(() => { ilerleRef.current = ilerle; });
  useEffect(() => {
    if (!aktif) return;
    const t = setTimeout(() => ilerleRef.current(), ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktif, ms, ...deps]);
}
