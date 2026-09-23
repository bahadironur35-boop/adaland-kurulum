"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useBrand } from "@/lib/brand-client";

export function LoginForm() {
  const b = useBrand();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/login", { method: "POST", json: { email, password } });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş yapılamadı.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Giriş formu">
      <div>
        <label className="label" htmlFor="email">E-posta</label>
        <input id="email" className="field" type="email" autoComplete="email" inputMode="email" required
          value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="password">Şifre</label>
        <input id="password" className="field" type="password" autoComplete="current-password" required
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-crayon text-sm font-semibold">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy} type="submit">
        {busy ? <span className="dots"><span /><span /><span /></span> : `${b.siteYonelme} gir`}
      </button>
    </form>
  );
}
