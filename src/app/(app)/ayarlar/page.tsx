import Link from "next/link";
import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { TRASH_DAYS } from "@/lib/trash";
import { getBirthDate } from "@/lib/brand";
import { getSessionParent } from "@/lib/auth";
import { formatBytes, storageUsage, usageLevel, depoDurumu, type StorageUsage } from "@/lib/media";
import { DepoYukseltme } from "./DepoYukseltme";
import { SettingsForms } from "./SettingsForms";
import { ShareLinks } from "@/components/ShareLinks";
import { Backup } from "@/components/Backup";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PhotoLayoutPicker } from "@/components/PhotoLayoutPicker";
import { PushToggle } from "@/components/PushToggle";
import { getVapidPublicKey } from "@/lib/push";
import { PasskeyManager } from "@/components/PasskeyManager";
import { FamilyAccounts } from "@/components/FamilyAccounts";
import { listShareLinks } from "@/app/api/paylasim/route";

export const metadata = { title: "Ayarlar" };
export const dynamic = "force-dynamic";

const FOLDER_LABEL: Record<string, string> = { photos: "Fotoğraflar", videos: "Videolar", audio: "Ses kayıtları" };

export default async function AyarlarPage() {
  const [birth, me, parents, usage, links, depo] = await Promise.all([
    getBirthDate(),
    getSessionParent(),
    prisma.parent.findMany({ select: { id: true, name: true, email: true, lastLoginAt: true, mustChangePassword: true }, orderBy: { createdAt: "asc" } }),
    storageUsage().catch((): StorageUsage | null => null),
    listShareLinks(),
    depoDurumu(),
  ]);
  // Medya yedegi icin yil listesi: icerigi olan yillar, yeniden eskiye
  const [ph, vd, au] = await Promise.all([
    prisma.photo.findMany({ select: { takenAt: true } }),
    prisma.video.findMany({ select: { takenAt: true } }),
    prisma.saying.findMany({ where: { audioPath: { not: null } }, select: { saidAt: true } }),
  ]);
  const passkeys = me
    ? (await prisma.passkey.findMany({ where: { parentId: me.id }, orderBy: { createdAt: "asc" } })).map((p) => ({
        id: p.id, label: p.label, createdAt: p.createdAt.toISOString(), lastUsedAt: p.lastUsedAt?.toISOString() ?? null,
      }))
    : [];
  const years = [...new Set([...ph.map((r) => r.takenAt), ...vd.map((r) => r.takenAt), ...au.map((r) => r.saidAt)].map((d) => d.getUTCFullYear()))].sort((a, b) => b - a);
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Ayarlar</h1>

      <FamilyAccounts
        meId={me?.id ?? null}
        members={parents.map((p) => ({
          id: p.id, name: p.name, email: p.email,
          lastLoginAt: p.lastLoginAt ? p.lastLoginAt.toISOString() : null,
          geciciSifre: p.mustChangePassword,
        }))}
      />

      <section className="bubble p-5">
        <h2 className="text-xl font-bold mb-1">Çöp kutusu</h2>
        <p className="text-ink-soft text-sm mb-3">
          Silinen söz, fotoğraf ve videolar {TRASH_DAYS} gün burada bekler. Yanlışlıkla silineni geri alabilirsin.
        </p>
        <Link href="/cop" className="btn btn-soft"><Trash2 size={18} /> Çöp kutusunu aç</Link>
      </section>

      <ShareLinks links={links} />

      <SettingsForms birth={birth} />

      <PasskeyManager passkeys={passkeys} />

      <PushToggle publicKey={await getVapidPublicKey().catch(() => null)} />

      <ThemeToggle />

      <PhotoLayoutPicker />

      <Backup years={years} />

      <section className="bubble p-5" id="depolama">
        <h2 className="text-xl font-bold mb-1">Depolama</h2>
        {usage ? (
          <>
            <p className="text-ink-soft text-sm mb-3">
              Toplam <strong className="text-ink">{formatBytes(usage.totalBytes)}</strong> / {formatBytes(depo.serbestBayt)}, {usage.count} dosya{depo.ad === "harici" ? " (kendi deponuz)" : ""}.
            </p>
            {(() => {
              const pct = Math.min(100, Math.round((usage.totalBytes / depo.serbestBayt) * 100));
              const level = usageLevel(usage.totalBytes, depo.serbestBayt);
              const color = level === "critical" ? "var(--color-crayon)" : level === "warn" ? "var(--color-sun)" : "var(--color-grass)";
              return (
                <div className="mb-3">
                  <div className="h-3 rounded-full bg-sky-deep overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Depolama doluluğu">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <p className="text-sm mt-2" style={{ color: level === "ok" ? "var(--color-ink-soft)" : color }}>
                    {level === "ok" && (depo.sertSinir
                      ? `%${pct} dolu. Kurulumla gelen Vercel Blob'da ${formatBytes(depo.serbestBayt)} ücretsiz. Sınır aşılırsa depo 30 gün kapanır; ona gelmeden uyarırız.`
                      : `%${pct} dolu. Kendi deponuzda ${formatBytes(depo.serbestBayt)} ücretsiz; üstü ayda GB başına birkaç kuruş, fotoğraflara bakmak ücretsiz.`)}
                    {level === "warn" && (depo.sertSinir
                      ? `%${pct} dolu. Ücretsiz sınıra yaklaşıyor; dolunca depo 30 gün kapanır. Aşağıdan alanı 10 GB'a çıkarabilirsin.`
                      : `%${pct} dolu. Ücretsiz sınıra yaklaşıyor; üstü çok ucuz ama istersen büyük videoları ayıkla.`)}
                    {level === "critical" && (depo.sertSinir
                      ? `%${pct} dolu! Sınır dolarsa depo 30 gün tamamen kapanır, fotoğraflar da görünmez olur. Aşağıdan alanı 10 GB'a çıkar ya da büyük videoları sil.`
                      : `%${pct} dolu! Ücretsiz sınır dolmak üzere; üstü küçük bir ücretle devam eder, hiçbir şey kapanmaz.`)}
                  </p>
                </div>
              );
            })()}
            <ul className="text-sm space-y-1">
              {Object.entries(usage.byFolder).sort((a, b) => b[1].bytes - a[1].bytes).map(([folder, f]) => (
                <li key={folder} className="flex justify-between">
                  <span>{FOLDER_LABEL[folder] ?? folder} <span className="text-ink-faint">({f.count})</span></span>
                  <span className="font-display">{formatBytes(f.bytes)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-ink-soft text-sm">Depolama bilgisi şu an alınamadı.</p>
        )}
        <DepoYukseltme aktifDepo={depo.ad} kullanilanBayt={usage?.totalBytes ?? null} />
      </section>
    </div>
  );
}
