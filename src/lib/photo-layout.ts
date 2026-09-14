"use client";

import { useSyncExternalStore } from "react";

/**
 * Akista ayni gunun fotograflari nasil dursun? Tercih cihazda saklanir,
 * gorunum temasiyla ayni mantik ([[ThemeToggle]] ile ayni desen).
 */
export type PhotoLayout = "fan" | "grid" | "deck";

export const PHOTO_LAYOUTS: { value: PhotoLayout; label: string; hint: string }[] = [
  { value: "fan", label: "Yelpaze", hint: "Üçü de görünür, kenarları biner" },
  { value: "grid", label: "Izgara", hint: "Yan yana, eşit kutular" },
  { value: "deck", label: "Deste", hint: "Üst üste, en öndeki görünür" },
];

const KEY = "adaland-foto-yerlesim";
const DEFAULT: PhotoLayout = "fan";
const listeners = new Set<() => void>();

function read(): PhotoLayout {
  try {
    const v = localStorage.getItem(KEY);
    return PHOTO_LAYOUTS.some((l) => l.value === v) ? (v as PhotoLayout) : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function setPhotoLayout(v: PhotoLayout) {
  try { localStorage.setItem(KEY, v); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Sunucuda varsayilan, istemcide kayitli deger: hydration uyusmazligi olmaz. */
export function usePhotoLayout(): PhotoLayout {
  return useSyncExternalStore(subscribe, read, () => DEFAULT);
}
