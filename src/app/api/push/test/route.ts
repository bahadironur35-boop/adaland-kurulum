import { handle } from "@/lib/api";
import { requireParent } from "@/lib/auth";
import { sendPush } from "@/lib/push";
import { requireBrand } from "@/lib/brand";

/** Kendi cihazlarina deneme bildirimi. */
export async function POST() {
  return handle(async () => {
    const me = await requireParent();
    const brand = await requireBrand();
    const r = await sendPush([me.id], { title: brand.siteName, body: `Bildirimler çalışıyor 🎉 ${brand.childName} ne dedi?`, url: "/" });
    return r;
  });
}
