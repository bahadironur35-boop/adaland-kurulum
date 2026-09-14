import { randomBytes } from "node:crypto";

/**
 * Telefonda okunup yazilabilen gecici sifre: karistirilan harfler (0/O, 1/l/I) yok.
 * Aile ici sifirlamada ve CLI kurtarma betiginde ayni uretici kullanilir.
 */
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Kurtarma kodu, tiresiz hali. Ekranda 4'lu bloklarla gosterilir, saklanan ve
 * dogrulanan HER ZAMAN bu tiresiz hali olur (normalizeCode). */
export function normalizeCode(code: string): string {
  return code.replace(/[\s-]/g, "");
}

export function tempPassword(length = 10): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
