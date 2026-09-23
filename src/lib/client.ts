"use client";

/** Tarayici tarafi fetch yardimcisi: hata mesajini JSON'dan cikarip firlatir. */
export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...(rest.headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `İstek başarısız (${res.status})`);
  return data as T;
}

/** Kisa konfeti: kayit basarili oldugunda. */
export function confetti() {
  if (typeof document === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#f0565e", "#ffc531", "#5db86a", "#7b5fd8", "#ffffff"];
  for (let i = 0; i < 28; i++) {
    const el = document.createElement("span");
    el.className = "confetti-piece";
    el.style.left = `${Math.random() * 100}vw`;
    el.style.background = colors[i % colors.length];
    el.style.animationDelay = `${Math.random() * 0.25}s`;
    el.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }
}
