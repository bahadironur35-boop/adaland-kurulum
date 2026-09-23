"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, MessageCircle, Ban, Trash2, Link2 } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/client";
import type { ShareLinkDTO } from "@/app/api/paylasim/route";
import { useBrand } from "@/lib/brand-client";

const DURATIONS: { value: 7 | 30 | 90 | null; label: string }[] = [
  { value: 7, label: "7 gün" },
  { value: 30, label: "30 gün" },
  { value: 90, label: "90 gün" },
  { value: null, label: "Süresiz" },
];

function fmtDateTime(iso: string | null) {
  if (!iso) return null;
  // Sabit saat dilimi: sunucu (UTC) ve istemci ayni metni uretsin, hydration bozulmasin.
  return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export function ShareLinks({ links }: { links: ShareLinkDTO[] }) {
  const b = useBrand();
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [days, setDays] = useState<7 | 30 | 90 | null>(30);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Sunucuda "" , istemcide gercek origin: hydration uyusmazligi olmadan.
  const origin = useSyncExternalStore(() => () => {}, () => window.location.origin, () => "");
  const urlOf = (l: ShareLinkDTO) => `${origin}/p/${l.token}`;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/paylasim", { method: "POST", json: { label, days } });
      setLabel("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Link oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(l: ShareLinkDTO) {
    try {
      await navigator.clipboard.writeText(urlOf(l));
      setCopied(l.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      prompt("Linki kopyala:", urlOf(l));
    }
  }

  function whatsapp(l: ShareLinkDTO) {
    const text = `${b.adIlgi} anıları burada 💛 ${urlOf(l)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  async function revoke(l: ShareLinkDTO) {
    if (!confirm(`"${l.label}" linki iptal edilsin mi? Bu link bir daha açılmaz.`)) return;
    await api(`/api/paylasim/${l.id}`, { method: "PATCH" });
    router.refresh();
  }

  async function remove(l: ShareLinkDTO) {
    if (!confirm("Bu kayıt listeden silinsin mi?")) return;
    await api(`/api/paylasim/${l.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <section className="bubble p-5">
      <h2 className="text-xl font-bold mb-1">Akrabalarla paylaş</h2>
      <p className="text-ink-soft text-sm mb-4">
        Her akrabaya ayrı, salt-okunur bir link ver. Link süresi dolunca ya da iptal edince kapanır; kim kaç kez açmış görürsün.
        Hesap açmaları gerekmez.
      </p>

      <form onSubmit={create} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end mb-5">
        <div className="flex-1">
          <label className="label" htmlFor="sl-label">Kimin için</label>
          <input id="sl-label" className="field" required maxLength={60} placeholder="Anneanne, Hale teyze..." value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="sl-days">Geçerlilik</label>
          <select id="sl-days" className="field" value={days === null ? "0" : String(days)} onChange={(e) => setDays(e.target.value === "0" ? null : (Number(e.target.value) as 7 | 30 | 90))}>
            {DURATIONS.map((d) => <option key={String(d.value)} value={d.value === null ? "0" : d.value}>{d.label}</option>)}
          </select>
        </div>
        <button className="btn btn-primary shrink-0" disabled={busy || !label.trim()} type="submit"><Link2 size={18} /> Link üret</button>
      </form>
      {error && <p role="alert" className="text-crayon text-sm font-semibold mb-3">{error}</p>}

      {links.length === 0 ? (
        <p className="font-hand text-lg text-ink-faint">Henüz link yok.</p>
      ) : (
        <ul className="space-y-3">
          {links.map((l) => {
            const active = l.status === "active";
            return (
              <li key={l.id} className={clsx("rounded-2xl border-2 p-3", active ? "border-grass-soft bg-grass-soft/40" : "border-line bg-sky/60")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-display font-bold text-lg leading-tight truncate">{l.label}</div>
                    <div className="text-xs text-ink-faint mt-0.5">
                      {l.status === "active" && (l.expiresAt ? `${fmtDateTime(l.expiresAt)} tarihine kadar` : "Süresiz")}
                      {l.status === "expired" && "Süresi doldu"}
                      {l.status === "revoked" && "İptal edildi"}
                      {" · "}{l.viewCount} kez açıldı{l.lastViewedAt && `, son ${fmtDateTime(l.lastViewedAt)}`}
                    </div>
                    {active && <div className="text-xs text-ink-soft mt-1 truncate font-mono">{urlOf(l)}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {active ? (
                      <>
                        <button onClick={() => copy(l)} className="btn btn-soft h-9 w-9 min-h-0 p-0" aria-label="Linki kopyala">
                          {copied === l.id ? <Check size={17} className="text-grass" /> : <Copy size={17} />}
                        </button>
                        <button onClick={() => whatsapp(l)} className="btn btn-soft h-9 w-9 min-h-0 p-0 text-grass" aria-label="WhatsApp ile gönder"><MessageCircle size={17} /></button>
                        <button onClick={() => revoke(l)} className="btn btn-soft h-9 w-9 min-h-0 p-0 hover:text-crayon" aria-label="İptal et"><Ban size={17} /></button>
                      </>
                    ) : (
                      <button onClick={() => remove(l)} className="btn btn-ghost h-9 w-9 min-h-0 p-0 hover:text-crayon" aria-label="Sil"><Trash2 size={17} /></button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
