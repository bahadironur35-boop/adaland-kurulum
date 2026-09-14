import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { sessionSecret } from "./secrets";

const COOKIE = "adaland_session";
const MAX_AGE = 60 * 60 * 24 * 90; // 90 gun - aile sitesi, sik giris istemeyelim


export type SessionParent = { id: string; email: string; name: string; mustChangePassword: boolean };

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
export async function verifyPassword(password: string, stored: string) {
  return bcrypt.compare(password, stored);
}

export async function createSession(parent: { id: string; email: string; name: string }) {
  const token = await new SignJWT({ email: parent.email, name: parent.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(parent.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(await sessionSecret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionParent(): Promise<SessionParent | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await sessionSecret());
    if (!payload.sub) return null;
    const p = await prisma.parent.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, sessionsValidFrom: true, mustChangePassword: true },
    });
    if (!p) return null;
    // Sifre sifirlandiysa o andan onceki cerezler olur: kayip telefondaki
    // 90 gunluk oturum, yeni sifre verilir verilmez kapanir.
    // JWT'nin iat'i saniye hassasiyetinde, o yuzden esik de saniyeye yuvarlanir;
    // yoksa sifirladiktan hemen sonra girenin oturumu da elenirdi.
    if (p.sessionsValidFrom) {
      const esik = Math.floor(p.sessionsValidFrom.getTime() / 1000);
      if ((payload.iat ?? 0) < esik) return null;
    }
    return { id: p.id, email: p.email, name: p.name, mustChangePassword: p.mustChangePassword };
  } catch {
    return null;
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Yazma yapan her API ucu bunu cagirir. Sidebar'da gizlemek yetmez, kapi burada. */
export async function requireParent(): Promise<SessionParent> {
  const p = await requireParentAllowTemp();
  // Sayfayi yonlendirmek yetmez, kapi burada da dursun: gecici sifreyle
  // hicbir yazma ucu calismasin.
  if (p.mustChangePassword) throw new HttpError(403, "Önce kendi şifreni belirle.");
  return p;
}

/** Yalnizca zorunlu sifre belirleme ucu icin: bayrak acikken de gecer. */
export async function requireParentAllowTemp(): Promise<SessionParent> {
  const p = await getSessionParent();
  if (!p) throw new HttpError(401, "Oturum bulunamadı.");
  return p;
}
