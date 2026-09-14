import { prisma } from "./db";
import { purgeExpired } from "./trash";
import { DEMO } from "./demo";
import { demoIcerigiSifirla, sonSifirlamaSiniri } from "./demo-icerik";

/**
 * Tembel bakim: cop kutusunda 30 gunu dolanlari temizler.
 *
 * Neden cron'a ek olarak burada da var: cron kimlik dogrulamasi bir ailede
 * bozulursa (CRON_SECRET yanlis girilmis, Hobby cron kapatilmis) cop sonsuza
 * kadar birikir ve depo dolar. Bu yol biri uygulamayi actigi surece calisir.
 *
 * Gunde en fazla bir kez: Settings.lastHousekeepingAt kapisi. Bir kayit
 * guncelleyip kac satirin degistigine bakiyoruz; iki istek ayni anda gelirse
 * yalnizca biri gecer (kosulu UPDATE, uygulama tarafinda kilit gerekmez).
 *
 * DEMODA ayrica gunluk sifirlama: ziyaretcilerin ekledigi/degistirdigi metin
 * icerigi gider, Zeynep'in icerigi geri gelir. Kapi gece 03:00 sinirina baglı
 * (cron'a degil): sifirlama gunun ilk ziyaretcisinde olur, yani kimse sayfayi
 * gezerken ayagi altindan cekilmez. Cron da ayni kapidan gectigi icin gunde
 * bir kezden fazla calisamaz.
 */
const GUN_MS = 24 * 60 * 60 * 1000;

export async function tembelBakim(): Promise<void> {
  try {
    const esik = DEMO ? sonSifirlamaSiniri() : new Date(Date.now() - GUN_MS);
    const r = await prisma.settings.updateMany({
      where: { id: 1, OR: [{ lastHousekeepingAt: null }, { lastHousekeepingAt: { lt: esik } }] },
      data: { lastHousekeepingAt: new Date() },
    });
    if (r.count === 0) return; // bugun zaten yapilmis
    if (DEMO) {
      await demoIcerigiSifirla(prisma);
      console.log("[bakim] demo içeriği sıfırlandı");
    }
    const n = await purgeExpired();
    if (n > 0) console.log("[bakim] çöp kutusundan kalıcı silinen:", n);
  } catch (e) {
    // Bakim asla sayfayi bozmaz.
    console.error("[bakim]", e);
  }
}
