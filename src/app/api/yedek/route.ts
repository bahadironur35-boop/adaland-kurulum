import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionParent } from "@/lib/auth";
import { toDateStr, todayStr } from "@/lib/dates";
import { requireBrand } from "@/lib/brand";

/**
 * Tum verinin JSON yedegi. Medya icin sadece Blob yol adlari; dosyalar
 * /api/yedek/medya ile yil ve tur bazinda ZIP olarak iner.
 * Anı sitesinin en onemli guvencesi: veri hicbir servise mahkum kalmasin.
 */
export async function GET() {
  const parent = await getSessionParent();
  if (!parent) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });

  const [birthDate, sayings, photos, videos, milestones, measurements, shareLinks, parents, letters, recordings] = await Promise.all([
    requireBrand().then((b) => b.birthDate),
    prisma.saying.findMany({ orderBy: { saidAt: "asc" } }),
    prisma.photo.findMany({ orderBy: { takenAt: "asc" } }),
    prisma.video.findMany({ orderBy: { takenAt: "asc" } }),
    prisma.milestone.findMany({ orderBy: { date: "asc" } }),
    prisma.measurement.findMany({ orderBy: { date: "asc" } }),
    prisma.shareLink.findMany({ select: { label: true, createdAt: true, expiresAt: true, revokedAt: true, viewCount: true } }),
    prisma.parent.findMany({ select: { name: true, email: true } }),
    prisma.letter.findMany({ orderBy: { openAt: "asc" }, include: { author: { select: { name: true } } } }),
    prisma.recording.findMany({ orderBy: { recordedAt: "asc" } }),
  ]);

  const brand = await requireBrand();
  const body = {
    app: brand.siteName,
    format: 1,
    exportedAt: new Date().toISOString(),
    child: { name: brand.childName, birthDate },
    parents,
    sayings: sayings.map((s) => ({ ...s, saidAt: toDateStr(s.saidAt) })),
    photos: photos.map((p) => ({ ...p, takenAt: toDateStr(p.takenAt) })),
    videos: videos.map((v) => ({ ...v, takenAt: toDateStr(v.takenAt) })),
    milestones: milestones.map((m) => ({ ...m, date: toDateStr(m.date) })),
    measurements: measurements.map((m) => ({
      ...m, date: toDateStr(m.date),
      heightCm: m.heightCm == null ? null : Number(m.heightCm),
      weightKg: m.weightKg == null ? null : Number(m.weightKg),
    })),
    shareLinks,
    letters: letters.map((l) => ({ ...l, openAt: toDateStr(l.openAt), authorName: l.author.name, author: undefined })),
    recordings: recordings.map((r) => ({ ...r, recordedAt: toDateStr(r.recordedAt) })),
  };

  await prisma.settings.updateMany({ where: { id: 1 }, data: { lastBackupAt: new Date() } });

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="adaland-yedek-${todayStr()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
