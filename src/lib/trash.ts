import { prisma } from "./db";
import { deleteMedia } from "./media";
import { toDateStr } from "./dates";

/**
 * Cop kutusu. Silme artik iki asamali:
 *  1. Kullanici siler -> `deletedAt` doldurulur, kayit ve dosyalar YERINDE KALIR.
 *  2. 30 gun sonra gunluk cron kalici siler -> satir gider, R2 dosyalari silinir.
 * Boylece yanlislikla silinen bir ani geri alinabiliyor.
 */
export const TRASH_DAYS = 30;

export type TrashType = "saying" | "photo" | "video" | "milestone" | "recording" | "letter" | "measurement";

export const TRASH_LABEL: Record<TrashType, string> = {
  saying: "Söz",
  photo: "Fotoğraf",
  video: "Video",
  milestone: "İlk",
  recording: "Ses",
  letter: "Mektup",
  measurement: "Ölçüm",
};

export type TrashItem = {
  type: TrashType;
  id: string;
  title: string;
  /** Icerigin kendi tarihi ("YYYY-MM-DD"), varsa */
  date: string | null;
  deletedAt: string;
  /** Kalici silinmesine kalan gun */
  daysLeft: number;
  thumbUrl: string | null;
};

function daysLeft(deletedAt: Date): number {
  const gone = deletedAt.getTime() + TRASH_DAYS * 86_400_000;
  return Math.max(0, Math.ceil((gone - Date.now()) / 86_400_000));
}

function trim(s: string, n = 70) {
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
}

/** Cop kutusundaki her sey, en son silinen basta. */
export async function listTrash(): Promise<TrashItem[]> {
  const where = { deletedAt: { not: null } } as const;
  const [sayings, photos, videos, milestones, recordings, letters, measurements] = await Promise.all([
    prisma.saying.findMany({ where, orderBy: { deletedAt: "desc" } }),
    prisma.photo.findMany({ where, orderBy: { deletedAt: "desc" } }),
    prisma.video.findMany({ where, orderBy: { deletedAt: "desc" } }),
    prisma.milestone.findMany({ where, orderBy: { deletedAt: "desc" } }),
    prisma.recording.findMany({ where, orderBy: { deletedAt: "desc" } }),
    prisma.letter.findMany({ where, orderBy: { deletedAt: "desc" } }),
    prisma.measurement.findMany({ where, orderBy: { deletedAt: "desc" } }),
  ]);

  // Cop kutusundaki gorseller icin imzali adres; yalnizca fotograf ve video kapaklari
  const { mediaUrls } = await import("./media");
  const urls = await mediaUrls([
    ...photos.map((p) => p.thumbPath ?? p.path),
    ...videos.map((v) => v.posterPath),
  ]);

  const items: TrashItem[] = [
    ...sayings.map((r) => ({ type: "saying" as const, id: r.id, title: trim(r.text), date: toDateStr(r.saidAt), deletedAt: r.deletedAt!.toISOString(), daysLeft: daysLeft(r.deletedAt!), thumbUrl: null })),
    ...photos.map((r) => ({ type: "photo" as const, id: r.id, title: r.caption ? trim(r.caption) : "Fotoğraf", date: toDateStr(r.takenAt), deletedAt: r.deletedAt!.toISOString(), daysLeft: daysLeft(r.deletedAt!), thumbUrl: urls[r.thumbPath ?? r.path] ?? null })),
    ...videos.map((r) => ({ type: "video" as const, id: r.id, title: r.caption ? trim(r.caption) : "Video", date: toDateStr(r.takenAt), deletedAt: r.deletedAt!.toISOString(), daysLeft: daysLeft(r.deletedAt!), thumbUrl: r.posterPath ? (urls[r.posterPath] ?? null) : null })),
    ...milestones.map((r) => ({ type: "milestone" as const, id: r.id, title: trim(r.title), date: toDateStr(r.date), deletedAt: r.deletedAt!.toISOString(), daysLeft: daysLeft(r.deletedAt!), thumbUrl: null })),
    ...recordings.map((r) => ({ type: "recording" as const, id: r.id, title: trim(r.title), date: toDateStr(r.recordedAt), deletedAt: r.deletedAt!.toISOString(), daysLeft: daysLeft(r.deletedAt!), thumbUrl: null })),
    ...letters.map((r) => ({ type: "letter" as const, id: r.id, title: trim(r.title), date: toDateStr(r.openAt), deletedAt: r.deletedAt!.toISOString(), daysLeft: daysLeft(r.deletedAt!), thumbUrl: null })),
    ...measurements.map((r) => ({ type: "measurement" as const, id: r.id, title: [r.heightCm && `${r.heightCm} cm`, r.weightKg && `${r.weightKg} kg`].filter(Boolean).join(" · ") || "Ölçüm", date: toDateStr(r.date), deletedAt: r.deletedAt!.toISOString(), daysLeft: daysLeft(r.deletedAt!), thumbUrl: null })),
  ];
  return items.sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : -1));
}

/** Cope tasi. Dosyalara dokunulmaz. */
export async function softDelete(type: TrashType, id: string): Promise<boolean> {
  const data = { deletedAt: new Date() };
  const where = { id, deletedAt: null };
  const r = await runOn(type, {
    saying: () => prisma.saying.updateMany({ where, data }),
    photo: () => prisma.photo.updateMany({ where, data }),
    video: () => prisma.video.updateMany({ where, data }),
    milestone: () => prisma.milestone.updateMany({ where, data }),
    recording: () => prisma.recording.updateMany({ where, data }),
    letter: () => prisma.letter.updateMany({ where, data }),
    measurement: () => prisma.measurement.updateMany({ where, data }),
  });
  return r.count > 0;
}

/** Copten geri al. */
export async function restore(type: TrashType, id: string): Promise<boolean> {
  const data = { deletedAt: null };
  const where = { id, deletedAt: { not: null } };
  const r = await runOn(type, {
    saying: () => prisma.saying.updateMany({ where, data }),
    photo: () => prisma.photo.updateMany({ where, data }),
    video: () => prisma.video.updateMany({ where, data }),
    milestone: () => prisma.milestone.updateMany({ where, data }),
    recording: () => prisma.recording.updateMany({ where, data }),
    letter: () => prisma.letter.updateMany({ where, data }),
    measurement: () => prisma.measurement.updateMany({ where, data }),
  });
  return r.count > 0;
}

/**
 * Kalici sil: once dosyalar R2'den, sonra satir. Sadece cop kutusundakiler silinebilir,
 * boylece bir hata canli iceriga dokunamaz.
 */
export async function purge(type: TrashType, id: string): Promise<boolean> {
  const inTrash = { id, deletedAt: { not: null } };
  switch (type) {
    case "saying": {
      const r = await prisma.saying.findFirst({ where: inTrash });
      if (!r) return false;
      await prisma.saying.delete({ where: { id } });
      await deleteMedia([r.audioPath]);
      return true;
    }
    case "photo": {
      const r = await prisma.photo.findFirst({ where: inTrash });
      if (!r) return false;
      await prisma.photo.delete({ where: { id } });
      await deleteMedia([r.path, r.thumbPath]);
      return true;
    }
    case "video": {
      const r = await prisma.video.findFirst({ where: inTrash });
      if (!r) return false;
      await prisma.video.delete({ where: { id } });
      await deleteMedia([r.path, r.posterPath]);
      return true;
    }
    case "recording": {
      const r = await prisma.recording.findFirst({ where: inTrash });
      if (!r) return false;
      await prisma.recording.delete({ where: { id } });
      await deleteMedia([r.path]);
      return true;
    }
    case "milestone":
      return (await prisma.milestone.deleteMany({ where: inTrash })).count > 0;
    case "letter":
      return (await prisma.letter.deleteMany({ where: inTrash })).count > 0;
    case "measurement":
      return (await prisma.measurement.deleteMany({ where: inTrash })).count > 0;
  }
}

/** 30 gunu dolanlari kalici sil. Gunluk cron cagirir. */
export async function purgeExpired(): Promise<number> {
  const cutoff = new Date(Date.now() - TRASH_DAYS * 86_400_000);
  const old = { deletedAt: { not: null, lt: cutoff } };
  const [sayings, photos, videos, milestones, recordings, letters, measurements] = await Promise.all([
    prisma.saying.findMany({ where: old, select: { id: true } }),
    prisma.photo.findMany({ where: old, select: { id: true } }),
    prisma.video.findMany({ where: old, select: { id: true } }),
    prisma.milestone.findMany({ where: old, select: { id: true } }),
    prisma.recording.findMany({ where: old, select: { id: true } }),
    prisma.letter.findMany({ where: old, select: { id: true } }),
    prisma.measurement.findMany({ where: old, select: { id: true } }),
  ]);
  const jobs: [TrashType, string][] = [
    ...sayings.map((r) => ["saying", r.id] as [TrashType, string]),
    ...photos.map((r) => ["photo", r.id] as [TrashType, string]),
    ...videos.map((r) => ["video", r.id] as [TrashType, string]),
    ...milestones.map((r) => ["milestone", r.id] as [TrashType, string]),
    ...recordings.map((r) => ["recording", r.id] as [TrashType, string]),
    ...letters.map((r) => ["letter", r.id] as [TrashType, string]),
    ...measurements.map((r) => ["measurement", r.id] as [TrashType, string]),
  ];
  let n = 0;
  for (const [t, id] of jobs) if (await purge(t, id)) n++;
  return n;
}

type Counter = { count: number };
function runOn(type: TrashType, map: Record<TrashType, () => Promise<Counter>>): Promise<Counter> {
  return map[type]();
}
