"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./client";

/**
 * Oturumu sunucuda kapatir, sonra giris sayfasina doner.
 * Ust bar, mobil "Daha" sayfasi ve Ayarlar ayni yolu kullansin diye burada.
 */
export function useLogout() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    // Istek duserse bile giris sayfasina don: kullanici orada tekrar deneyebilir.
    try { await api("/api/auth/logout", { method: "POST" }); } catch {}
    router.push("/giris");
    router.refresh();
  }

  return { logout, busy };
}
