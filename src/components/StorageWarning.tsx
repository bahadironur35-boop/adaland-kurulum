import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { estimateUsageBytes, formatBytes, usageLevel, depoDurumu } from "@/lib/media";

/**
 * Fotograf/Video sayfalarinin ustunde, depo %70'i gecince gorunen serit.
 * Depoya sormaz; veritabanindaki boyutlardan tahmin eder (ucretsiz).
 *
 * Iki depo, iki farkli aciliyet:
 * - Blob (kurulumun varsayilani, 1 GB): sinir asilirsa depo 30 gun TAMAMEN kapanir,
 *   fotograflar da gorunmez olur. Bu yuzden metin cozumu gosteriyor: R2'ye gec.
 * - R2 (yukseltme, 10 GB): asim yumusak, yalnizca kucuk bir ucret baslar.
 */
export async function StorageWarning() {
  const [bytes, depo] = await Promise.all([estimateUsageBytes().catch(() => 0), depoDurumu()]);
  const level = usageLevel(bytes, depo.serbestBayt);
  if (level === "ok") return null;
  const pct = Math.min(100, Math.round((bytes / depo.serbestBayt) * 100));
  const critical = level === "critical";
  const sinir = formatBytes(depo.serbestBayt);
  return (
    <div className={`rounded-2xl border-2 p-3 mb-5 flex items-start gap-3 ${critical ? "border-crayon bg-crayon-soft" : "border-sun bg-sun-soft"}`} role="status">
      <AlertTriangle size={20} className={critical ? "text-crayon shrink-0" : "text-ink shrink-0"} />
      <div className="text-sm">
        <strong>Depo yaklaşık %{pct} dolu</strong> ({formatBytes(bytes)} / {sinir}).{" "}
        {depo.sertSinir
          ? (critical
              ? `Ücretsiz ${sinir} dolmak üzere. Dolarsa depo 30 gün tamamen kapanır, fotoğraflar da görünmez olur. `
              : `Ücretsiz ${sinir} sınırına yaklaşıyor. Dolunca depo geçici olarak kapanır. `)
          : (critical
              ? `Ücretsiz ${sinir} dolmak üzere; üstü küçük bir ücretle devam eder, hiçbir şey kapanmaz. `
              : `Ücretsiz ${sinir} sınırına yaklaşıyor. `)}
        <Link href="/ayarlar#depolama" className="underline font-semibold">
          {depo.sertSinir ? "Alanı 10 GB'a çıkarın" : "Ayarlar → Depolama"}
        </Link>
      </div>
    </div>
  );
}
