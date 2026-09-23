import { z } from "zod";

export const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-AA-GG olmalı")
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), "Geçersiz tarih");

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta gir"),
  password: z.string().min(1, "Şifre gerekli"),
});

const blobPath = (prefix: string) =>
  z.string().min(1).max(500).refine((p) => p.startsWith(prefix) && !p.includes(".."), "Geçersiz dosya yolu");

export const sayingCreate = z.object({
  text: z.string().trim().min(1, "Söz boş olamaz").max(1000),
  saidAt: dateStr,
  context: z.string().trim().max(500).nullable().optional(),
  isFavorite: z.boolean().optional(),
  audioPath: blobPath("audio/").nullable().optional(),
  audioMime: z.string().max(100).nullable().optional(),
});
export const sayingPatch = sayingCreate.partial();

export const photoCreate = z.object({
  path: blobPath("photos/"),
  thumbPath: blobPath("photos/").nullable().optional(),
  takenAt: dateStr,
  caption: z.string().trim().max(300).nullable().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sizeBytes: z.number().int().nonnegative(),
  mime: z.string().min(1),
});
export const photoPatch = z
  .object({ takenAt: dateStr, caption: z.string().trim().max(300).nullable(), isFavorite: z.boolean() })
  .partial();

export const videoCreate = z.object({
  path: blobPath("videos/"),
  posterPath: blobPath("videos/").nullable().optional(),
  takenAt: dateStr,
  caption: z.string().trim().max(300).nullable().optional(),
  durationSec: z.number().int().nonnegative().nullable().optional(),
  sizeBytes: z.number().int().nonnegative(),
  mime: z.string().min(1),
});
export const videoPatch = z
  .object({
    takenAt: dateStr,
    caption: z.string().trim().max(300).nullable(),
    posterPath: blobPath("videos/"),
  })
  .partial();

export const milestoneCreate = z.object({
  title: z.string().trim().min(1, "Başlık boş olamaz").max(120),
  date: dateStr,
  note: z.string().trim().max(1000).nullable().optional(),
  photoId: z.string().min(1).nullable().optional(),
});
export const milestonePatch = milestoneCreate.partial();

const oneDecimal = (min: number, max: number) => z.number().min(min).max(max).transform((n) => Math.round(n * 10) / 10);
export const measurementCreate = z
  .object({
    date: dateStr,
    heightCm: oneDecimal(30, 200).nullable().optional(),
    weightKg: z.number().min(1).max(100).transform((n) => Math.round(n * 100) / 100).nullable().optional(),
    note: z.string().trim().max(300).nullable().optional(),
  })
  .refine((d) => d.heightCm != null || d.weightKg != null, { message: "Boy ya da kilo gir", path: ["heightCm"] });
export const measurementPatch = z.object({
  date: dateStr,
  heightCm: oneDecimal(30, 200).nullable(),
  weightKg: z.number().min(1).max(100).transform((n) => Math.round(n * 100) / 100).nullable(),
  note: z.string().trim().max(300).nullable(),
}).partial();

export const passwordChange = z.object({
  current: z.string().min(1),
  next: z.string().min(8, "Yeni şifre en az 8 karakter olmalı").max(200),
});

/** Zorunlu ilk sifre belirleme: mevcut sifre sorulmaz, kullanici az once girdi. */
export const passwordSet = z.object({
  next: z.string().min(8, "Şifre en az 8 karakter olmalı").max(200),
});

export const settingsPatch = z.object({
  birthDate: dateStr,
  yearbookAge: z.number().int().min(0).max(120),
  childName: z.string().trim().min(1, "Ad boş olamaz").max(40),
  siteName: z.string().trim().min(1, "Sayfa adı boş olamaz").max(60),
}).partial();

export const shareCreate = z.object({
  label: z.string().trim().min(1, "Kimin için olduğunu yaz").max(60),
  days: z.union([z.literal(7), z.literal(30), z.literal(90), z.null()]),
});

export const letterCreate = z.object({
  title: z.string().trim().min(1, "Başlık yaz").max(120),
  body: z.string().trim().min(1, "Mektup boş olamaz").max(20000),
  openAt: dateStr,
});
export const letterPatch = letterCreate.partial();

export const recordingCreate = z.object({
  title: z.string().trim().min(1, "Bir başlık yaz").max(120),
  recordedAt: dateStr,
  path: z.string().min(1).max(500).refine((p) => p.startsWith("audio/") && !p.includes(".."), "Geçersiz dosya yolu"),
  mime: z.string().min(3).max(100),
  durationSec: z.number().int().nonnegative().nullable().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});
export const recordingPatch = z.object({ title: z.string().trim().min(1).max(120), recordedAt: dateStr, note: z.string().trim().max(500).nullable() }).partial();
