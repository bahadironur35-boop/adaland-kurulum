"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { api } from "@/lib/client";
import { todayStr } from "@/lib/dates";
import { useLogout } from "@/lib/logout";
import { useBrand } from "@/lib/brand-client";
import { ilgi } from "@/lib/turkce";

export function SettingsForms({ birth }: { birth: string }) {
  const b = useBrand();
  const router = useRouter();
  const [birthDate, setBirthDate] = useState(birth);
  const [birthMsg, setBirthMsg] = useState<string | null>(null);
  const [childName, setChildName] = useState(b.ad);
  const [siteName, setSiteName] = useState(b.site);
  const [adMsg, setAdMsg] = useState<string | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const { logout, busy: cikisBusy } = useLogout();

  async function saveNames(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/settings", { method: "PATCH", json: { childName: childName.trim(), siteName: siteName.trim() } });
      setAdMsg("Kaydedildi. Ana ekrandaki uygulama adı bir sonraki eklemede güncellenir.");
      router.refresh();
    } catch (err) {
      setAdMsg(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally { setBusy(false); }
  }

  async function saveBirth(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/settings", { method: "PATCH", json: { birthDate } });
      setBirthMsg("Kaydedildi");
      router.refresh();
    } catch (err) {
      setBirthMsg(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally { setBusy(false); }
  }

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setPwMsg(null);
    try {
      await api("/api/auth/password", { method: "POST", json: { current, next } });
      setPwMsg({ ok: true, text: "Şifre değiştirildi" });
      setCurrent(""); setNext("");
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : "Değiştirilemedi" });
    } finally { setBusy(false); }
  }

  return (
    <>
      <section className="bubble p-5">
        <h2 className="text-xl font-bold mb-1">Adlar</h2>
        <p className="text-ink-soft text-sm mb-3">Çocuğun adı metinlerde çekilir ({ilgi(childName.trim() || b.ad)} sözleri); sayfanın adı ana ekranda ve akraba linkinde görünür.</p>
        <form onSubmit={saveNames} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <div>
            <label className="label" htmlFor="ad-cocuk">Çocuğunuzun adı</label>
            <input id="ad-cocuk" className="field" maxLength={40} required value={childName} onChange={(e) => setChildName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="ad-site">Sayfanın adı</label>
            <input id="ad-site" className="field" maxLength={60} required value={siteName} onChange={(e) => setSiteName(e.target.value)} />
          </div>
          <button className="btn btn-soft" disabled={busy || (childName.trim() === b.ad && siteName.trim() === b.site)} type="submit">Kaydet</button>
        </form>
        {adMsg && <p className="text-sm mt-2 text-ink-soft">{adMsg}</p>}
      </section>

      <section className="bubble p-5">
        <h2 className="text-xl font-bold mb-1">{b.adIlgi} doğum günü</h2>
        <p className="text-ink-soft text-sm mb-3">Her sözün ve fotoğrafın üstündeki yaş çıkartması buradan hesaplanır.</p>
        <form onSubmit={saveBirth} className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="label" htmlFor="birth">Tarih</label>
            <input id="birth" className="field" type="date" max={todayStr()} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
          </div>
          <button className="btn btn-soft" disabled={busy || birthDate === birth} type="submit">Kaydet</button>
        </form>
        {birthMsg && <p className="text-sm mt-2 text-ink-soft">{birthMsg}</p>}
      </section>

      <section className="bubble p-5">
        <h2 className="text-xl font-bold mb-1">Şifreni değiştir</h2>
        <p className="text-ink-soft text-sm mb-3">İlk şifren geçiciydi; kendi şifreni belirle.</p>
        <form onSubmit={changePw} className="space-y-3">
          <div>
            <label className="label" htmlFor="pw-cur">Mevcut şifre</label>
            <input id="pw-cur" className="field" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="pw-new">Yeni şifre <span className="font-normal text-ink-faint">(en az 8 karakter)</span></label>
            <input id="pw-new" className="field" type="password" autoComplete="new-password" minLength={8} required value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          {pwMsg && <p role="alert" className={`text-sm font-semibold ${pwMsg.ok ? "text-grass" : "text-crayon"}`}>{pwMsg.text}</p>}
          <button className="btn btn-soft" disabled={busy} type="submit">Şifreyi değiştir</button>
        </form>
      </section>

      <div className="pt-2">
        <button onClick={logout} disabled={cikisBusy} className="btn btn-ghost text-ink-soft"><LogOut size={18} /> Çıkış yap</button>
      </div>
    </>
  );
}
