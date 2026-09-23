import { NextResponse } from "next/server";
import { z } from "zod";
import { handle } from "@/lib/api";
import { requireParent } from "@/lib/auth";
import { planUpload, withRandomSuffix } from "@/lib/media";
import { uploadRule } from "@/lib/upload-rules";

/**
 * Tarayici-tarafi yukleme icin plan: tek PUT linki ya da parcali yukleme adresi.
 * Kapi: sadece oturumlu aile hesabi. Yol onekine gore tur ve boyut siniri.
 * Istemci: POST {pathname, contentType, size} -> UploadPlan; sonra src/lib/upload.ts uygular.
 */
const body = z.object({
  pathname: z.string().min(3).max(300).regex(/^[a-z]+\/[A-Za-z0-9_\-./]+$/, "Geçersiz yol"),
  contentType: z.string().min(3).max(100),
  size: z.number().int().positive(),
});

export async function POST(req: Request) {
  return handle(async () => {
    await requireParent();
    const d = body.parse(await req.json());
    const rule = uploadRule(d.pathname, d.contentType, d.size); // 400 firlatir
    const pathname = withRandomSuffix(d.pathname);
    return planUpload(pathname, d.contentType, d.size, rule.max);
  });
}

export function GET() {
  return NextResponse.json({ error: "POST bekleniyor." }, { status: 405 });
}

