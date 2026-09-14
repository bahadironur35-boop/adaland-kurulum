"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { api } from "@/lib/client";
import { useBrand } from "@/lib/brand-client";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = "unsupported" | "checking" | "off" | "on" | "denied";

/**
 * Aylik hatirlatma bildirimleri: cihaz basina acilir.
 * VAPID acik anahtari sunucudan prop olarak gelir; NEXT_PUBLIC_* build'e gomulu
 * oldugu icin ilk calistirmada uretilen bir deger oraya asla giremezdi.
 */
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const b = useBrand();
  const [state, setState] = useState<State>("checking");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window) || !publicKey) {
        if (alive) setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") { if (alive) setState("denied"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (alive) setState(sub ? "on" : "off");
    })().catch(() => alive && setState("unsupported"));
    return () => { alive = false; };
  }, [publicKey]);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "denied" : "off"); setMsg("İzin verilmedi."); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey!) });
      const j = sub.toJSON();
      await api("/api/push/subscribe", { method: "POST", json: { endpoint: j.endpoint, keys: j.keys } });
      setState("on");
      setMsg("Bu cihazda hatırlatmalar açık.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Açılamadı.");
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api("/api/push/subscribe", { method: "DELETE", json: { endpoint: sub.endpoint } }).catch(() => {});
        await sub.unsubscribe();
      }
      setState("off");
      setMsg("Kapatıldı.");
    } finally { setBusy(false); }
  }

  async function test() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ sent: number }>("/api/push/test", { method: "POST" });
      setMsg(r.sent > 0 ? "Deneme bildirimi gönderildi; birkaç saniye içinde gelmeli." : "Gönderilemedi; önce bildirimleri aç.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Gönderilemedi.");
    } finally { setBusy(false); }
  }

  return (
    <section className="bubble p-5">
      <h2 className="text-xl font-bold mb-1">Hatırlatma</h2>
      <p className="text-ink-soft text-sm mb-3">
        Üç haftadır hiçbir şey eklenmediyse ayda en fazla bir kez &quot;{b.ad} ne dedi?&quot; diye hatırlatır. Cihaz başına açılır; iPhone&apos;da önce {b.siteBelirtme} ana ekrana eklemek gerekir.
      </p>
      {state === "checking" && <span className="dots text-ink-faint"><span /><span /><span /></span>}
      {state === "unsupported" && <p className="text-ink-faint text-sm">Bu tarayıcı bildirim desteklemiyor. iPhone&apos;da Safari ile ana ekrana ekleyip {b.siteBelirtme} oradan aç.</p>}
      {state === "denied" && <p className="text-crayon text-sm">Bildirim izni bu tarayıcıda engellenmiş; tarayıcı ayarlarından açmak gerekir.</p>}
      {(state === "off" || state === "on") && (
        <div className="flex flex-wrap gap-2">
          {state === "off" ? (
            <button className="btn btn-primary" onClick={enable} disabled={busy}><Bell size={18} /> Hatırlatmaları aç</button>
          ) : (
            <>
              <button className="btn btn-soft" onClick={test} disabled={busy}><Send size={18} /> Deneme bildirimi</button>
              <button className="btn btn-ghost" onClick={disable} disabled={busy}><BellOff size={18} /> Kapat</button>
            </>
          )}
        </div>
      )}
      {msg && <p className="text-sm mt-2 text-ink-soft">{msg}</p>}
    </section>
  );
}
