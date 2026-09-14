"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import type { FeedItem, MilestoneDTO, PhotoDTO, RecordingDTO, SayingDTO, VideoDTO } from "@/lib/types";
import { RecordingCard } from "./RecordingCard";
import { monthLabelTr } from "@/lib/dates";
import { SayingBubble } from "./SayingBubble";
import { MilestoneCard } from "./MilestoneCard";
import { DayMedia, type DayItem } from "./DayMedia";
import { EmptyState } from "./EmptyState";

type Filter = "all" | "saying" | "photo" | "video" | "milestone" | "recording";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Hepsi" },
  { key: "saying", label: "Sözler" },
  { key: "photo", label: "Fotoğraflar" },
  { key: "video", label: "Videolar" },
  { key: "milestone", label: "İlkler" },
  { key: "recording", label: "Sesler" },
];

/** Akraba gorunumu: her sey salt-okunur, duzenleme dugmesi yok, yazma ucu cagrilmaz. */
export function ShareFeed({ birth, sayings, photos, videos, milestones, recordings = [] }: {
  birth: string; sayings: SayingDTO[]; photos: PhotoDTO[]; videos: VideoDTO[]; milestones: MilestoneDTO[]; recordings?: RecordingDTO[];
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const items = useMemo(() => {
    const all: FeedItem[] = [
      ...sayings.map((s): FeedItem => ({ kind: "saying", date: s.saidAt, saying: s })),
      ...photos.map((p): FeedItem => ({ kind: "photo", date: p.takenAt, photo: p })),
      ...videos.map((v): FeedItem => ({ kind: "video", date: v.takenAt, video: v })),
      ...milestones.map((m): FeedItem => ({ kind: "milestone", date: m.date, milestone: m })),
      ...recordings.map((r): FeedItem => ({ kind: "recording", date: r.recordedAt, recording: r })),
    ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return filter === "all" ? all : all.filter((i) => i.kind === filter);
  }, [filter, sayings, photos, videos, milestones, recordings]);

  const groups: { month: string; items: FeedItem[] }[] = [];
  for (const it of items) {
    const m = it.date.slice(0, 7);
    const g = groups[groups.length - 1];
    if (g && g.month === m) g.items.push(it);
    else groups.push({ month: m, items: [it] });
  }

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-4 px-4 sticky top-14 z-20 bg-sky/90 backdrop-blur pt-2" role="tablist" aria-label="İçerik türü">
        {FILTERS.map((f) => (
          <button key={f.key} role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)}
            className={clsx("btn h-9 min-h-0 px-3.5 text-sm shrink-0", filter === f.key ? "btn-primary" : "btn-soft")}>
            {f.label}
          </button>
        ))}
      </div>

      {items.length === 0 && <EmptyState title="Burada henüz bir şey yok" hint="Anne-baba ekledikçe burada görünecek." />}

      {groups.map((g) => (
        <section key={g.month} className="mb-10">
          <h2 className="text-lg text-ink-soft mb-4 px-1">{monthLabelTr(`${g.month}-01`)}</h2>
          <div className="space-y-7">
            {chunk(g.items).map((row, ri) =>
              row.kind === "saying" ? (
                <SayingBubble key={row.item.saying.id} saying={row.item.saying} birth={birth} tilt={ri % 2 ? "r" : "l"} readOnly />
              ) : row.kind === "milestone" ? (
                <MilestoneCard key={row.item.milestone.id} milestone={row.item.milestone} birth={birth} tilt={ri % 2 ? "r" : "l"} readOnly />
              ) : row.kind === "recording" ? (
                <RecordingCard key={row.item.recording.id} recording={row.item.recording} birth={birth} tilt={ri % 2 ? "r" : "l"} readOnly />
              ) : (
                <DayMedia key={row.date} items={row.items} date={row.date} birth={birth} readOnly />
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

type Row =
  | { kind: "saying"; item: Extract<FeedItem, { kind: "saying" }> }
  | { kind: "milestone"; item: Extract<FeedItem, { kind: "milestone" }> }
  | { kind: "recording"; item: Extract<FeedItem, { kind: "recording" }> }
  | { kind: "media"; date: string; items: DayItem[] };

/** Fotograf ve videolar ayni gune gore gruplanir; akisla ayni gorunum. */
function chunk(items: FeedItem[]): Row[] {
  const rows: Row[] = [];
  for (const it of items) {
    if (it.kind === "saying") rows.push({ kind: "saying", item: it });
    else if (it.kind === "milestone") rows.push({ kind: "milestone", item: it });
    else if (it.kind === "recording") rows.push({ kind: "recording", item: it });
    else {
      const day: DayItem = it.kind === "photo" ? { kind: "photo", photo: it.photo } : { kind: "video", video: it.video };
      const last = rows[rows.length - 1];
      if (last && last.kind === "media" && last.date === it.date) last.items.push(day);
      else rows.push({ kind: "media", date: it.date, items: [day] });
    }
  }
  return rows;
}
