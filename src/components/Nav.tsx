"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, MessageCircle, Camera, Clapperboard, Star, Ruler, Settings, Ellipsis, Heart, Search, Mic, Mail, BookOpen, Images, Gamepad2, Trash2, LogOut } from "lucide-react";
import clsx from "clsx";
import { Sheet } from "./Sheet";
import { RefreshButton } from "./RefreshButton";
import { useLogout } from "@/lib/logout";
import { useBrand } from "@/lib/brand-client";

const MAIN = [
  { href: "/", label: "Akış", Icon: Sparkles },
  { href: "/sozler", label: "Sözler", Icon: MessageCircle },
  { href: "/fotograflar", label: "Fotoğraflar", Icon: Camera },
  { href: "/videolar", label: "Videolar", Icon: Clapperboard },
  { href: "/ilkler", label: "İlkler", Icon: Star },
  { href: "/buyume", label: "Büyüme", Icon: Ruler },
  { href: "/sesler", label: "Sesler", Icon: Mic },
  { href: "/mektuplar", label: "Mektuplar", Icon: Mail },
  { href: "/kitap", label: "Kitap", Icon: BookOpen },
  { href: "/slayt", label: "Slayt", Icon: Images },
  // Dis origin (oyun.bugunnededi.com) ama SAYFA ICINDE iframe olarak gomulu —
  // ayri sekme/PWA degil, diger sekmeler gibi normal bir Link.
  { href: "/oyun-odasi", label: "Oyun Odası", Icon: Gamepad2 },
] as const;

const TOOLS = [
  { href: "/favoriler", label: "Favoriler", Icon: Heart },
  { href: "/ara", label: "Ara", Icon: Search },
  { href: "/ayarlar", label: "Ayarlar", Icon: Settings },
] as const;

const TRASH = { href: "/cop", label: "Çöp kutusu", Icon: Trash2 } as const;

const MOBILE_MAIN = MAIN.slice(0, 4);
// slice kullanildi (sabit indeksler degil): MAIN'e yeni sayfa eklenince
// otomatik burada da cikar — daha once elle indekslenmisti ve bir madde
// eklenirse "Daha" sayfasinda sessizce kaybolurdu.
const MOBILE_MORE = [...MAIN.slice(4), TOOLS[0], TRASH, TOOLS[2]];

export function Nav({ name }: { name: string }) {
  const b = useBrand();
  const path = usePathname();
  const [more, setMore] = useState(false);
  const { logout, busy } = useLogout();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const moreActive = MOBILE_MORE.some((i) => active(i.href));

  return (
    <>
      {/* Ust bar: logo, masaustunde ana sayfalar, sagda araclar */}
      <header className="sticky top-0 z-30 bg-sky/85 backdrop-blur border-b border-line/70 print:hidden">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo.svg" alt="" width={30} height={30} className="rounded-lg" />
            <span className="display text-2xl font-bold leading-none">{b.site}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-0.5" aria-label="Ana menü">
            {MAIN.map(({ href, label, Icon }) => (
              <Link key={href} href={href}
                className={clsx("btn h-10 min-h-0 px-2.5 text-[14px]", active(href) ? "btn-soft" : "btn-ghost")}
                aria-current={active(href) ? "page" : undefined}>
                <Icon size={17} strokeWidth={2.4} />
                <span className="hidden lg:inline">{label}</span>
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-0.5">
            <RefreshButton />
            {TOOLS.map(({ href, label, Icon }) => (
              <Link key={href} href={href} aria-label={label} title={label} aria-current={active(href) ? "page" : undefined}
                className={clsx("btn h-10 w-10 min-h-0 p-0", active(href) ? "btn-soft text-crayon" : "btn-ghost", href !== "/ara" && "hidden md:inline-flex")}>
                <Icon size={19} strokeWidth={2.4} fill={href === "/favoriler" && active(href) ? "currentColor" : "none"} />
              </Link>
            ))}
            <button onClick={logout} disabled={busy} aria-label="Çıkış yap" title="Çıkış yap"
              className="btn btn-ghost h-10 w-10 min-h-0 p-0 hidden md:inline-flex text-ink-soft">
              <LogOut size={19} strokeWidth={2.4} />
            </button>
            <span className="md:hidden font-hand text-lg text-ink-soft ml-1">Merhaba {name}</span>
          </div>
        </div>
      </header>

      {/* Mobil alt cubuk: 4 ana sayfa + Daha */}
      <nav className="md:hidden print:hidden fixed bottom-0 inset-x-0 z-30 bg-paper border-t border-line pb-[env(safe-area-inset-bottom)]"
        aria-label="Ana menü">
        <ul className="grid grid-cols-5">
          {MOBILE_MAIN.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link href={href} aria-current={active(href) ? "page" : undefined}
                className={clsx("flex flex-col items-center gap-0.5 py-2 min-h-[56px] text-[11px] font-semibold",
                  active(href) ? "text-crayon" : "text-ink-faint")}>
                <span className={clsx("rounded-full px-3 py-1", active(href) && "bg-crayon-soft")}>
                  <Icon size={22} strokeWidth={2.4} />
                </span>
                {label}
              </Link>
            </li>
          ))}
          <li>
            <button onClick={() => setMore(true)} aria-haspopup="dialog" aria-expanded={more}
              className={clsx("w-full flex flex-col items-center gap-0.5 py-2 min-h-[56px] text-[11px] font-semibold", moreActive ? "text-crayon" : "text-ink-faint")}>
              <span className={clsx("rounded-full px-3 py-1", moreActive && "bg-crayon-soft")}>
                <Ellipsis size={22} strokeWidth={2.4} />
              </span>
              Daha
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={more} onClose={() => setMore(false)} title="Daha">
        <ul className="grid grid-cols-3 gap-3">
          {MOBILE_MORE.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link href={href} onClick={() => setMore(false)}
                className={clsx("flex flex-col items-center gap-2 rounded-2xl p-4 font-display font-semibold text-sm", active(href) ? "bg-crayon-soft text-crayon" : "bg-sky text-ink")}>
                <Icon size={26} strokeWidth={2.2} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4 pt-4 border-t border-line">
          <button onClick={logout} disabled={busy}
            className="btn btn-ghost w-full justify-center text-ink-soft">
            <LogOut size={18} /> Çıkış yap
          </button>
        </div>
      </Sheet>
    </>
  );
}
