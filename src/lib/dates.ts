/** Takvim gunu yardimcilari. DB'de @db.Date tutulur; kodda "YYYY-MM-DD" string dolasir. */

export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function fromDateStr(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

export function todayStr(): string {
  const n = new Date();
  const local = new Date(n.getTime() - n.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** "2 yaş 4 aylık" gibi yas rozeti. Dogumdan onceki tarihlerde "doğmadan önce". */
export function ageLabel(birth: string, at: string): string {
  const b = fromDateStr(birth);
  const a = fromDateStr(at);
  if (a < b) return "doğmadan önce";
  let years = a.getUTCFullYear() - b.getUTCFullYear();
  let months = a.getUTCMonth() - b.getUTCMonth();
  if (a.getUTCDate() < b.getUTCDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years === 0 && months === 0) {
    const days = Math.floor((a.getTime() - b.getTime()) / 86_400_000);
    return days <= 1 ? "yeni doğmuş" : `${days} günlük`;
  }
  if (years === 0) return `${months} aylık`;
  if (months === 0) return `${years} yaşında`;
  return `${years} yaş ${months} aylık`;
}

const MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

export function formatDateTr(s: string): string {
  const d = fromDateStr(s);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function monthLabelTr(s: string): string {
  const d = fromDateStr(s);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Saniye -> "1:05" / "12:03" / "1:02:09" */
export function formatDuration(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return "";
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(r).padStart(2, "0")}`;
}

/** Bir sonraki dogum gunune kalan gun ve kacinci yas. Bugun dogum gunuyse 0. */
export function nextBirthday(birth: string, today: string): { days: number; age: number } {
  const b = fromDateStr(birth);
  const t = fromDateStr(today);
  let year = t.getUTCFullYear();
  let next = new Date(Date.UTC(year, b.getUTCMonth(), b.getUTCDate()));
  if (next < t) { year += 1; next = new Date(Date.UTC(year, b.getUTCMonth(), b.getUTCDate())); }
  const days = Math.round((next.getTime() - t.getTime()) / 86_400_000);
  return { days, age: year - b.getUTCFullYear() };
}
