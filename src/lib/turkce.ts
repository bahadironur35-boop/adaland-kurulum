/**
 * Turkce ek uyumu. Her ailenin cocugu farkli isimde oldugu icin metinler
 * calisma zamaninda birlesiyor; duz birlestirme "Zeynep'nin" gibi bozuk
 * ciktilar uretir. Burasi o ekleri kurala gore uretir.
 *
 * Kapsam bilincli olarak dar: ozel ad + tek ek. Cogul, iyelik zinciri,
 * birlesik ad cekimi yok - uygulamada gecen butun kaliplar bu dordu.
 */

const SESLI = "aeıioöuü";

/** Son sesliye gore 4'lu uyum (ı/i/u/ü). */
const DORTLU: Record<string, string> = {
  a: "ı", ı: "ı",
  e: "i", i: "i",
  o: "u", u: "u",
  ö: "ü", ü: "ü",
};

/** Son sesliye gore 2'li uyum (a/e). */
const IKILI: Record<string, string> = {
  a: "a", ı: "a", o: "a", u: "a",
  e: "e", i: "e", ö: "e", ü: "e",
};

/** Sertlesme: bu harflerle biten adda bulunma eki -da degil -ta olur. */
const SERT = "fstkçşhp";

/** Turkce'ye duyarli kucultme: I -> ı, İ -> i (varsayilan toLowerCase yanlis yapar). */
function kucult(s: string): string {
  return s.replace(/I/g, "ı").replace(/İ/g, "i").toLowerCase();
}

function sonHarf(ad: string): string {
  const t = kucult(ad.trim());
  return t.slice(-1);
}

function sonSesli(ad: string): string {
  const t = kucult(ad.trim());
  for (let i = t.length - 1; i >= 0; i--) {
    if (SESLI.includes(t[i])) return t[i];
  }
  return "a"; // sesli harf yoksa (kisaltma vb.) kalin varsay
}

function seslIyleMiBitiyor(ad: string): boolean {
  return SESLI.includes(sonHarf(ad));
}

/** Ozel adlarda ek kesme isaretiyle ayrilir: "Ada'nın". */
function ekle(ad: string, ek: string): string {
  return `${ad.trim()}'${ek}`;
}

/** İlgi hali (kimin?): Ada'nın, Zeynep'in, Ömer'in, Poyraz'ın */
export function ilgi(ad: string): string {
  const v = DORTLU[sonSesli(ad)];
  return ekle(ad, seslIyleMiBitiyor(ad) ? `n${v}n` : `${v}n`);
}

/** Yönelme hali (kime?): Ada'ya, Zeynep'e, Ömer'e, Poyraz'a */
export function yonelme(ad: string): string {
  const v = IKILI[sonSesli(ad)];
  return ekle(ad, seslIyleMiBitiyor(ad) ? `y${v}` : v);
}

/** Belirtme hali (kimi?): Ada'yı, Zeynep'i, Ömer'i, Poyraz'ı */
export function belirtme(ad: string): string {
  const v = DORTLU[sonSesli(ad)];
  return ekle(ad, seslIyleMiBitiyor(ad) ? `y${v}` : v);
}

/** Bulunma hali (nerede?): Adaland'da, Poyraz'ın Dünyası'nda, Kitap'ta */
export function bulunma(ad: string): string {
  const v = IKILI[sonSesli(ad)];
  const d = SERT.includes(sonHarf(ad)) ? "t" : "d";
  return ekle(ad, `${d}${v}`);
}
