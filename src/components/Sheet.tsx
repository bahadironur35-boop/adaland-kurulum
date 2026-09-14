"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Alt sayfa (mobil) / ortali kart (masaustu).
 * body'ye portal'lanir: egik (transform'lu) kartlarin icinden acilsa bile
 * viewport'a gore konumlanir.
 */
export function Sheet({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-ink/40" aria-label="Kapat" onClick={onClose} />
      <div className="sheet-enter relative w-full md:max-w-lg max-h-[92dvh] overflow-y-auto bg-paper rounded-t-3xl md:rounded-3xl shadow-lift p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button className="btn btn-ghost h-10 w-10 min-h-0 p-0" onClick={onClose} aria-label="Kapat"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
