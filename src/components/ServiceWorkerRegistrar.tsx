"use client";

import { useEffect } from "react";

/** sw.js'i kaydeder (paylas-al ve push icin). Sayfa onbellegi yapmaz. */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("[sw] kayıt başarısız", e));
  }, []);
  return null;
}
