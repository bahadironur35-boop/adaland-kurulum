import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { mediaUrls } from "./media";
import { fromDateStr, toDateStr, todayStr } from "./dates";
import type { FeedItem, LetterDTO, MeasurementDTO, MilestoneDTO, PhotoDTO, RecordingDTO, SayingDTO, VideoDTO } from "./types";

export async function listSayings(take?: number, where?: Prisma.SayingWhereInput): Promise<SayingDTO[]> {
  const rows = await prisma.saying.findMany({ where: { ...where, deletedAt: null }, orderBy: [{ saidAt: "desc" }, { createdAt: "desc" }], take, include: { addedBy: { select: { name: true } } } });
  const urls = await mediaUrls(rows.map((r) => r.audioPath));
  return rows.map((r) => ({
    id: r.id,
    addedBy: r.addedBy?.name ?? null,
    text: r.text,
    saidAt: toDateStr(r.saidAt),
    context: r.context,
    audioUrl: r.audioPath ? (urls[r.audioPath] ?? null) : null,
    isFavorite: r.isFavorite,
  }));
}

export async function listPhotos(take?: number, where?: Prisma.PhotoWhereInput): Promise<PhotoDTO[]> {
  const rows = await prisma.photo.findMany({ where: { ...where, deletedAt: null }, orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }], take, include: { addedBy: { select: { name: true } } } });
  const urls = await mediaUrls(rows.flatMap((r) => [r.path, r.thumbPath]));
  return rows.map((r) => ({
    id: r.id,
    addedBy: r.addedBy?.name ?? null,
    takenAt: toDateStr(r.takenAt),
    caption: r.caption,
    width: r.width,
    height: r.height,
    isFavorite: r.isFavorite,
    url: urls[r.path],
    thumbUrl: r.thumbPath ? urls[r.thumbPath] : urls[r.path],
  }));
}

export async function listVideos(take?: number, where?: Prisma.VideoWhereInput): Promise<VideoDTO[]> {
  const rows = await prisma.video.findMany({ where: { ...where, deletedAt: null }, orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }], take, include: { addedBy: { select: { name: true } } } });
  const urls = await mediaUrls(rows.flatMap((r) => [r.path, r.posterPath]));
  return rows.map((r) => ({
    id: r.id,
    addedBy: r.addedBy?.name ?? null,
    takenAt: toDateStr(r.takenAt),
    caption: r.caption,
    durationSec: r.durationSec,
    sizeBytes: r.sizeBytes,
    url: urls[r.path],
    posterUrl: r.posterPath ? (urls[r.posterPath] ?? null) : null,
  }));
}

export async function listMilestones(take?: number, where?: Prisma.MilestoneWhereInput): Promise<MilestoneDTO[]> {
  const rows = await prisma.milestone.findMany({
    where: { ...where, deletedAt: null },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
    include: { photo: { select: { id: true, path: true, thumbPath: true, deletedAt: true } }, addedBy: { select: { name: true } } },
  });
  const urls = await mediaUrls(rows.map((r) => r.photo?.thumbPath ?? r.photo?.path));
  return rows.map((r) => ({
    id: r.id,
    addedBy: r.addedBy?.name ?? null,
    title: r.title,
    date: toDateStr(r.date),
    note: r.note,
    photoId: r.photoId,
    photoThumbUrl: r.photo && !r.photo.deletedAt ? (urls[r.photo.thumbPath ?? r.photo.path] ?? null) : null,
  }));
}

export async function listMeasurements(): Promise<MeasurementDTO[]> {
  const rows = await prisma.measurement.findMany({ where: { deletedAt: null }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] });
  return rows.map((r) => ({
    id: r.id,
    date: toDateStr(r.date),
    heightCm: r.heightCm == null ? null : Number(r.heightCm),
    weightKg: r.weightKg == null ? null : Number(r.weightKg),
    note: r.note,
  }));
}

/**
 * "Gecen yillarda bu gunlerde": bugunun ay-gununun +-3 gun penceresi, dogum yilindan
 * gecen yila kadar her yil icin. Aile olceginde birkac yil = birkac kucuk aralik.
 */
export async function listOnThisDay(birth: string, today = todayStr()): Promise<FeedItem[]> {
  const t = fromDateStr(today);
  const birthYear = fromDateStr(birth).getUTCFullYear();
  const ranges: { gte: Date; lte: Date }[] = [];
  for (let y = birthYear; y < t.getUTCFullYear(); y++) {
    const center = new Date(Date.UTC(y, t.getUTCMonth(), t.getUTCDate()));
    ranges.push({ gte: new Date(center.getTime() - 3 * 86_400_000), lte: new Date(center.getTime() + 3 * 86_400_000) });
  }
  if (ranges.length === 0) return [];

  const [sayings, photos, videos, milestones, recordings] = await Promise.all([
    listSayings(undefined, { OR: ranges.map((r) => ({ saidAt: r })) }),
    listPhotos(undefined, { OR: ranges.map((r) => ({ takenAt: r })) }),
    listVideos(undefined, { OR: ranges.map((r) => ({ takenAt: r })) }),
    listMilestones(undefined, { OR: ranges.map((r) => ({ date: r })) }),
    listRecordings(undefined, { OR: ranges.map((r) => ({ recordedAt: r })) }),
  ]);
  return [
    ...sayings.map((s): FeedItem => ({ kind: "saying", date: s.saidAt, saying: s })),
    ...photos.map((p): FeedItem => ({ kind: "photo", date: p.takenAt, photo: p })),
    ...videos.map((v): FeedItem => ({ kind: "video", date: v.takenAt, video: v })),
    ...milestones.map((m): FeedItem => ({ kind: "milestone", date: m.date, milestone: m })),
    ...recordings.map((r): FeedItem => ({ kind: "recording", date: r.recordedAt, recording: r })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** Genel arama: sozler, ilkler, fotograf ve video notlari. Buyuk/kucuk harf duyarsiz. */
export async function searchAll(q: string) {
  const term = q.trim();
  if (term.length < 2) return { sayings: [], milestones: [], photos: [], videos: [] };
  const c = { contains: term, mode: "insensitive" as const };
  const [sayings, milestones, photos, videos] = await Promise.all([
    listSayings(50, { OR: [{ text: c }, { context: c }] }),
    listMilestones(50, { OR: [{ title: c }, { note: c }] }),
    listPhotos(60, { caption: c }),
    listVideos(30, { caption: c }),
  ]);
  return { sayings, milestones, photos, videos };
}

export async function listFavorites() {
  const [sayings, photos] = await Promise.all([listSayings(undefined, { isFavorite: true }), listPhotos(undefined, { isFavorite: true })]);
  return { sayings, photos };
}

export async function listRecordings(take?: number, where?: Prisma.RecordingWhereInput): Promise<RecordingDTO[]> {
  const rows = await prisma.recording.findMany({ where: { ...where, deletedAt: null }, orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }], take, include: { addedBy: { select: { name: true } } } });
  const urls = await mediaUrls(rows.map((r) => r.path));
  return rows.map((r) => ({
    id: r.id,
    addedBy: r.addedBy?.name ?? null,
    title: r.title,
    recordedAt: toDateStr(r.recordedAt),
    note: r.note,
    durationSec: r.durationSec,
    url: urls[r.path],
  }));
}

/**
 * Mektuplar: yazar kendi mektubunu her zaman okur; digerleri openAt gunune kadar
 * sadece basligi ve acilis tarihini gorur (govde hic gonderilmez).
 */
export async function listLetters(viewerId: string, today = todayStr()): Promise<LetterDTO[]> {
  const rows = await prisma.letter.findMany({ where: { deletedAt: null }, orderBy: [{ openAt: "asc" }, { createdAt: "asc" }], include: { author: { select: { name: true } } } });
  return rows.map((r) => {
    const openAt = toDateStr(r.openAt);
    const isAuthor = r.authorId === viewerId;
    const sealed = openAt > today;
    return {
      id: r.id,
      title: r.title,
      body: sealed && !isAuthor ? null : r.body,
      openAt,
      createdAt: r.createdAt.toISOString(),
      authorName: r.author.name,
      isAuthor,
      sealed,
    };
  });
}
