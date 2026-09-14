"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { Fingerprint } from "lucide-react";
import { api } from "@/lib/client";
import { passkeyHatasi } from "@/lib/webauthn-errors";

/** Giris sayfasindaki "Face ID / parmak izi ile gir" dugmesi. Passkey yoksa nazik hata verir. */
export function PasskeyLogin() {
  const router = useRouter();
  // Sunucuda false, istemcide gercek deger: hydration uyusmazligi olmadan.
  const supported = useSyncExternalStore(() => () => {}, () => browserSupportsWebAuthn(), () => false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const options = await api<Parameters<typeof startAuthentication>[0]["optionsJSON"]>("/api/passkey/login", { method: "POST", json: { step: "options" } });
      const response = await startAuthentication({ optionsJSON: options });
      await api("/api/passkey/login", { method: "POST", json: { step: "verify", response } });
      router.push("/");
      router.refresh();
    } catch (err) {
      // NotAllowedError hem "vazgectim" hem "kayitli cihaz yok" demek; ayirt edilemiyor.
      // Sessiz kalmak dugmeyi bozuk gosterir, o yuzden ikisini de kapsayan Turkce metin veriyoruz.
      setError(passkeyHatasi(err, "giris"));
      setBusy(false);
    }
  }

  if (!supported) return null;
  return (
    <div className="mt-4">
      <div className="flex items-center gap-3 my-3 text-ink-faint text-xs"><span className="flex-1 h-px bg-line" />ya da<span className="flex-1 h-px bg-line" /></div>
      <button type="button" onClick={go} disabled={busy} className="btn btn-soft w-full">
        <Fingerprint size={20} className="text-grape" /> {busy ? "Doğrulanıyor…" : "Face ID / parmak izi ile gir"}
      </button>
      {error && <p role="alert" className="text-crayon text-sm font-semibold mt-2">{error}</p>}
    </div>
  );
}
