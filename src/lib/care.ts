import { prisma } from "./db";
import { fromDateStr, todayStr, toDateStr } from "./dates";

/**
 * Kurulum gunu: bundan onceki yas yillari icin kitap hatirlatilmaz.
 * Sabit olsaydi 2027'de kuran bir aileye 2020 dogumlu cocugu icin
 * "3 yas kitabin hazir" derdi. Settings.installedAt'ten geliyor;
 * yoksa hicbir gecmis dogum gunu sayilmaz (ileri tarih).
 */
async function kurulumGunu(): Promise<string> {
  const s = await prisma.settings.findUnique({ where: { id: 1 }, select: { installedAt: true } });
  return s?.installedAt ? toDateStr(s.installedAt) : "9999-12-31";
}

export type CareStatus = {
  /** Son dogum gununden beri yedek alinmadi */
  backupDue: boolean;
  /** PDF'e kaydedilmesi gereken yas kitabi (ornek 3 = "3 yas") */
  yearbookDue: number | null;
  lastBackupAt: string | null;
  lastBirthday: string;
};

/** Yas yili araligi: a. dogum gunu (dahil) -> (a+1). dogum gunu (haric) */
export function ageYearRange(birth: string, age: number): { from: string; to: string } {
  const b = fromDateStr(birth);
  const from = new Date(Date.UTC(b.getUTCFullYear() + age, b.getUTCMonth(), b.getUTCDate()));
  const to = new Date(Date.UTC(b.getUTCFullYear() + age + 1, b.getUTCMonth(), b.getUTCDate()));
  return { from: toDateStr(from), to: toDateStr(to) };
}

/** Bugune esit ya da onceki en son dogum gunu ve o gun kac yasina girdigi. */
export function lastBirthdayOf(birth: string, today: string): { date: string; turned: number } {
  const b = fromDateStr(birth);
  const t = fromDateStr(today);
  let turned = t.getUTCFullYear() - b.getUTCFullYear();
  let d = new Date(Date.UTC(b.getUTCFullYear() + turned, b.getUTCMonth(), b.getUTCDate()));
  if (d > t) { turned -= 1; d = new Date(Date.UTC(b.getUTCFullYear() + turned, b.getUTCMonth(), b.getUTCDate())); }
  return { date: toDateStr(d), turned };
}

export async function careStatus(birth: string, today = todayStr()): Promise<CareStatus> {
  const [settings, LAUNCH] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 1 } }),
    kurulumGunu(),
  ]);
  const lb = lastBirthdayOf(birth, today);
  const lastBackup = settings?.lastBackupAt ? toDateStr(settings.lastBackupAt) : null;

  // Yedek: her dogum gununden sonra bir kez; alinana kadar hatirlat. Acilistan onceki dogum gunleri sayilmaz.
  const backupDue = lb.date >= LAUNCH && (lastBackup === null || lastBackup < lb.date);

  // Kitap: biten yas yili (turned-1), acilistan sonra bitmisse ve henuz kaydedilmemisse
  let yearbookDue: number | null = null;
  const endedAge = lb.turned - 1;
  if (endedAge >= 0 && lb.date >= LAUNCH && (settings?.lastYearbookAge ?? -1) < endedAge) {
    const r = ageYearRange(birth, endedAge);
    const had = await prisma.saying.count({ where: { saidAt: { gte: fromDateStr(r.from), lt: fromDateStr(r.to) } } });
    if (had > 0) yearbookDue = endedAge;
  }
  return { backupDue, yearbookDue, lastBackupAt: settings?.lastBackupAt?.toISOString() ?? null, lastBirthday: lb.date };
}
