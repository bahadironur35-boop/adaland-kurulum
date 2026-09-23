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
 * Linki dogrular, goruntulenme SAYMAZ.
 *
 * Sayfa disindan gelen makine istekleri (oyun uygulamasinin fotograf ucu) bunu
 * kullanir: aksi halde ebeveynin gordugu "kac kez bakildi" sayaci, hic kimse
 * bakmadan sismis olurdu.
 */
export async function shareLinkCoz(token: string): Promise<ShareLink | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const link = await prisma.shareLink.findUnique({ where: { token } });
  if (!link || shareStatus(link) !== "active") return null;
  return link;
}

/**
 * Akraba sayfasinin kapisi. Gecerliyse goruntulenmeyi sayar ve linki dondurur.
 * Gecersizse null: sayfa nazik bir mesaj gosterir, neden oldugunu soylemez
 * (iptal mi, suresi mi doldu, hic olmadi mi — disaridan ayirt edilmesin).
 */
export async function openShareLink(token: string): Promise<ShareLink | null> {
  const link = await shareLinkCoz(token);
  if (!link) return null;
  await prisma.shareLink.update({
    where: { id: link.id },
    data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
  });
  return link;
}

/**
 * Oyun Odasi (harici, ayri bir uygulama) icin AYRI ve SURESIZ paylasim linki.
 *
 * NEDEN AYRI: oyunlardaki aile fotograflari ozelligi butun akraba paylasim
 * linklerinden BAGIMSIZ olmali. Bir akrabaya verilen link suresi dolar ya da
 * iptal edilirse, oyunlardaki fotograflar da onunla birlikte kaybolmamali —
 * ikisi farkli amaclar, omurleri de farkli olmali.
 *
 * Etiketle ARAR, bulamazsa OLUSTURUR: tekrar cagrilirsa (orn. Nav'daki "Oyun
 * Odasi" dugmesine her tiklamada) ayni link donuyor, her seferinde yeni bir
 * tane turemiyor. Iptal edilirse (revokedAt dolar) bir sonraki cagrida
 * kendiliginden yenisi olusur — kendini onaran bir tasarim.
 */
export const OYUN_ODASI_LINK_ETIKETI = "Oyun Odası";

export async function oyunBaglantisiGetirYaDaOlustur(): Promise<ShareLink> {
  const mevcut = await prisma.shareLink.findFirst({
    where: { label: OYUN_ODASI_LINK_ETIKETI, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (mevcut) return mevcut;
  return prisma.shareLink.create({
    data: { token: newToken(), label: OYUN_ODASI_LINK_ETIKETI, expiresAt: null },
  });
}
