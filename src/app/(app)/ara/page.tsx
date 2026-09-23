import { Search } from "lucide-react";
import { getBirthDate } from "@/lib/brand";
import { searchAll } from "@/lib/queries";
import { SayingBubble } from "@/components/SayingBubble";
import { MilestoneCard } from "@/components/MilestoneCard";
import { PhotoGrid } from "@/components/PhotoGrid";
import { VideoGrid } from "@/components/VideoGrid";
import { EmptyState } from "@/components/EmptyState";

export const metadata = { title: "Ara" };
export const dynamic = "force-dynamic";

export default async function AraPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const term = q.trim();
  const [birth, r] = await Promise.all([getBirthDate(), term ? searchAll(term) : Promise.resolve(null)]);
  const total = r ? r.sayings.length + r.milestones.length + r.photos.length + r.videos.length : 0;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Ara</h1>
      <form action="/ara" method="get" className="relative mb-6" role="search">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input name="q" defaultValue={q} className="field pl-12 text-lg" placeholder="Söz, ilk, fotoğraf notu..." autoFocus aria-label="Ara" />
      </form>

      {!term && <p className="font-hand text-lg text-ink-soft px-1">Sözlerde, ilklerde, fotoğraf ve video notlarında arar.</p>}
      {term && term.length < 2 && <p className="text-ink-soft px-1">En az iki harf yaz.</p>}
      {r && term.length >= 2 && total === 0 && <EmptyState title="Bulunamadı" hint={`“${term}” için sonuç yok. Başka bir kelime dene.`} />}
      {r && total > 0 && (
        <>
          <p className="text-ink-faint text-sm mb-6 px-1">{total} sonuç</p>
          {r.sayings.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg text-ink-soft mb-4 px-1">Sözler ({r.sayings.length})</h2>
              <div className="space-y-7">{r.sayings.map((s, i) => <SayingBubble key={s.id} saying={s} birth={birth} tilt={i % 2 ? "r" : "l"} />)}</div>
            </section>
          )}
          {r.milestones.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg text-ink-soft mb-4 px-1">İlkler ({r.milestones.length})</h2>
              <div className="space-y-6">{r.milestones.map((m, i) => <MilestoneCard key={m.id} milestone={m} birth={birth} tilt={i % 2 ? "r" : "l"} />)}</div>
            </section>
          )}
          {r.photos.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg text-ink-soft mb-4 px-1">Fotoğraflar ({r.photos.length})</h2>
              <PhotoGrid photos={r.photos} birth={birth} />
            </section>
          )}
          {r.videos.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg text-ink-soft mb-4 px-1">Videolar ({r.videos.length})</h2>
              <VideoGrid videos={r.videos} birth={birth} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
