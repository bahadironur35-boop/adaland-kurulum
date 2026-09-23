import Link from "next/link";
import { requireBrand } from "@/lib/brand";
import { listLetters, listMilestones, listOnThisDay, listPhotos, listRecordings, listSayings, listVideos } from "@/lib/queries";
import { getSessionParent } from "@/lib/auth";
import { RecordingCard } from "@/components/RecordingCard";
import { Mail } from "lucide-react";
import { ageLabel, monthLabelTr, nextBirthday, todayStr } from "@/lib/dates";
import type { FeedItem } from "@/lib/types";
import { SayingBubble } from "@/components/SayingBubble";
import { MilestoneCard } from "@/components/MilestoneCard";
import { DayMedia, type DayItem } from "@/components/DayMedia";
import { EmptyState } from "@/components/EmptyState";
import { CareBanner } from "@/components/CareBanner";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const brand = await requireBrand();
  const birth = brand.birthDate;
  const today = todayStr();
  const me = await getSessionParent();
  const [sayings, photos, videos, milestones, onThisDay, recordings, letters] = await Promise.all([
    listSayings(40), listPhotos(40), listVideos(20), listMilestones(30), listOnThisDay(birth, today), listRecordings(20), listLetters(me?.id ?? "", today),
  ]);
  // Son 7 gunde acilan mektuplar: akisin ustunde zarf
  const weekAgo = new Date(Date.parse(`${today}T00:00:00Z`) - 7 * 86_400_000).toISOString().slice(0, 10);
  const opened = letters.filter((l) => !l.sealed && l.openAt >= weekAgo && l.openAt <= today);

  const items: FeedItem[] = [
    ...sayings.map((s): FeedItem => ({ kind: "saying", date: s.saidAt, saying: s })),
    ...photos.map((p): FeedItem => ({ kind: "photo", date: p.takenAt, photo: p })),
    ...videos.map((v): FeedItem => ({ kind: "video", date: v.takenAt, video: v })),
    ...milestones.map((m): FeedItem => ({ kind: "milestone", date: m.date, milestone: m })),
    ...recordings.map((r): FeedItem => ({ kind: "recording", date: r.recordedAt, recording: r })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const groups: { month: string; items: FeedItem[] }[] = [];
  for (const it of items) {
    const m = it.date.slice(0, 7);
    const g = groups[groups.length - 1];
    if (g && g.month === m) g.items.push(it);
    else groups.push({ month: m, items: [it] });
  }

  // Gunun sozu: her gun baska bir soz, ayni gun icinde sabit.
  const dayIndex = Math.floor(Date.parse(`${today}T00:00:00Z`) / 86_400_000);
  const pick = sayings.length ? sayings[dayIndex % sayings.length] : null;
  const exactToday = onThisDay.some((it) => it.date.slice(5) === today.slice(5));
  const bday = nextBirthday(birth, today);

  return (
    <div>
      <section className="mb-8">
        <p className="font-hand text-xl text-ink-soft">Bugün {brand.childName}</p>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight">{ageLabel(birth, today)}</h1>
        <p className="mt-1 font-display font-semibold text-ink-soft">
          {bday.days === 0 ? `🎂 Bugün ${bday.age} yaşında! İyi ki doğdun ${brand.childName}!` : `🎂 ${bday.age} yaşına ${bday.days} gün kaldı`}
        </p>
        {pick && (
          <div className="relative mt-4 rounded-2xl border-2 border-dashed border-line p-4">
            <span className="sticker inline-block px-2.5 py-1 text-[13px] font-bold absolute -top-3 -right-2">
              {gecmisSozu(pick.id)}
            </span>
            <blockquote className="font-hand text-xl text-ink-soft">
              “{pick.text}” <span className="text-ink-faint text-base">— o zaman {ageLabel(birth, pick.saidAt)}</span>
            </blockquote>
          </div>
        )}
      </section>

      <CareBanner />

      {opened.length > 0 && (
        <section className="mb-8 rounded-3xl bg-grape-soft p-4 flex items-start gap-3">
          <Mail className="text-grape shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-bold">Bir mektup açıldı 💌</h2>
            <p className="text-ink-soft text-sm">{opened.map((l) => `“${l.title}” (${l.authorName})`).join(", ")}</p>
            <Link href="/mektuplar" className="btn btn-soft mt-2 h-9 min-h-0 text-sm">Mektupları oku</Link>
          </div>
        </section>
      )}

      {onThisDay.length > 0 && (
        <section className="mb-10 rounded-3xl bg-sun-soft/70 p-4 pt-3 -mx-1">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span aria-hidden>🗓️</span> {exactToday ? "Bugün, geçen yıllarda" : "Bu günlerde, geçen yıllarda"}
          </h2>
          <div className="space-y-6">{renderRows(chunk(onThisDay), birth)}</div>
        </section>
      )}

      {items.length === 0 && (
        <EmptyState title={`${brand.siteName} daha yeni açıldı`} hint="İlk sözü sağ alttan, ilk fotoğrafı Fotoğraflar sayfasından ekle.">
          <Link href="/fotograflar" className="btn btn-soft">Fotoğraflara git</Link>
        </EmptyState>
      )}

      {groups.map((g) => (
        <section key={g.month} className="mb-10">
          <h2 className="text-lg text-ink-soft mb-4 px-1">{monthLabelTr(`${g.month}-01`)}</h2>
          <div className="space-y-7">{renderRows(chunk(g.items), birth)}</div>
        </section>
      ))}
    </div>
  );
}

/**
 * Gunun sozu kartindaki kose etiketi. Kesin bir sure hesaplamiyor —
 * blockquote'un icinde zaten "o zaman X yas Y aylik" var. Burasi salt
 * nostaljik bir renk katmasi icin; ayni soz (ayni id) her zaman ayni
 * kelimeyi gosterir (sayfa her yenilendiginde degismesin), ama sozler
 * gunden gune donunce etiket de kendiliginden degisir.
 */
const GECMIS_SOZLERI = ["geçen yıl", "bir zamanlar", "o günlerde", "vaktiyle", "hatırlıyor musun", "eskiden"];
function gecmisSozu(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GECMIS_SOZLERI[h % GECMIS_SOZLERI.length];
}

function renderRows(rows: Row[], birth: string) {
  return rows.map((row, ri) =>
    row.kind === "saying" ? (
      <SayingBubble key={row.item.saying.id} saying={row.item.saying} birth={birth} tilt={ri % 2 ? "r" : "l"} />
    ) : row.kind === "milestone" ? (
      <MilestoneCard key={row.item.milestone.id} milestone={row.item.milestone} birth={birth} tilt={ri % 2 ? "r" : "l"} />
    ) : row.kind === "recording" ? (
      <RecordingCard key={row.item.recording.id} recording={row.item.recording} birth={birth} tilt={ri % 2 ? "r" : "l"} />
    ) : (
      <DayMedia key={row.date} items={row.items} date={row.date} birth={birth} />
    ),
  );
}

type Row =
  | { kind: "saying"; item: Extract<FeedItem, { kind: "saying" }> }
  | { kind: "milestone"; item: Extract<FeedItem, { kind: "milestone" }> }
  | { kind: "recording"; item: Extract<FeedItem, { kind: "recording" }> }
  | { kind: "media"; date: string; items: DayItem[] };

/**
 * Fotograf ve videolari AYNI GUNE gore grupla; sozler, ilkler ve sesler tek basina kalsin.
 * Onceden siradaki konuma gore ucerli gruplaniyordu, bu yuzden iki farkli gunun
 * fotografi ayni satira dusebiliyordu.
 */
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
