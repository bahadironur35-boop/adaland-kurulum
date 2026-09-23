import webPush from "web-push";
import { getSecret } from "./secrets";
import { prisma } from "./db";

/**
 * Web push: aylik hatirlatma gibi nadir bildirimler.
 * VAPID cifti veritabaninda (AppSecret "VAPID"); yoksa ilk cagrida uretilir.
 * Cift TEK kayit olarak saklanir: iki ayri anahtar olsaydi iki lambda yarisip
 * uyumsuz bir cift birakabilirdi.
 * DIKKAT: cift degisirse mevcut tum abonelikler sessizce olur. Bu yuzden env'deki
 * anahtarlar varsa onlar kazanir ve DB'ye kopyalanir (getSecret kurali).
 * Gecersiz (410/404) abonelikler gonderim sirasinda silinir.
 */
type Vapid = { publicKey: string; privateKey: string };

async function vapid(): Promise<Vapid> {
  const envPub = process.env.VAPID_PUBLIC_KEY;
  const envPriv = process.env.VAPID_PRIVATE_KEY;
  const raw = await getSecret("VAPID", {
    env: envPub && envPriv ? JSON.stringify({ publicKey: envPub, privateKey: envPriv }) : undefined,
    generate: () => JSON.stringify(webPush.generateVAPIDKeys()),
  });
  return JSON.parse(raw) as Vapid;
}

/** Tarayicinin abone olurken kullandigi acik anahtar; Ayarlar sayfasi prop olarak gecirir. */
export async function getVapidPublicKey(): Promise<string> {
  return (await vapid()).publicKey;
}

async function configure(): Promise<boolean> {
  try {
    const k = await vapid();
    // web-push gecerli bir iletisim adresi ister (RFC 8292). Kurulumda ilk ebeveynin
    // e-postasi yazilir; yoksa push servisinin kabul ettigi notr bir adres.
    const s = await prisma.settings.findUnique({ where: { id: 1 }, select: { contactEmail: true } });
    webPush.setVapidDetails(`mailto:${s?.contactEmail ?? "aile@example.com"}`, k.publicKey, k.privateKey);
    return true;
  } catch (e) {
    console.error("[push] VAPID yok:", e);
    return false;
  }
}

export type PushPayload = { title: string; body: string; url?: string };

export async function sendPush(parentIds: string[] | "all", payload: PushPayload): Promise<{ sent: number; removed: number }> {
  if (!(await configure())) return { sent: 0, removed: 0 };
  const subs = await prisma.pushSubscription.findMany({ where: parentIds === "all" ? {} : { parentId: { in: parentIds } } });
  let sent = 0;
  let removed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webPush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          removed++;
        } else {
          console.error("[push]", code, e);
        }
      }
    }),
  );
  return { sent, removed };
}
