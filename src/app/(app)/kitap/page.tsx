import Link from "next/link";
import { BookOpen } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireBrand } from "@/lib/brand";
import { formatDateTr, todayStr } from "@/lib/dates";
import { ageYearRange, lastBirthdayOf } from "@/lib/care";

export const metadata = { title: "Yaş kitabı" };
export const dynamic = "force-dynamic";

/** Her yas yili (dogum gununden dogum gunune) bir kitap. Icerigi olanlari listeler. */
export default async function KitapPage() {
  const brand = await requireBrand();
  const birth = brand.birthDate;
  const today = todayStr();
  const { turned } = lastBirthdayOf(birth, today);
  const [s, p, m] = await Promise.all([
    prisma.saying.findMany({ select: { saidAt: true } }),
    prisma.photo.findMany({ select: { takenAt: true } }),
    prisma.milestone.findMany({ select: { date: true } }),
  ]);
  const dates = [...s.map((r) => r.saidAt), ...p.map((r) => r.takenAt), ...m.map((r) => r.date)].map((d) => d.toISOString().slice(0, 10));

  const books = [];
  for (let age = turned; age >= 0; age--) {
    const r = ageYearRange(birth, age);
    const inRange = (d: string) => d >= r.from && d < r.to;
    const counts = {
      sayings: s.filter((x) => inRange(x.saidAt.toISOString().slice(0, 10))).length,
      photos: p.filter((x) => inRange(x.takenAt.toISOString().slice(0, 10))).length,
      milestones: m.filter((x) => inRange(x.date.toISOString().slice(0, 10))).length,
    };
    if (dates.some(inRange)) books.push({ age, r, counts, ongoing: age === turned });
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Yaş kitabı</h1>
      <p className="font-hand text-lg text-ink-soft mb-6">Her doğum gününden doğum gününe bir kitap. Aç, &quot;PDF olarak kaydet&quot; de; ister yazdır ister fotoğraf kitabı sitesine yükle.</p>
      {books.length === 0 && <p className="text-ink-soft">Henüz içerik yok.</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        {books.map(({ age, r, counts, ongoing }) => (
          <Link key={age} href={`/kitap/${age}`} className="bg-paper rounded-2xl shadow-paper p-5 hover:shadow-lift transition-shadow block">
            <div className="flex items-center gap-3">
              <span className="grid place-items-center w-12 h-12 rounded-2xl bg-sun-soft text-ink"><BookOpen size={24} /></span>
              <div>
                <div className="text-2xl font-bold leading-tight">{brand.childName} · {age === 0 ? "İlk yıl" : `${age} yaş`}</div>
                <div className="text-sm text-ink-soft">{formatDateTr(r.from)} – {formatDateTr(r.to)}{ongoing && " · devam ediyor"}</div>
              </div>
            </div>
            <p className="text-xs text-ink-faint mt-3">{counts.sayings} söz · {counts.photos} fotoğraf · {counts.milestones} ilk</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
