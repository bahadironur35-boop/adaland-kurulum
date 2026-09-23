import { Heart } from "lucide-react";
import { getBirthDate } from "@/lib/brand";
import { listFavorites } from "@/lib/queries";
import { SayingBubble } from "@/components/SayingBubble";
import { PhotoGrid } from "@/components/PhotoGrid";
import { EmptyState } from "@/components/EmptyState";

export const metadata = { title: "Favoriler" };
export const dynamic = "force-dynamic";

export default async function FavorilerPage() {
  const [birth, { sayings, photos }] = await Promise.all([getBirthDate(), listFavorites()]);
  const empty = sayings.length === 0 && photos.length === 0;
  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <h1 className="text-3xl font-bold flex items-center gap-2"><Heart className="text-crayon" fill="currentColor" size={26} /> Favoriler</h1>
        <span className="font-hand text-lg text-ink-soft">{sayings.length} söz, {photos.length} fotoğraf</span>
      </div>
      {empty && <EmptyState title="Henüz favori yok" hint="Söz ve fotoğraflardaki kalbe dokun; en sevdikleriniz burada birikir." />}
      {sayings.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg text-ink-soft mb-4 px-1">En sevilen sözler</h2>
          <div className="space-y-7">
            {sayings.map((s, i) => <SayingBubble key={s.id} saying={s} birth={birth} tilt={i % 2 ? "r" : "l"} />)}
          </div>
        </section>
      )}
      {photos.length > 0 && (
        <section>
          <h2 className="text-lg text-ink-soft mb-4 px-1">En sevilen fotoğraflar</h2>
          <PhotoGrid photos={photos} birth={birth} />
        </section>
      )}
    </div>
  );
}
