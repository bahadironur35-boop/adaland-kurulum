import { notFound } from "next/navigation";
import { requireBrand } from "@/lib/brand";
import { ilgi } from "@/lib/turkce";
import { listMeasurements, listMilestones, listPhotos, listSayings } from "@/lib/queries";
import { ageLabel, formatDateTr, monthLabelTr } from "@/lib/dates";
import { AgeBadge } from "@/components/AgeBadge";
import { ageYearRange } from "@/lib/care";
import { fromDateStr } from "@/lib/dates";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

/**
 * Basilabilir yil kitabi. Ekranda da okunur; yazdirmada A5, sayfa kirilmalari
 * globals.css'teki @media print kurallariyla. Tum medya 1 saatlik imzali linkle.
 */
export default async function KitapYasPage({ params }: { params: Promise<{ yas: string }> }) {
  const { yas } = await params;
  const age = Number(yas);
  if (!Number.isInteger(age) || age < 0 || age > 120) notFound();
  const brand = await requireBrand();
  const birth = brand.birthDate;
  const yr = ageYearRange(birth, age);
  const range = { gte: fromDateStr(yr.from), lt: fromDateStr(yr.to) };

  const [sayings, photos, milestones, measurements] = await Promise.all([
    listSayings(undefined, { saidAt: range }),
    listPhotos(undefined, { takenAt: range }),
    listMilestones(undefined, { date: range }),
    listMeasurements(),
  ]);
  const yearMeasurements = measurements.filter((m) => m.date >= yr.from && m.date < yr.to);
  const title = age === 0 ? "İlk yıl" : `${age} yaş`;

  // Aylara gore birlestir (eski -> yeni, kitap kronolojik okunur)
  const months = new Map<string, { sayings: typeof sayings; photos: typeof photos; milestones: typeof milestones }>();
  const bucket = (d: string) => {
    const k = d.slice(0, 7);
    if (!months.has(k)) months.set(k, { sayings: [], photos: [], milestones: [] });
    return months.get(k)!;
  };
  for (const s of [...sayings].reverse()) bucket(s.saidAt).sayings.push(s);
  for (const p of [...photos].reverse()) bucket(p.takenAt).photos.push(p);
  for (const m of [...milestones].reverse()) bucket(m.date).milestones.push(m);
  const keys = [...months.keys()].sort();
  const cover = photos.find((p) => p.isFavorite) ?? photos[0];

  return (
    <div className="book">
      <div className="print:hidden flex items-center justify-between gap-3 mb-6">
        <p className="font-hand text-lg text-ink-soft">Yazdırma penceresinde &quot;PDF olarak kaydet&quot;i seç. Kağıt A5, kenar boşlukları hazır.</p>
        <PrintButton age={age} />
      </div>

      {/* Kapak */}
      <section className="book-page min-h-[60vh] flex flex-col items-center justify-center text-center bg-paper rounded-3xl shadow-paper p-8 mb-8">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.url} alt="" className="w-56 h-56 object-cover rounded-2xl mb-6 -rotate-2 shadow-paper" />
        )}
        <p className="font-hand text-2xl text-ink-soft">{ilgi(brand.childName)}</p>
        <h1 className="text-6xl font-bold leading-none my-2">{title}</h1>
        <p className="font-display text-xl text-ink-soft">{formatDateTr(yr.from)} – {formatDateTr(yr.to)}</p>
        <p className="text-ink-faint text-sm mt-6">{sayings.length} söz · {photos.length} fotoğraf · {milestones.length} ilk</p>
      </section>

      {keys.length === 0 && <p className="text-ink-soft">Bu yaş yılında içerik yok.</p>}

      {keys.map((k) => {
        const m = months.get(k)!;
        return (
          <section key={k} className="book-page mb-10">
            <h2 className="text-3xl font-bold mb-5 flex items-baseline gap-3">
              {monthLabelTr(`${k}-01`)} <span className="font-hand text-lg text-ink-soft font-normal">{ageLabel(birth, `${k}-15`)}</span>
            </h2>
            {m.milestones.map((ms) => (
              <div key={ms.id} className="book-avoid book-card bg-paper rounded-2xl shadow-paper p-4 mb-4 flex gap-3 items-start">
                <span aria-hidden className="text-2xl">⭐</span>
                <div>
                  <div className="font-display font-bold text-lg">{ms.title} <span className="text-ink-faint text-sm font-normal">· {formatDateTr(ms.date)}</span></div>
                  {ms.note && <p className="font-hand text-lg text-ink-soft">{ms.note}</p>}
                </div>
              </div>
            ))}
            {m.sayings.map((s) => (
              <div key={s.id} className="book-avoid bubble p-5 pb-6 mb-6 relative">
                <AgeBadge birth={birth} at={s.saidAt} className="absolute -top-3 -right-2" />
                <p className="font-hand text-2xl leading-snug whitespace-pre-wrap">“{s.text}”</p>
                {s.context && <p className="text-ink-soft text-sm mt-2">{s.context}</p>}
                <p className="text-ink-faint text-sm mt-2">{formatDateTr(s.saidAt)}</p>
              </div>
            ))}
            {m.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {m.photos.map((p, i) => (
                  <figure key={p.id} className={`book-avoid polaroid ${i % 2 ? "tilt-r" : "tilt-l"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.caption ?? ""} className="w-full aspect-square object-cover rounded-sm" />
                    <figcaption className="font-hand text-base text-ink-soft pt-2 truncate">{p.caption || formatDateTr(p.takenAt)}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {yearMeasurements.length > 0 && (
        <section className="book-page">
          <h2 className="text-3xl font-bold mb-4">Büyüme</h2>
          <table className="w-full text-sm bg-paper rounded-2xl shadow-paper overflow-hidden">
            <thead><tr className="text-left text-ink-faint font-display"><th className="px-4 py-2">Tarih</th><th className="px-2 py-2">Yaş</th><th className="px-2 py-2 text-right">Boy</th><th className="px-2 py-2 text-right">Kilo</th></tr></thead>
            <tbody>
              {yearMeasurements.map((mm) => (
                <tr key={mm.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                  <td className="px-4 py-2">{formatDateTr(mm.date)}</td>
                  <td className="px-2 py-2 text-ink-soft">{ageLabel(birth, mm.date)}</td>
                  <td className="px-2 py-2 text-right font-display">{mm.heightCm != null ? `${mm.heightCm.toLocaleString("tr-TR")} cm` : "—"}</td>
                  <td className="px-2 py-2 text-right font-display">{mm.weightKg != null ? `${mm.weightKg.toLocaleString("tr-TR")} kg` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p className="text-center font-hand text-lg text-ink-faint mt-10">{brand.siteName} · {brand.childName} {title}</p>
    </div>
  );
}
