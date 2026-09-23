import { NextResponse } from "next/server";
import { shareLinkCoz } from "@/lib/share";
import { listPhotos } from "@/lib/queries";

/**
 * Oyun uygulamasi icin SALT OKUNUR favori fotograf listesi.
 *
 * GET /api/p/<token>/fotograflar
 *
 * Neden var: cocuk oyunlarinda (yapboz, hafiza karti) aile yuzleri kullanilacak.
 * Uc yaşındaki bir cocuk icin hicbir cizim anneannesinin yuzu kadar cekici degil.
 *
 * Yetki: akraba paylasim linkinin TA KENDISI. Yeni tablo, yeni rol, yeni anahtar
 * YOK - bu veri zaten ayni tokenla /p/<token> sayfasinda aciliyor. Link iptal
 * edilince ya da suresi dolunca bu uc de kapanir.
 *
 * Sinirlar:
 *  - Yalnizca FAVORI fotograflar. Hangi fotografin oyuna girecegini ebeveyn
 *    Adaland'da favori isaretleyerek secer; ayri bir arayuz yok.
 *  - Yalnizca kucuk resim adresi (480 px). Tam cozunurluklu aile fotograflari
 *    baska bir origin'e verilmiyor; oyun icin zaten gereksiz.
 *  - Goruntulenme SAYILMAZ (shareLinkCoz), yoksa ebeveynin sayaci sisardi.
 */

export const dynamic = "force-dynamic";

const EN_COK = 60;

/**
 * Tarayicinin baska origin'den okumasina izin verilen adresler.
 *
 * Guvenlik siniri DEGIL - token'i olan zaten /p/<token> sayfasini acabiliyor.
 * Amaci hijyen: link bir yere sizarsa rastgele bir site sessizce toplayamasin.
 */
const OYUN_ORIGINLERI = new Set([
  "https://oyun.bugunnededi.com",
  "http://localhost:5188",
  "http://localhost:5173",
]);

function cors(origin: string | null): Record<string, string> {
  const h: Record<string, string> = { Vary: "Origin" };
  if (origin && OYUN_ORIGINLERI.has(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...cors(req.headers.get("origin")),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const basliklar = { ...cors(req.headers.get("origin")), "Cache-Control": "no-store" };
  try {
    const { token } = await params;
    const link = await shareLinkCoz(token);
    // Gecersiz linkte nedenini soylemiyoruz - sayfayla ayni davranis.
    if (!link) return NextResponse.json({ error: "Bulunamadı." }, { status: 404, headers: basliklar });

    const fotograflar = await listPhotos(EN_COK, { isFavorite: true });
    return NextResponse.json(
      {
        fotograflar: fotograflar
          .filter((f) => !!f.thumbUrl)
          .map((f) => ({ id: f.id, url: f.thumbUrl, en: f.width, boy: f.height, baslik: f.caption })),
      },
      { headers: basliklar },
    );
  } catch (err) {
    console.error("[api/p/fotograflar]", err);
    return NextResponse.json({ error: "Beklenmeyen bir hata oluştu." }, { status: 500, headers: basliklar });
  }
}
