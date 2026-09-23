"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import clsx from "clsx";
import type { PhotoDTO, VideoDTO } from "@/lib/types";
import { formatDateTr, formatDuration } from "@/lib/dates";
import { usePhotoLayout, type PhotoLayout } from "@/lib/photo-layout";
import { AgeBadge } from "./AgeBadge";
import { Lightbox } from "./PhotoGrid";
import { VideoPlayer } from "./VideoGrid";

export type DayItem = { kind: "photo"; photo: PhotoDTO } | { kind: "video"; video: VideoDTO };

/** Yelpaze ve destede en fazla bu kadar kare durur; gerisi "+N" cikartmasina doner. */
const FAN_MAX = 3;

/**
 * Yelpaze: hepsi gorunur, sadece kenarlari birbirine biner, ortadaki en ustte.
 * Deste: ust uste yigilir, sadece en ondeki tam gorunur.
 */
function cardStyle(layout: PhotoLayout, i: number, n: number): React.CSSProperties {
  if (layout === "deck") {
    const back = n - 1 - i; // 0 = en onde
    // Ondeki kart akista durur ve kabin yuksekligini o belirler; arkadakiler
    // ustune bindirilir. Ondekine genislik verilmezse butona sigar ve buzusur.
    const front = i === n - 1;
    return {
      position: front ? "relative" : "absolute",
      inset: front ? undefined : 0,
      width: "100%",
      transform: `rotate(${(back % 2 ? 1 : -1) * (back * 2.5 + 1)}deg) translate(${back * -5}px, ${back * 3}px)`,
      zIndex: i + 1,
    };
  }
  if (n === 1) return { width: "58%", transform: "rotate(-1.2deg)", zIndex: 1 };
  const offset = i - (n - 1) / 2;
  return {
    width: n === 2 ? "46%" : "37%",
    marginLeft: i === 0 ? 0 : "-5%",
    transform: `rotate(${(offset * 7).toFixed(1)}deg) translateY(${Math.abs(offset) * 6}px)`,
    zIndex: n - Math.round(Math.abs(offset) * 2),
  };
}

function FanCard({ item, extra }: { item: DayItem; extra: number }) {
  const src = item.kind === "photo" ? item.photo.thumbUrl : item.video.posterUrl;
  return (
    <span className="polaroid block relative p-1 pb-1.5">
      <span className="block relative aspect-square rounded-sm overflow-hidden bg-sky-deep">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <span className="block w-full h-full bg-gradient-to-br from-grape to-ink" />
        )}
        {item.kind === "video" && (
          <>
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid place-items-center rounded-full bg-paper/90 text-crayon shadow-lift w-9 h-9">
                <Play size={16} fill="currentColor" className="ml-0.5" />
              </span>
            </span>
            {item.video.durationSec != null && (
              <span className="absolute bottom-1 right-1 rounded bg-ink/80 text-white text-[10px] font-display px-1">
                {formatDuration(item.video.durationSec)}
              </span>
            )}
          </>
        )}
      </span>
      {extra > 0 && (
        <span className="sticker absolute -top-2 -right-2 px-2 py-0.5 text-xs font-bold">+{extra}</span>
      )}
    </span>
  );
}

/**
 * Akista bir gunun fotograf ve videolari: tek grup, tek tarih satiri, tek yas cikartmasi.
 * Yerlesim Ayarlar > Akista fotograflar'dan secilir. Dokununca buyuk gorunum acilir.
 */
export function DayMedia({ items, date, birth, readOnly = false }: {
  items: DayItem[];
  date: string;
  birth: string;
  readOnly?: boolean;
}) {
  const layout = usePhotoLayout();
  const [openPhoto, setOpenPhoto] = useState<number | null>(null);
  const [openVideo, setOpenVideo] = useState<string | null>(null);

  const photos = items.filter((i): i is Extract<DayItem, { kind: "photo" }> => i.kind === "photo").map((i) => i.photo);
  const shown = layout === "grid" ? items : items.slice(0, FAN_MAX);
  const extra = items.length - shown.length;
  const currentVideo = items.find((i) => i.kind === "video" && i.video.id === openVideo);

  function open(item: DayItem) {
    if (item.kind === "video") setOpenVideo(item.video.id);
    else setOpenPhoto(Math.max(0, photos.findIndex((p) => p.id === item.photo.id)));
  }

  const single = items.length === 1 ? items[0] : null;
  const caption = single
    ? (single.kind === "photo" ? single.photo.caption : single.video.caption)
    : null;

  const cards = shown.map((item, i) => {
    const id = item.kind === "photo" ? item.photo.id : item.video.id;
    const label = item.kind === "photo"
      ? (item.photo.caption ?? `Fotoğraf, ${formatDateTr(date)}`)
      : (item.video.caption ?? `Video, ${formatDateTr(date)}`);
    return (
      <button key={id} onClick={() => open(item)} aria-label={label}
        style={layout === "grid" ? undefined : cardStyle(layout, i, shown.length)}
        className={clsx(
          "relative transition-transform hover:-translate-y-1 focus-visible:-translate-y-1",
          layout === "grid" ? (i % 2 ? "tilt-r" : "tilt-l") : "shrink-0",
        )}>
        <FanCard item={item} extra={i === shown.length - 1 ? extra : 0} />
      </button>
    );
  });

  return (
    <div className="relative">
      <AgeBadge birth={birth} at={date} tone="grape" className="absolute -top-2 right-1 z-10 text-[11px] px-2" />

      {layout === "grid" && <div className="grid grid-cols-3 gap-3 pt-2">{cards}</div>}
      {layout === "fan" && <div className="flex justify-center items-start pt-2">{cards}</div>}
      {layout === "deck" && (
        <div className="relative mx-auto pt-2" style={{ width: "min(60%, 13rem)" }}>{cards}</div>
      )}

      <p className="text-center mt-2">
        <span className="font-hand text-lg text-ink-soft">
          {caption ?? formatDateTr(date)}
          {items.length > 1 && <span className="text-ink-faint"> · {items.length} kare</span>}
        </span>
      </p>

      {openPhoto !== null && photos[openPhoto] && (
        <Lightbox key={photos[openPhoto].id} photos={photos} index={openPhoto} birth={birth}
          onClose={() => setOpenPhoto(null)} onIndex={setOpenPhoto} readOnly={readOnly} />
      )}
      {currentVideo?.kind === "video" && (
        <VideoPlayer key={currentVideo.video.id} video={currentVideo.video} birth={birth}
          onClose={() => setOpenVideo(null)} readOnly={readOnly} />
      )}
    </div>
  );
}
