import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import type { ShareLink } from "@prisma/client";

/** 24 bayt rastgele -> 32 karakter base64url. Tahmin edilemez; ayrica hiz siniri gerektirmez. */
export function newToken() {
  return randomBytes(24).toString("base64url");
}

export type ShareStatus = "active" | "expired" | "revoked";

export function shareStatus(l: Pick<ShareLink, "expiresAt" | "revokedAt">, now = new Date()): ShareStatus {
  if (l.revokedAt) return "revoked";
  if (l.expiresAt && l.expiresAt <= now) return "expired";
  return "active";
}

/**
 * Akraba sayfasinin kapisi. Gecerliyse goruntulenmeyi sayar ve linki dondurur.
 * Gecersizse null: sayfa nazik bir mesaj gosterir, neden oldugunu soylemez
 * (iptal mi, suresi mi doldu, hic olmadi mi — disaridan ayirt edilmesin).
 */
export async function openShareLink(token: string): Promise<ShareLink | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const link = await prisma.shareLink.findUnique({ where: { token } });
  if (!link || shareStatus(link) !== "active") return null;
  await prisma.shareLink.update({
    where: { id: link.id },
    data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
  });
  return link;
}
