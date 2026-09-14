import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { sessionSecret } from "./secrets";

/**
 * Passkey (Face ID / parmak izi) icin ortak parcalar.
 * RP kimligi istegin host'undan turetilir: canlida uygulamanin alan adi, yerelde localhost.
 * Challenge 5 dakikalik imzali cerezde tasinir; sunucu tarafinda saklama gerekmez.
 */
const COOKIE = "adaland_webauthn";

export async function rp(): Promise<{ rpID: string; origin: string }> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const rpID = host.split(":")[0];
  const proto = h.get("x-forwarded-proto") ?? (rpID === "localhost" ? "http" : "https");
  return { rpID, origin: `${proto}://${host}` };
}

export async function rememberChallenge(challenge: string, extra: Record<string, string> = {}) {
  const token = await new SignJWT({ challenge, ...extra }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("5m").sign(await sessionSecret());
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 300 });
}

export async function takeChallenge(): Promise<{ challenge: string; [k: string]: unknown } | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  jar.delete(COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await sessionSecret());
    return typeof payload.challenge === "string" ? (payload as { challenge: string }) : null;
  } catch {
    return null;
  }
}

/** Cihaz etiketi tahmini: "iPhone", "Android", "Mac"... */
export function deviceLabel(ua: string | null): string {
  const u = ua ?? "";
  if (/iPhone/.test(u)) return "iPhone";
  if (/iPad/.test(u)) return "iPad";
  if (/Android/.test(u)) return "Android";
  if (/Macintosh/.test(u)) return "Mac";
  if (/Windows/.test(u)) return "Windows bilgisayar";
  return "Cihaz";
}
