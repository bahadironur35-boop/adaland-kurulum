import { prisma } from "./db";

/**
 * Kurulum sihirbazi kilidi: hic ebeveyn hesabi yoksa acik, varsa kapali.
 * Basit ve sihirbazin isiyle birebir ortusuyor (ilk hesabi o yaratir).
 *
 * Modul kapsaminda bayrak: bir kez "kuruldu" gorulunce bir daha sorgulanmaz;
 * pratikte geri donmez (hesaplar silinmez), her sayfa yuklemesinde count() olmasin.
 */
let kuruldu = false;

export async function kurulumGerekli(): Promise<boolean> {
  if (kuruldu) return false;
  const n = await prisma.parent.count();
  if (n > 0) kuruldu = true;
  return n === 0;
}
