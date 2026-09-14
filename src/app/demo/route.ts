import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { DEMO, DEMO_AD_COOKIE, DEMO_AD_OMRU, temizAd } from "@/lib/demo";
import { ilgi } from "@/lib/turkce";

/**
 * Demoya giris kapisi: GET /demo?ad=Zeynep
 *
 * Tanitim sayfasindaki isim formu buraya gonderir. Ziyaretcinin yazdigi ad
 * demonun cocuk adi olur, demo ebeveyni olarak oturum acilir, akisa dusulur.
 * Boylece kisi kendi cocugunun adini uygulamanin icinde gorur.
 *
 * Ad veritabanina DEGIL cereze yazilir: getBrand() demoda cerezi okur, yani
 * her ziyaretci kendi adini gorur, digerlerinin adini asla. Icerik ortak.
 *
 * DEMO degilse 404: ailelerin kurulumunda bu uc yok sayilir.
 */
export async function GET(req: Request) {
  if (!DEMO) return new NextResponse("Bulunamadı", { status: 404 });

  const url = new URL(req.url);
  const ad = temizAd(url.searchParams.get("ad"), url.searchParams.get("sayfa"));

  const ebeveyn = await prisma.parent.findFirst({ orderBy: { createdAt: "asc" } });
  if (!ebeveyn) return new NextResponse("Demo henüz doldurulmamış.", { status: 503 });

  const jar = await cookies();
  // Adsiz gelen (karekod, dogrudan adres) once adini yazsin; yoksa uydurma
  // ailenin adiyla karsilasiyor ve kisisellestirme kayboluyor. Daha once ad
  // yazmis olan ya da bilerek atlayan dogrudan gecer.
  if (!ad && !jar.get(DEMO_AD_COOKIE) && url.searchParams.get("atla") !== "1") {
    return NextResponse.redirect(new URL("/demo/basla", url.origin), { status: 303 });
  }
  if (ad) {
    const site = ad.site || `${ilgi(ad.cocuk)} Dünyası`;
    jar.set(DEMO_AD_COOKIE, `${ad.cocuk}|${site}`, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DEMO_AD_OMRU,
    });
  }

  await createSession({ id: ebeveyn.id, email: ebeveyn.email, name: ebeveyn.name });
  return NextResponse.redirect(new URL("/", url.origin), { status: 303 });
}
