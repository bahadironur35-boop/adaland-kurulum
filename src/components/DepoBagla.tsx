"use client";

import { useState } from "react";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/client";

/**
 * Harici depoyu (Backblaze B2 / Cloudflare R2) baglama formu: saglayici secimi,
 * adim adim rehber, dort alan, "sina ve kaydet".
 *
 * ORTAK BILESEN: hem kurulum sihirbazinda (henuz dosya yokken, tasima gerekmez)
 * hem Ayarlar'daki yukseltmede (dosyalar tasinacak) ayni sey soruluyor. Rehber
 * metni tek yerde dursun diye ayrildi — iki kopya tutulsa biri mutlaka geride
 * kalir ve aile panelde bulamadigi bir dugmeyi arar.
 *
 * SAGLAYICI ONERILMIYOR: ikisinin de gercek bir ustunlugu var (B2 kart istemiyor,
 * Cloudflare cok daha buyuk ve mali olarak saglam). Aileye fark yaziliyor, siralama
 * degil. Hangisi secilirse secilsin depo degistirmek portatif: yollar veritabaninda,
 * tasima ayni ekrandan yapiliyor.
 *
 * Panel etiketleri gercek hesapta dogrulandi (2026-09-14): sol menude
 * "B2 Cloud Storage > Buckets > Create a Bucket", Endpoint bucket KARTINDA,
 * "Application Keys > Add a New Application Key", "Type of Access: Read and Write".
 */
export type BaglantiSonucu = { saglayiciAdi: string; cors: boolean; bucketDosyaSayisi: number };

type Saglayici = "b2" | "r2";

export function DepoBagla({
  onBasarili,
  gonderEtiketi = "Bağlantıyı sına ve kaydet",
  ikincilDugme,
}: {
  onBasarili: (s: BaglantiSonucu) => void;
  gonderEtiketi?: string;
  ikincilDugme?: React.ReactNode;
}) {
  const [saglayici, setSaglayici] = useState<Saglayici>("b2");
  const [alan, setAlan] = useState({ endpoint: "", accountId: "", accessKeyId: "", secretAccessKey: "", bucket: "" });
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const alanlar =
    saglayici === "b2"
      ? ([
          ["endpoint", "Endpoint", "Bucket kartında yazar, örneğin s3.eu-central-003.backblazeb2.com"],
          ["bucket", "Bucket adı", "Oluştururken verdiğiniz ad"],
          ["accessKeyId", "keyID", ""],
          ["secretAccessKey", "applicationKey", "Bir daha gösterilmez"],
        ] as const)
      : ([
          ["accountId", "Account ID", "R2 sayfasının sağında, 32 haneli"],
          ["bucket", "Bucket adı", ""],
          ["accessKeyId", "Access Key ID", ""],
          ["secretAccessKey", "Secret Access Key", "Bir daha gösterilmez"],
        ] as const);

  async function kaydet() {
    setHata(null);
    setMesgul(true);
    try {
      const govde =
        saglayici === "b2"
          ? { saglayici, endpoint: alan.endpoint, accessKeyId: alan.accessKeyId, secretAccessKey: alan.secretAccessKey, bucket: alan.bucket }
          : { saglayici, accountId: alan.accountId, accessKeyId: alan.accessKeyId, secretAccessKey: alan.secretAccessKey, bucket: alan.bucket };
      onBasarili(await api<BaglantiSonucu>("/api/depo", { method: "POST", json: govde }));
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Bağlantı kurulamadı.");
    } finally {
      setMesgul(false);
    }
  }

  return (
    <>
      {/* Biri "onerilen" degil: ikisinin de gercek bir ustunlugu ve gercek bir
          bedeli var, karar ailenin. Ustunluk sirasi degil, fark yaziliyor. */}
      <div className="grid sm:grid-cols-2 gap-2 mb-3" role="radiogroup" aria-label="Depo sağlayıcı">
        {([
          ["b2", "Backblaze B2", "Kredi kartı istemiyor.", "2007'den beri var ve borsada işlem görüyor, ama küçük bir şirket ve henüz kâr etmiyor."],
          ["r2", "Cloudflare R2", "Çok daha büyük, mali olarak güçlü bir şirket.", "Ücretsiz katmanda bile kredi kartı bağlamanız gerekiyor."],
        ] as const).map(([k, ad, arti, eksi]) => (
          <button
            key={k} type="button" role="radio" aria-checked={saglayici === k}
            onClick={() => { setSaglayici(k); setHata(null); }}
            className={`rounded-xl border-2 p-3 text-left transition-colors ${saglayici === k ? "border-grape bg-paper" : "border-line bg-paper/60"}`}
          >
            <span className="block font-display font-bold text-sm">{ad}</span>
            <span className="block text-xs mt-1 text-ink">{arti}</span>
            <span className="block text-xs mt-0.5 text-ink-faint">{eksi}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-ink-faint mb-4">
        İkisinde de <b>10 GB ücretsiz</b>. Seçiminiz kalıcı değil: sonradan diğerine geçmek aynı
        ekrandan on dakikalık bir iş, dosyaları uygulama kendisi taşıyor. Yıllık yedeğiniz de
        sizde durur, fotoğrafların aslı zaten telefonunuzdadır.
      </p>

      {saglayici === "b2" ? (
        <ol className="text-sm space-y-2.5 mb-4 list-decimal pl-5">
          <li>
            <a className="underline font-semibold" href="https://www.backblaze.com/sign-up/cloud-storage" target="_blank" rel="noreferrer">backblaze.com</a>&apos;da
            ücretsiz hesap açın.
          </li>
          <li>Sol menüde <b>B2 Cloud Storage → Buckets → Create a Bucket</b>: bir ad verin, <b>Private</b> seçin.</li>
          <li>Bucket oluşunca kartında <b>Endpoint</b> diye bir satır çıkar; onu kopyalayın.</li>
          <li>
            Sol menüde <b>Application Keys → Add a New Application Key</b>: bu bucket&apos;ı seçin,
            <b> Access Type: Read and Write</b>. Çıkan <b>keyID</b> ve <b>applicationKey</b>&apos;i aşağıya
            yapıştırın — <b>applicationKey yalnızca bir kez gösterilir</b>, sayfadan ayrılmadan kopyalayın.
          </li>
        </ol>
      ) : (
        <ol className="text-sm space-y-2.5 mb-4 list-decimal pl-5">
          <li>
            <a className="underline font-semibold" href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noreferrer">cloudflare.com</a>&apos;da
            hesap açın, <b>R2</b>&apos;ye girip kart bilgisiyle etkinleştirin.
          </li>
          <li><b>Create bucket</b> ile bir depo oluşturun, bölge <b>EU</b>.</li>
          <li><b>API → Manage API tokens → Create User API token</b>, yetki <b>Object Read &amp; Write</b>.</li>
          <li>R2 sayfasının sağındaki <b>Account ID</b>&apos;yi de kopyalayın.</li>
        </ol>
      )}

      <div className="space-y-3">
        {alanlar.map(([k, etiket, ipucu]) => (
          <div key={k}>
            <label className="label" htmlFor={`d-${k}`}>{etiket}</label>
            <input
              id={`d-${k}`} className="field font-mono text-sm"
              type={k === "secretAccessKey" ? "password" : "text"}
              autoComplete="off" spellCheck={false}
              value={alan[k]} onChange={(e) => setAlan({ ...alan, [k]: e.target.value })}
            />
            {ipucu && <p className="text-ink-faint text-xs mt-1">{ipucu}</p>}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <button type="button" className="btn btn-primary" disabled={mesgul} onClick={kaydet}>
          {mesgul ? <Loader2 size={16} className="animate-spin" /> : null} {gonderEtiketi}
        </button>
        {ikincilDugme}
      </div>

      {hata && (
        <p className="text-sm text-crayon mt-3 flex items-start gap-1.5">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {hata}
        </p>
      )}
    </>
  );
}

/** Baglanti kuruldugunda gosterilen kisa onay satiri; iki yerde de ayni. */
export function DepoBagliSatiri({ sonuc }: { sonuc: BaglantiSonucu }) {
  return (
    <p className="text-sm text-grass mb-3 flex items-center gap-1.5">
      <Check size={16} />
      {sonuc.saglayiciAdi} bağlantısı çalışıyor.
      {sonuc.bucketDosyaSayisi > 0 ? " Depoda zaten dosya var, üstüne yazılmaz." : ""}
    </p>
  );
}
