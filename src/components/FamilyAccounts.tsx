"use client";

import { useState } from "react";
import { KeyRound, Copy, Check, TriangleAlert } from "lucide-react";
import { api } from "@/lib/client";
import { formatDateTr } from "@/lib/dates";
import { useLogout } from "@/lib/logout";
import { useBrand } from "@/lib/brand-client";

export type FamilyMember = { id: string; name: string; email: string; lastLoginAt: string | null; geciciSifre: boolean };

/**
 * Aile hesaplari + sifre kurtarma. Sifresini unutan uye icin, giris yapabilen
 * baska bir uye gecici sifre uretir; sifre ekranda bir kez gorunur.
 */
export function FamilyAccounts({ members, meId }: { members: FamilyMember[]; meId: string | null }) {
  const b = useBrand();
  const [soruyor, setSoruyor] = useState<FamilyMember | null>(null);
  const [sonuc, setSonuc] = useState<{ name: string; password: string; kendisi: boolean } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [kopyalandi, setKopyalandi] = useState(false);
  const { logout } = useLogout();

  async function sifirla(m: FamilyMember) {
    setBusy(true);
    setHata(null);
    try {
      const r = await api<{ name: string; password: string }>("/api/aile/sifirla", {
        method: "POST", json: { parentId: m.id },
      });
      setSonuc({ ...r, kendisi: m.id === meId });
      setSoruyor(null);
    } catch (err) {
      setHata(err instanceof Error ? err.message : "Sıfırlanamadı");
    } finally {
      setBusy(false);
    }
  }

  async function kopyala(pw: string) {
    try {
      await navigator.clipboard.writeText(pw);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {}
  }

  return (
    <section className="bubble p-5">
      <h2 className="text-xl font-bold mb-1">Aile hesapları</h2>
      <p className="text-ink-soft text-sm mb-3">
        {b.siteYonelme} giriş yapıp söz, fotoğraf ve anı ekleyebilen herkes: anne, baba, anneanne...
        Biri şifresini unutursa buradan ona yeni bir şifre verebilirsin.
      </p>

      <ul>
        {members.map((m) => (
          <li key={m.id} className="py-2.5 flex items-center justify-between gap-3 flex-wrap"
            style={{ borderTop: "1px solid var(--color-line)" }}>
            <div className="min-w-0">
              <span className="font-semibold">{m.name}</span>{" "}
              {m.id === meId && <span className="text-ink-faint text-xs">(sen)</span>}
              {m.geciciSifre && (
                <span className="sticker ml-1.5 px-2 py-0.5 text-[11px] font-bold align-middle">geçici şifre</span>
              )}
              <div className="text-ink-faint text-sm truncate">{m.email}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-ink-faint text-xs">
                {m.lastLoginAt ? `son giriş ${formatDateTr(m.lastLoginAt.slice(0, 10))}` : "hiç girmedi"}
              </span>
              <button onClick={() => { setSonuc(null); setSoruyor(m); }}
                className="btn btn-ghost h-9 min-h-0 px-2.5 text-[13px] text-ink-soft">
                <KeyRound size={16} /> Şifre ver
              </button>
            </div>
          </li>
        ))}
      </ul>

      {hata && <p role="alert" className="text-crayon text-sm font-semibold mt-3">{hata}</p>}

      {soruyor && (
        <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--color-sun-soft)" }}>
          <p className="font-semibold flex items-start gap-2">
            <TriangleAlert size={18} className="mt-0.5 shrink-0" />
            <span>{soruyor.name} için yeni bir şifre üretilsin mi?</span>
          </p>
          <p className="text-ink-soft text-sm mt-1.5">
            Eski şifresi çalışmaz olur ve açık kaldığı tüm telefonlardan çıkış yapılır.
            Yeni şifre ekranda bir kez görünecek, ona kendin söylemen gerekir.
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => sifirla(soruyor)} disabled={busy} className="btn btn-primary">
              {busy ? "Üretiliyor..." : "Evet, şifre ver"}
            </button>
            <button onClick={() => setSoruyor(null)} className="btn btn-ghost">Vazgeç</button>
          </div>
        </div>
      )}

      {sonuc && (
        <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--color-grass-soft)" }}>
          <p className="font-semibold">{sonuc.name} için geçici şifre</p>
          <div className="flex items-center gap-2 mt-2">
            <code className="font-display text-2xl tracking-wide bg-paper rounded-xl px-3 py-2 select-all">
              {sonuc.password}
            </code>
            <button onClick={() => kopyala(sonuc.password)} className="btn btn-ghost h-10 w-10 min-h-0 p-0"
              aria-label="Şifreyi kopyala" title="Şifreyi kopyala">
              {kopyalandi ? <Check size={18} className="text-grass" /> : <Copy size={18} />}
            </button>
          </div>
          <p className="text-ink-soft text-sm mt-2">
            Bu şifre bir daha gösterilmez. {sonuc.name} girdikten sonra Ayarlar&apos;dan kendi şifresini belirlesin.
          </p>
          {sonuc.kendisi && (
            <p className="text-sm mt-2">
              Kendi şifreni sıfırladın, bu oturum da kapandı sayılır.{" "}
              <button onClick={logout} className="underline font-semibold">Yeni şifreyle gir</button>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
