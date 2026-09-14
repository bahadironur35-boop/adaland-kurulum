import Link from "next/link";
import { Archive, BookOpen } from "lucide-react";
import { careStatus } from "@/lib/care";
import { prisma } from "@/lib/db";
import { getSessionParent } from "@/lib/auth";
import { requireBrand } from "@/lib/brand";
import { ilgi } from "@/lib/turkce";

/** Akisin ustunde, dogum gununden sonra: yas kitabini kaydet / yedek al. Sadece anne-babaya. */
export async function CareBanner() {
  const me = await getSessionParent();
  if (!me) return null;
  const [ben, brand] = await Promise.all([
    prisma.parent.findUnique({ where: { id: me.id }, select: { careReminders: true } }),
    requireBrand(),
  ]);
  if (!ben?.careReminders) return null;
  const c = await careStatus(brand.birthDate).catch(() => null);
  if (!c || (!c.backupDue && c.yearbookDue === null)) return null;

  return (
    <div className="space-y-3 mb-8">
      {c.yearbookDue !== null && (
        <div className="rounded-2xl border-2 border-grape bg-grape-soft p-3 flex items-start gap-3" role="status">
          <BookOpen size={20} className="text-grape shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>{ilgi(brand.childName)} {c.yearbookDue} yaş kitabı hazır.</strong> Bir yılın sözleri ve fotoğraflarını PDF olarak kaydet; kaydedince bu şerit kaybolur.{" "}
            <Link href={`/kitap/${c.yearbookDue}`} className="underline font-semibold">Kitabı aç</Link>
          </div>
        </div>
      )}
      {c.backupDue && (
        <div className="rounded-2xl border-2 border-sun bg-sun-soft p-3 flex items-start gap-3" role="status">
          <Archive size={20} className="text-ink shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Yıllık yedek zamanı.</strong> {c.lastBackupAt ? "Doğum gününden beri yedek alınmadı." : "Henüz hiç yedek alınmadı."} JSON&apos;u ve medya ZIP&apos;lerini indirip Drive&apos;a at.{" "}
            <Link href="/ayarlar#yedek" className="underline font-semibold">Yedek al</Link>
          </div>
        </div>
      )}
    </div>
  );
}
