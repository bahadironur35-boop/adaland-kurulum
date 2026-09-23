import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth";

/** API rotalarinda tekrar eden try/catch'i tek yerde toplar. */
export async function handle<T>(fn: () => Promise<T>) {
  try {
    return NextResponse.json((await fn()) ?? { ok: true });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof ZodError) {
      const first = err.issues[0];
      return NextResponse.json(
        { error: first ? `${first.path.join(".")}: ${first.message}` : "Geçersiz veri." },
        { status: 400 },
      );
    }
    console.error("[api]", err);
    return NextResponse.json({ error: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}

/**
 * PATCH icin: zod .partial() semasi .default() alanlarini gonderilmese bile
 * varsayilana sifirlar. Sadece istemcinin gercekten gonderdigi anahtarlari al.
 */
export function pickSentKeys<T extends Record<string, unknown>>(parsed: T, raw: unknown): Partial<T> {
  if (!raw || typeof raw !== "object") return {};
  const out: Partial<T> = {};
  for (const k of Object.keys(parsed) as (keyof T)[]) {
    if (Object.prototype.hasOwnProperty.call(raw, k)) out[k] = parsed[k];
  }
  return out;
}
