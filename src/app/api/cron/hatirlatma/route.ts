import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPush } from "@/lib/push";
import { careStatus } from "@/lib/care";
import { purgeExpired } from "@/lib/trash";
import { getBrand } from "@/lib/brand";
import { ilgi } from "@/lib/turkce";
import { DEMO } from "@/lib/demo";
import { tembelBakim } from "@/lib/bakim";

/**
 * Gunluk cron (vercel.json). Kural: son 21 gundur hicbir sey eklenmediyse ve son
 * hatirlatmadan bu yana 30 gun gectiyse, herkese tek bir nazik bildirim.
 *
 * KIMLIK DOGRULAMA - ikili kabul:
 * - CRON_SECRET env'i VARSA Bearer eslesmesi zorunlu (Vercel bu basligi yalnizca
 *   env tanimliysa gonderir).
 * - YOKSA (Deploy Button ile kurulan aile hicbir env girmiyor) durum korumali yola
 *   dusuluyor. Kimliksiz cagri zarar veremez: purgeExpired yalnizca deletedAt'i
 *   30 gunu dolmus kayitlari siler, bildirimler de 30 gunluk kapilarla sinirli.
 * - x-vercel-cron-schedule basligi kimlik dogrulama DEGILDIR: taklit edilemezligi
 *   belgelenmemis. Bot filtresi olarak bile guvenilmemeli.
 *
 * Cevap govdesi bilerek opak: quietDays gibi degerler ailenin kac gundur icerik
 * eklemedigini kimliksiz cagirana soylerdi.
 */
const QUIET_DAYS = 21;
const MIN_GAP_DAYS = 30;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  // Demoda gunluk is sifirlamadan ibaret; hatirlatma anlamsiz (kime gidecek?).
  // Asil sifirlama gunun ilk ziyaretcisinde tembel yoldan olur; bu cagri o gun
  // hic ziyaretci gelmediyse devreye girer (ayni 03:00 kapisi, cift calismaz).
  if (DEMO) {
    await tembelBakim();
    return NextResponse.json({ ok: true });
  }

  const now = Date.now();
  // Cop kutusunda 30 gunu dolanlari kalici sil
  const purged = await purgeExpired().catch((e) => { console.error("[cron] cop temizligi", e); return 0; });

  const brand = await getBrand();
  // Kurulum tamamlanmadiysa hatirlatilacak bir sey de yok.
  if (!brand) {
    console.log("[cron] kurulum yapilmamis, atlandi. purged:", purged);
    return NextResponse.json({ ok: true });
  }

  const [s, p, v, m, settings] = await Promise.all([
    prisma.saying.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.photo.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.video.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.milestone.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);
  const last = Math.max(0, ...[s, p, v, m].map((r) => r?.createdAt.getTime() ?? 0));
  const quietDays = last ? (now - last) / 86_400_000 : Infinity;
  const gapDays = settings?.lastReminderAt ? (now - settings.lastReminderAt.getTime()) / 86_400_000 : Infinity;

  // Bakim: yedek ve yil kitabi hatirlatmasi, sadece careReminders acik olanlara, ayda en fazla bir
  let care: { sent: number; removed: number } | null = null;
  const c = await careStatus(brand.birthDate);
  const careGap = settings?.lastCareReminderAt ? (now - settings.lastCareReminderAt.getTime()) / 86_400_000 : Infinity;
  if ((c.backupDue || c.yearbookDue !== null) && careGap >= MIN_GAP_DAYS) {
    const parents = await prisma.parent.findMany({ where: { careReminders: true }, select: { id: true } });
    const parts = [
      c.yearbookDue !== null ? `${ilgi(brand.childName)} ${c.yearbookDue} yaş kitabını PDF'e kaydet` : null,
      c.backupDue ? "yıllık yedeği al" : null,
    ].filter(Boolean);
    care = await sendPush(parents.map((p) => p.id), {
      title: `${brand.siteName} bakım`,
      body: `Doğum günü geçti, zamanı geldi: ${parts.join(" ve ")} 📦`,
      url: c.yearbookDue !== null ? `/kitap/${c.yearbookDue}` : "/ayarlar#yedek",
    });
    await prisma.settings.updateMany({ where: { id: 1 }, data: { lastCareReminderAt: new Date() } });
  }

  if (quietDays < QUIET_DAYS || gapDays < MIN_GAP_DAYS) {
    console.log("[cron] sessizlik hatirlatmasi atlandi.", { purged, care, quietDays: Math.round(quietDays) });
    return NextResponse.json({ ok: true });
  }
  const r = await sendPush("all", {
    title: brand.siteName,
    body: `Bu ay ${brand.childName} ne dedi? 💬 Bir söz ya da fotoğraf eklemeye ne dersin?`,
    url: "/",
  });
  // updateMany, upsert DEGIL: upsert kurulumdan once calisirsa sahte bir dogum
  // tarihiyle Settings satiri yaratip kurulum sihirbazini bozardi.
  await prisma.settings.updateMany({ where: { id: 1 }, data: { lastReminderAt: new Date() } });
  console.log("[cron] sessizlik hatirlatmasi gonderildi.", { ...r, purged, care });
  return NextResponse.json({ ok: true });
}
