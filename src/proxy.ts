import { NextResponse, type NextRequest } from "next/server";
import { DEMO, DEMO_RET_MESAJI, DEMO_YAZILABILIR } from "@/lib/demo";

/**
 * Demo kapisi. DEMO=1 degilse hicbir sey yapmaz (ailelerin kurulumu).
 *
 * Demoda: okuma serbest; yazma yalnizca DEMO_YAZILABILIR listesindeyse gecer,
 * geri kalan her sey 403 + aciklama. Liste allowlist oldugu icin yarin eklenen
 * yeni bir uc otomatik kapali dogar. Arayuz zaten `error` alanini oldugu gibi
 * gosteriyor (src/lib/client.ts), yani ziyaretci neden olmadigini okur.
 */
export function proxy(req: NextRequest) {
  if (!DEMO) return NextResponse.next();
  const yontem = req.method.toUpperCase();
  if (yontem === "GET" || yontem === "HEAD" || yontem === "OPTIONS") return NextResponse.next();

  const yol = req.nextUrl.pathname;
  const serbest = DEMO_YAZILABILIR.some((k) => k.yol.test(yol) && k.yontemler.includes(yontem));
  if (serbest) return NextResponse.next();

  return NextResponse.json({ error: DEMO_RET_MESAJI }, { status: 403 });
}

export const config = { matcher: "/api/:path*" };
