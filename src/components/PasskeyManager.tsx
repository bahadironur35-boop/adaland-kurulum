"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startRegistration, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { Fingerprint, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { passkeyHatasi } from "@/lib/webauthn-errors";

export type PasskeyDTO = { id: string; label: string; createdAt: string; lastUsedAt: string | null };

function fmt(iso: string | null) {
  if (!iso) return "hiç";
  return new Date(iso).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", year: "numeric" });
}

/** Ayarlar > Face ID / parmak izi: bu cihazi ekle, eklenmisleri yonet. */
export function PasskeyManager({ passkeys }: { passkeys: PasskeyDTO[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const supported = typeof window !== "undefined" && browserSupportsWebAuthn();

  async function add() {
    setBusy(true);
    setMsg(null);
    try {
      const options = await api<Parameters<typeof startRegistration>[0]["optionsJSON"]>("/api/passkey/register", { method: "POST", json: { step: "options" } });
      const response = await startRegistration({ optionsJSON: options });
      const r = await api<{ label: string }>("/api/passkey/register", { method: "POST", json: { step: "verify", response } });
      setMsg({ ok: true, text: `Eklendi: ${r.label}. Artık girişte "Face ID / parmak izi ile gir" çalışır.` });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: passkeyHatasi(err, "kayit") });
    } finally { setBusy(false); }
  }

  async function remove(p: PasskeyDTO) {
    if (!confirm(`"${p.label}" kaldırılsın mı? O cihazdan Face ID ile giriş kapanır.`)) return;
    await api(`/api/passkey/${p.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <section className="bubble p-5">
      <h2 className="text-xl font-bold mb-1">Face ID / parmak izi ile giriş</h2>
      <p className="text-ink-soft text-sm mb-3">
        Bu cihazı ekleyince şifre yazmadan, yüz ya da parmak iziyle girersin. Her cihaz ayrı eklenir; kaybolan cihazı buradan kaldır.
      </p>
      {passkeys.length > 0 && (
        <ul className="mb-3">
          {passkeys.map((p) => (
            <li key={p.id} className="py-2 flex items-center justify-between gap-3" style={{ borderTop: "1px solid var(--color-line)" }}>
              <div>
                <div className="font-semibold flex items-center gap-1.5"><Fingerprint size={16} className="text-grape" /> {p.label}</div>
                <div className="text-xs text-ink-faint">eklendi {fmt(p.createdAt)} · son kullanım {fmt(p.lastUsedAt)}</div>
              </div>
              <button onClick={() => remove(p)} className="btn btn-ghost h-9 w-9 min-h-0 p-0 hover:text-crayon" aria-label="Kaldır"><Trash2 size={17} /></button>
            </li>
          ))}
        </ul>
      )}
      {supported ? (
        <button className="btn btn-primary" onClick={add} disabled={busy}><Fingerprint size={18} /> Bu cihazı ekle</button>
      ) : (
        <p className="text-ink-faint text-sm">Bu tarayıcı passkey desteklemiyor.</p>
      )}
      {msg && <p className={`text-sm mt-2 ${msg.ok ? "text-grass" : "text-crayon"}`}>{msg.text}</p>}
    </section>
  );
}
