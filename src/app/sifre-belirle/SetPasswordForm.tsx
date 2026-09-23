"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useLogout } from "@/lib/logout";

export function SetPasswordForm() {
  const router = useRouter();
  const { logout } = useLogout();
  const [next, setNext] = useState("");
  const [tekrar, setTekrar] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    if (next !== tekrar) { setHata("İki şifre birbirini tutmuyor."); return; }
    setBusy(true);
    setHata(null);
    try {
      await api("/api/auth/sifre-belirle", { method: "POST", json: { next } });
      router.push("/");
      router.refresh();
    } catch (err) {
      setHata(err instanceof Error ? err.message : "Kaydedilemedi.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={kaydet} className="space-y-3">
      <div>
        <label className="label" htmlFor="yeni">Yeni şifre <span className="font-normal text-ink-faint">(en az 8 karakter)</span></label>
        <input id="yeni" className="field" type="password" autoComplete="new-password" minLength={8} required
          autoFocus value={next} onChange={(e) => setNext(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="tekrar">Bir daha yaz</label>
        <input id="tekrar" className="field" type="password" autoComplete="new-password" minLength={8} required
          value={tekrar} onChange={(e) => setTekrar(e.target.value)} />
      </div>
      {hata && <p role="alert" className="text-crayon text-sm font-semibold">{hata}</p>}
      <button className="btn btn-primary w-full" disabled={busy} type="submit">
        {busy ? "Kaydediliyor…" : "Şifremi belirle ve devam et"}
      </button>
      <button type="button" onClick={logout} className="block mx-auto text-sm text-ink-soft underline underline-offset-2">
        Çıkış yap
      </button>
    </form>
  );
}
