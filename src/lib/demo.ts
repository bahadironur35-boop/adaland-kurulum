/**
 * Demo modu. Yalnizca `DEMO=1` ortam degiskeni tanimliysa acilir; ailelerin
 * kurulumunda bu degisken YOKTUR, yani hicbir sey degismez.
 *
 * Neden gerekli: demo herkese acik ve YAZMA yetkili. Tek bir kurulumu herkes
 * paylastigi icin yikici islemler kapali olmali, yoksa ilk gelen demoyu siler.
 *
 * Kural ALLOWLIST: varsayilan KAPALI. Yeni bir uc eklendiginde demo otomatik
 * olarak onu da engeller; birinin listeye eklemeyi unutmasi guvenligi bozmaz.
 * (bkz. feedback: "gizlemek kapatmak degil" — kapi middleware'de.)
 */
export const DEMO = process.env.DEMO === "1";

/**
 * Ziyaretcinin sectigi ad bu cerezde tasinir; her ziyaretci KENDI adini gorur.
 * Icerik (sozler, fotograflar) ortak kalir, yalniz ad kisiye ozel: tek kurulumu
 * paylasan iki kisi birbirinin adini gormez. Deger: "cocuk|site".
 */
export const DEMO_AD_COOKIE = "adaland_demo_ad";
export const DEMO_AD_OMRU = 60 * 60 * 24 * 30;

export function demoAdCoz(ham: string | undefined): { cocuk: string; site: string } | null {
  if (!ham) return null;
  const [cocuk = "", site = ""] = ham.split("|");
  return cocuk.length >= 2 ? { cocuk, site } : null;
}

/** Demoda serbest olan yazma uclari: yalniz metin iceren, geri donulebilir seyler. */
export const DEMO_YAZILABILIR: { yol: RegExp; yontemler: string[] }[] = [
  { yol: /^\/api\/sozler(\/[^/]+)?$/, yontemler: ["POST", "PATCH"] },
  { yol: /^\/api\/ilkler(\/[^/]+)?$/, yontemler: ["POST", "PATCH"] },
  { yol: /^\/api\/olcumler(\/[^/]+)?$/, yontemler: ["POST", "PATCH"] },
  { yol: /^\/api\/mektuplar(\/[^/]+)?$/, yontemler: ["POST", "PATCH"] },
  // Cikis serbest: ziyaretci demodan cikabilmeli.
  { yol: /^\/api\/auth\/logout$/, yontemler: ["POST"] },
];

/** Engellenen istege verilen aciklama; arayuz bunu oldugu gibi gosterir. */
export const DEMO_RET_MESAJI =
  "Bu demo herkese açık, o yüzden silme ve dosya yükleme kapalı. Söz, ilk, ölçüm ve mektup ekleyip düzenleyebilirsin.";

/**
 * Ziyaretcinin yazdiklari. IKI AYRI SEY:
 *   cocuk -> "Ada"      (uygulama icinde "Bugun Ada", "Ada ne dedi?")
 *   site  -> "Adaland"  (baslik, ana ekran adi, akrabaya giden link)
 *
 * NEDEN AYRI: tek kutu varken ikisi ayni sey saniliyordu ve "Adaland" yazan
 * kisi "Adaland'in Dunyasi" + "Bugun Adaland" ile karsilasiyordu. Kurulum
 * sihirbazinda da bu iki alan ayri; demo onu birebir taklit etmeli.
 *
 * Kisa tut; yalniz harf, bosluk ve kesme isareti kalsin, boylece demoya slogan
 * ya da link yazilamaz. Sayfa adi bos birakilirsa cagiran taraf turetsin
 * (site: "" doner) — "Ada'nin Dunyasi".
 */
function suz(ham: string | null | undefined): string {
  const s = String(ham ?? "").trim().replace(/\s+/g, " ").slice(0, 32);
  return s.replace(/’/g, "'").replace(/[^\p{L} ']/gu, "").replace(/\s+/g, " ").trim();
}

function basHarf(s: string): string {
  return s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
}

export function temizAd(
  hamAd: string | null | undefined,
  hamSayfa?: string | null | undefined,
): { cocuk: string; site: string } | null {
  const ad = suz(hamAd);
  // Tek kutulu donemden kalan linkler ("?ad=Zeynep'in Dünyası") kirilmasin:
  // kesme isaretinden oncesi cocugun adi, yazilanin tamami sayfanin adi.
  const cocukHam = ad.split("'")[0].trim();
  if (cocukHam.length < 2) return null;
  const cocuk = basHarf(cocukHam);

  const sayfa = suz(hamSayfa);
  if (sayfa.length >= 2) return { cocuk, site: basHarf(sayfa) };
  if (ad.includes("'")) return { cocuk, site: cocuk + ad.slice(cocukHam.length) };
  return { cocuk, site: "" };
}
