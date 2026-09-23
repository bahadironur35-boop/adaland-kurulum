"use client";

import { useState } from "react";
import { MessageCirclePlus } from "lucide-react";
import { Sheet } from "./Sheet";
import { SayingForm } from "./SayingForm";
import { useBrand } from "@/lib/brand-client";

/** Her sayfada duran buyuk "<ad> ne dedi?" dugmesi: soz soylendigi an 10 saniyede kayit. */
export function QuickAdd() {
  const b = useBrand();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="btn btn-primary print:hidden fixed z-40 right-4 bottom-[calc(64px+env(safe-area-inset-bottom)+12px)] md:bottom-8 md:right-8 h-14 px-5 text-lg shadow-lift"
        aria-label="Yeni söz ekle">
        <MessageCirclePlus size={24} strokeWidth={2.4} />
        {b.ad} ne dedi?
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`${b.ad} ne dedi?`}>
        <SayingForm onDone={() => setOpen(false)} />
      </Sheet>
    </>
  );
}
