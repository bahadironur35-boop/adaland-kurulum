"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const MIN_GAP_MS = 20_000;

/**
 * Uygulama arka plandan one gelince (telefon kilidi acildi, sekmeye donuldu)
 * sunucu verisini tazeler. Baskasinin eklediklerini elle yenilemeden gorursun.
 * 20 sn'den sik tetiklenmez.
 */
export function AutoRefresh() {
  const router = useRouter();
  const last = useRef(0);

  useEffect(() => {
    last.current = Date.now();
    const maybe = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last.current < MIN_GAP_MS) return;
      last.current = now;
      router.refresh();
    };
    document.addEventListener("visibilitychange", maybe);
    window.addEventListener("focus", maybe);
    window.addEventListener("pageshow", maybe);
    return () => {
      document.removeEventListener("visibilitychange", maybe);
      window.removeEventListener("focus", maybe);
      window.removeEventListener("pageshow", maybe);
    };
  }, [router]);

  return null;
}
