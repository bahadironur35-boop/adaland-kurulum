import { z } from "zod";
import { handle } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireParent } from "@/lib/auth";

const sub = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(300), auth: z.string().min(5).max(100) }),
});

/** Bu cihazin push aboneligini kaydet. */
export async function POST(req: Request) {
  return handle(async () => {
    const me = await requireParent();
    const d = sub.parse(await req.json());
    await prisma.pushSubscription.upsert({
      where: { endpoint: d.endpoint },
      update: { parentId: me.id, p256dh: d.keys.p256dh, auth: d.keys.auth },
      create: { parentId: me.id, endpoint: d.endpoint, p256dh: d.keys.p256dh, auth: d.keys.auth },
    });
    return { ok: true };
  });
}

/** Bu cihazin aboneligini sil. */
export async function DELETE(req: Request) {
  return handle(async () => {
    const me = await requireParent();
    const { endpoint } = z.object({ endpoint: z.string().url() }).parse(await req.json());
    await prisma.pushSubscription.deleteMany({ where: { endpoint, parentId: me.id } });
    return { ok: true };
  });
}
