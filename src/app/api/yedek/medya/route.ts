import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { once } from "node:events";
import { ZipArchive } from "archiver";
import { prisma } from "@/lib/db";
import { getSessionParent } from "@/lib/auth";
import { toDateStr } from "@/lib/dates";
import { mediaStream } from "@/lib/media";

export const runtime = "nodejs";
export const maxDuration = 300;

type Kind = "photos" | "audio" | "videos";
const KINDS: Kind[] = ["photos", "audio", "videos"];

function slug(s: string | null | undefined) {
  return (s ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

/**
 * Bir yilin fotograflarini / seslerini / videolarini ZIP olarak akitir.
 * Dosyalar tek tek Blob'dan cekilir (sikistirma yok; medya zaten sikisik),
 * bellek bir dosya + ZIP tamponu kadar kalir.
 *   GET /api/yedek/medya?yil=2026&tur=photos
 */
export async function GET(req: Request) {
  const parent = await getSessionParent();
  if (!parent) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("yil"));
  const kind = url.searchParams.get("tur") as Kind;
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !KINDS.includes(kind)) {
    return NextResponse.json({ error: "yil ve tur (photos|audio|videos) gerekli." }, { status: 400 });
  }
  const range = { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };

  let files: { path: string; name: string; meta: Record<string, unknown> }[] = [];
  if (kind === "photos") {
    const rows = await prisma.photo.findMany({ where: { takenAt: range }, orderBy: { takenAt: "asc" } });
    files = rows.map((r) => ({ path: r.path, name: `${toDateStr(r.takenAt)}_${slug(r.caption) || r.id}.jpg`, meta: { takenAt: toDateStr(r.takenAt), caption: r.caption, isFavorite: r.isFavorite } }));
  } else if (kind === "audio") {
    const [rows, recs] = await Promise.all([
      prisma.saying.findMany({ where: { saidAt: range, audioPath: { not: null } }, orderBy: { saidAt: "asc" } }),
      prisma.recording.findMany({ where: { recordedAt: range }, orderBy: { recordedAt: "asc" } }),
    ]);
    files = [
      ...rows.map((r) => ({ path: r.audioPath!, name: `${toDateStr(r.saidAt)}_soz_${slug(r.text) || r.id}.${r.audioPath!.split(".").pop()}`, meta: { saidAt: toDateStr(r.saidAt), text: r.text, context: r.context } })),
      ...recs.map((r) => ({ path: r.path, name: `${toDateStr(r.recordedAt)}_ses_${slug(r.title) || r.id}.${r.path.split(".").pop()}`, meta: { recordedAt: toDateStr(r.recordedAt), title: r.title, note: r.note } })),
    ];
  } else {
    const rows = await prisma.video.findMany({ where: { takenAt: range }, orderBy: { takenAt: "asc" } });
    files = rows.map((r) => ({ path: r.path, name: `${toDateStr(r.takenAt)}_${slug(r.caption) || r.id}.${r.path.split(".").pop()}`, meta: { takenAt: toDateStr(r.takenAt), caption: r.caption, durationSec: r.durationSec } }));
  }
  if (files.length === 0) return NextResponse.json({ error: "Bu yıl için dosya yok." }, { status: 404 });

  const archive = new ZipArchive({ zlib: { level: 0 } });
  const web = Readable.toWeb(archive) as unknown as ReadableStream;

  (async () => {
    try {
      archive.append(JSON.stringify(files.map((f) => ({ file: f.name, ...f.meta })), null, 2), { name: "liste.json" });
      for (const f of files) {
        const stream = await mediaStream(f.path).catch(() => null);
        if (!stream) continue;
        const buf = Buffer.from(await new Response(stream).arrayBuffer());
        archive.append(buf, { name: f.name });
        await once(archive, "entry");
      }
      await archive.finalize();
    } catch (e) {
      console.error("[yedek/medya]", e);
      archive.abort();
    }
  })();

  return new Response(web, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="adaland-${kind}-${year}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
