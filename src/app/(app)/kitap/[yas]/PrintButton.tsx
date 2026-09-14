"use client";

import { Printer } from "lucide-react";
import { api } from "@/lib/client";

export function PrintButton({ age }: { age: number }) {
  function go() {
    // Kitap "kaydedildi" sayilir; dogum gunu sonrasi hatirlatma serit ve bildirimi kapanir.
    api("/api/settings", { method: "PATCH", json: { yearbookAge: age } }).catch(() => {});
    window.print();
  }
  return (
    <button className="btn btn-primary shrink-0 whitespace-nowrap" onClick={go}>
      <Printer size={18} /> PDF olarak kaydet
    </button>
  );
}
