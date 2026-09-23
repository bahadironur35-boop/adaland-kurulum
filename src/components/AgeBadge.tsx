import clsx from "clsx";
import { ageLabel } from "@/lib/dates";

/** Kose cikartmasi: "2 yas 4 aylik". Sunucu ve istemcide calisir. */
export function AgeBadge({ birth, at, tone = "sun", className }: {
  birth: string;
  at: string;
  tone?: "sun" | "grape" | "grass";
  className?: string;
}) {
  return (
    <span className={clsx("sticker inline-block px-2.5 py-1 text-[13px] font-bold", tone === "grape" && "sticker-grape", tone === "grass" && "sticker-grass", className)}>
      {ageLabel(birth, at)}
    </span>
  );
}
