"use client";

import { useState } from "react";
import { KeyRound, Fingerprint, Users, LifeBuoy } from "lucide-react";
import { Sheet } from "./Sheet";
import { api } from "@/lib/client";
import { useBrand } from "@/lib/brand-client";

/**
 * Posta altyapisi yok, o yuzden "sifirlama linki" gondermiyoruz.
 * Gercekten ise yarayan yollar: aileden biri, Face ID, kurtarma kodu, en son CLI.
 */
export function ForgotPassword() {
  const b = useBrand();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<{ name: string; password: string } | null>(null);

  async function kurtar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setHata(null);
    try {
      setSonuc(await api<{ name: string; password: string }>("/api/auth/kurtar", { method: "POST", json: { email, code } }));
    } catch (err) {
      setHata(err instanceof Error ? err.message : "Olmadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="block mx-auto mt-4 text-sm text-ink-soft underline underline-offset-2">
        Şifreni mi unuttun?
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Şifreni mi unuttun?">
        <p className="text-ink-soft mb-4">
          {b.site} küçük bir aile sitesi, e-posta ile sıfırlama linki göndermiyor. Yolları şunlar:
        </p>

        <ol className="space-y-4">
          <li className="flex gap-3">
            <span className="shrink-0 grid place-items-center w-10 h-10 rounded-2xl bg-crayon-soft text-crayon"><Users size={20} /></span>
            <div className="min-w-0">
              <p className="font-display font-bold">Aileden birine sor</p>
              <p className="text-ink-soft text-sm">
                Girebilen biri kendi telefonundan <strong className="text-ink">Ayarlar › Aile hesapları</strong> bölümüne gidip
                senin adının yanındaki <strong className="text-ink">Şifre ver</strong> düğmesine bassın. Ekranda çıkan geçici şifreyi sana söylesin.
              </p>
            </div>
          </li>

          <li className="flex gap-3">
            <span className="shrink-0 grid place-items-center w-10 h-10 rounded-2xl bg-grape-soft text-grape"><Fingerprint size={20} /></span>
            <div className="min-w-0">
              <p className="font-display font-bold">Face ID veya parmak izi kurduysan</p>
              <p className="text-ink-soft text-sm">
                Bu sayfadaki <strong className="text-ink">Face ID ile gir</strong> düğmesi şifre sormadan seni içeri alır.
              </p>
            </div>
          </li>

          <li className="flex gap-3">
            <span className="shrink-0 grid place-items-center w-10 h-10 rounded-2xl bg-sun-soft text-ink"><LifeBuoy size={20} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold">Kurtarma kodun varsa</p>
              <p className="text-ink-soft text-sm mb-2">Kurulumda tek hesapla kaldıysan bir kod almıştın. Tek kullanımlık.</p>
              {sonuc ? (
                <div className="rounded-2xl p-3" style={{ background: "var(--color-grass-soft)" }}>
                  <p className="text-sm font-semibold">{sonuc.name} için geçici şifre</p>
                  <code className="block font-display text-xl tracking-wide bg-paper rounded-xl px-3 py-2 mt-1 select-all">{sonuc.password}</code>
                  <p className="text-ink-soft text-xs mt-1">Bununla gir, sonra kendi şifreni belirle. Kod artık geçersiz.</p>
                </div>
              ) : (
                <form onSubmit={kurtar} className="space-y-2">
                  <input className="field" type="email" required placeholder="E-postan" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <input className="field font-display tracking-wide" required placeholder="abcd-efgh-jkmn" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />
                  {hata && <p role="alert" className="text-crayon text-sm font-semibold">{hata}</p>}
                  <button className="btn btn-soft w-full" type="submit" disabled={busy}>{busy ? "Kontrol ediliyor…" : "Kodu kullan"}</button>
                </form>
              )}
            </div>
          </li>
        </ol>

        <div className="mt-5 pt-4 border-t border-line flex gap-3">
          <span className="shrink-0 grid place-items-center w-10 h-10 rounded-2xl bg-sky-deep text-ink-soft"><KeyRound size={20} /></span>
          <div className="min-w-0">
            <p className="font-display font-bold">Kimse giremiyorsa</p>
            <p className="text-ink-soft text-sm">
              Projenin kurulu olduğu <strong className="text-ink">bilgisayarda</strong>, proje klasörünün içinde çalıştır. Telefondan çalışmaz.
            </p>
            <code className="block mt-2 text-[13px] bg-sky rounded-xl px-3 py-2 break-words">npm run sifre:sifirla -- e-posta-adresin</code>
          </div>
        </div>
      </Sheet>
    </>
  );
}
