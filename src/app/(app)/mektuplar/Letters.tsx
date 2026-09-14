"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, MailOpen, Pencil, Trash2, Lock } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/client";
import { ageLabel, formatDateTr } from "@/lib/dates";
import type { LetterDTO } from "@/lib/types";
import { Sheet } from "@/components/Sheet";
import { LetterForm } from "@/components/LetterForm";
import { EmptyState } from "@/components/EmptyState";
import { useBrand } from "@/lib/brand-client";

function Envelope({ letter, birth, onEdit, onDelete, onOpen }: {
  letter: LetterDTO; birth: string; onEdit: () => void; onDelete: () => void; onOpen: () => void;
}) {
  const b = useBrand();
  const sealed = letter.sealed;
  return (
    <article className={clsx("relative rounded-2xl p-4 pl-5 shadow-paper", sealed ? "bg-grape-soft" : "bg-paper")}>
      <div className="flex items-start gap-3">
        <span className={clsx("grid place-items-center w-12 h-12 rounded-full shrink-0", sealed ? "bg-grape text-white" : "bg-sun-soft text-ink")}>
          {sealed ? <Lock size={20} /> : <MailOpen size={22} />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold leading-tight truncate">{letter.title}</h3>
          <p className="text-sm text-ink-soft">
            {letter.authorName} yazdı · {sealed ? `${formatDateTr(letter.openAt)} günü açılacak, ${b.ad} ${ageLabel(birth, letter.openAt)}` : `${formatDateTr(letter.openAt)} günü açıldı`}
          </p>
          {letter.body !== null ? (
            <>
              {sealed && <p className="text-xs text-grape mt-1">Mühürlü; sadece sen görüyorsun.</p>}
              <button onClick={onOpen} className="btn btn-soft mt-3 h-9 min-h-0 text-sm"><Mail size={16} /> Oku</button>
            </>
          ) : (
            <p className="text-xs text-ink-faint mt-2">Zarfı sadece açılış günü görebilirsin.</p>
          )}
        </div>
        {letter.isAuthor && (
          <div className="flex gap-1 shrink-0">
            <button onClick={onEdit} className="btn btn-ghost h-9 w-9 min-h-0 p-0" aria-label="Düzenle"><Pencil size={17} /></button>
            <button onClick={onDelete} className="btn btn-ghost h-9 w-9 min-h-0 p-0 hover:text-crayon" aria-label="Sil"><Trash2 size={17} /></button>
          </div>
        )}
      </div>
    </article>
  );
}

export function Letters({ letters, birth }: { letters: LetterDTO[]; birth: string }) {
  const b = useBrand();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LetterDTO | null>(null);
  const [reading, setReading] = useState<LetterDTO | null>(null);

  async function remove(l: LetterDTO) {
    if (!confirm(`"${l.title}" silinsin mi? Geri alınamaz.`)) return;
    await api(`/api/mektuplar/${l.id}`, { method: "DELETE" });
    router.refresh();
  }

  const sealed = letters.filter((l) => l.sealed);
  const opened = letters.filter((l) => !l.sealed).reverse();

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-5">
        <p className="font-hand text-lg text-ink-soft leading-snug pt-1">Bugünün {b.ad}&apos;sına değil, yarının {b.ad}&apos;sına. Bir tarih seç; o güne kadar mühürlü kalır.</p>
        <button className="btn btn-primary shrink-0 whitespace-nowrap" onClick={() => setAdding(true)}><Mail size={20} strokeWidth={2.4} /> Mektup yaz</button>
      </div>

      {letters.length === 0 && <EmptyState title="Henüz mektup yok" hint="İlk mektubu yaz: 18. doğum gününde açılsın, ya da okula başladığı gün." />}

      {sealed.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg text-ink-soft mb-3 px-1">Mühürlü ({sealed.length})</h2>
          <div className="space-y-4">
            {sealed.map((l) => <Envelope key={l.id} letter={l} birth={birth} onEdit={() => setEditing(l)} onDelete={() => remove(l)} onOpen={() => setReading(l)} />)}
          </div>
        </section>
      )}
      {opened.length > 0 && (
        <section>
          <h2 className="text-lg text-ink-soft mb-3 px-1">Açılmış ({opened.length})</h2>
          <div className="space-y-4">
            {opened.map((l) => <Envelope key={l.id} letter={l} birth={birth} onEdit={() => setEditing(l)} onDelete={() => remove(l)} onOpen={() => setReading(l)} />)}
          </div>
        </section>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title={`${b.adYonelme} mektup`}>
        <LetterForm birth={birth} onDone={() => setAdding(false)} />
      </Sheet>
      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Mektubu düzenle">
        {editing && <LetterForm key={editing.id} initial={editing} birth={birth} onDone={() => setEditing(null)} />}
      </Sheet>
      <Sheet open={!!reading} onClose={() => setReading(null)} title={reading?.title ?? ""}>
        {reading && (
          <div>
            <p className="text-sm text-ink-soft mb-4">{reading.authorName} · {formatDateTr(reading.createdAt.slice(0, 10))} tarihinde yazıldı · {formatDateTr(reading.openAt)} günü için</p>
            <div className="font-hand text-xl leading-relaxed whitespace-pre-wrap bg-sun-soft/60 rounded-2xl p-5">{reading.body}</div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
