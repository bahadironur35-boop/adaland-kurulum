"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import clsx from "clsx";

/** Ust cubuktaki kucuk yenile ikonu (iPhone'da asagi cekip yenileme olmadigi icin). */
export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button onClick={() => start(() => router.refresh())} disabled={pending} aria-label="Yenile" title="Yenile"
      className="btn btn-ghost h-10 w-10 min-h-0 p-0">
      <RefreshCw size={18} strokeWidth={2.4} className={clsx(pending && "animate-spin")} />
    </button>
  );
}
