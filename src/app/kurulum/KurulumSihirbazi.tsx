"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Baby, Users, HardDrive, ShieldCheck, Check, X, Copy, Smartphone, Loader, AlertTriangle } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/client";
import { todayStr } from "@/lib/dates";
import { ilgi, yonelme } from "@/lib/turkce";
import { DepoBagla, DepoBagliSatiri, type BaglantiSonucu } from "@/components/DepoBagla";
import { depoyaTasiVeAktifEt, tasimaHatasiMetni } from "@/lib/depo-tasi";

type Checks = { veritabani: boolean; depo: boolean | null; bildirim: boolean; depoNotu?: string };
type Sonuc = { tempPassword: string | null; recoveryCode: string | null; checks: Checks };

const ADIMLAR = [
  { n: 1, ad: "Çocuk", Icon: Baby },
  { n: 2, ad: "Hesaplar", Icon: Users },
  { n: 3, ad: "Depolama", Icon: HardDrive },
  { n: 4, ad: "Kontrol", Icon: ShieldCheck },
] as const;

/**
 * Ilk calistirma sihirbazi. Dort ekran.
 *
 * Depolama adimi ZORUNLU (atlanamaz normal yoldan). Vercel'in kendi deposu
 * (Blob) BILEREK hic kullanilmiyor: Deploy Button ile store acilmiyor (bkz.
 * scripts/ayna.ts, api/kod.js), yani baglanmazsa aile fotograf/video
 * yukleyemez. Aile dogrudan kendi 10 GB'lik deposuyla basliyor — sonradan
 * "1 GB doldu, buyut" diye ikinci bir isle ugrasmiyor.
 *
 * Depolama adimi Hesaplar'dan SONRA gelmek zorunda: /api/depo oturum ister
 * (requireParent()), oturum da ancak Hesaplar adiminda parent olusunca acilir.
 *
 * Saglayici (B2/R2) ONERILMIYOR: DepoBagla bilesenine bak.
 */
export function KurulumSihirbazi() {
  const router = useRouter();
  const [adim, setAdim] = useState<1 | 2 | 3 | 4>(1);
  const [depo, setDepo] = useState<BaglantiSonucu | null>(null);
  const [depoDurum, setDepoDurum] = useState<"bekliyor" | "aktifEdiliyor" | "aktif" | "hata">("bekliyor");
  const [depoHata, setDepoHata] = useState<string | null>(null);
  // Hata sonrasi "yine de devam et" YALNIZCA sorun yasandiginda gorunur; basarili
  // baglantidan sonra hicbir kacis yolu yok, adim gercekten zorunlu.
  const [depoAtlandi, setDepoAtlandi] = useState(false);
  const [childName, setChildName] = useState("");
  const [siteName, setSiteName] = useState("");
  const [siteElle, setSiteElle] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [p, setP] = useState({ name: "", email: "", password: "", again: "" });
  const [ikinci, setIkinci] = useState(true);
  const [s, setS] = useState({ name: "", email: "" });
  const [hata, setHata] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const [kopya, setKopya] = useState<string | null>(null);

  // Site adi onerisi cocuk adindan turer; aile isterse ustune yazar.
  const oneri = childName.trim() ? `${childName.trim()}land` : "";
  const site = siteElle ? siteName : oneri;

  function ileri1(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (!childName.trim()) return setHata("Çocuğun adını yaz.");
    if (!birthDate) return setHata("Doğum tarihini seç.");
    if (!site.trim()) return setHata("Sayfaya bir ad ver.");
    setAdim(2);
  }

  async function bitir(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (p.password !== p.again) return setHata("İki şifre birbirini tutmuyor.");
    if (ikinci && (!s.name.trim() || !s.email.trim())) return setHata("İkinci kişinin adını ve e-postasını yaz, ya da bu adımı kapat.");
    setBusy(true);
    try {
      const r = await api<Sonuc>("/api/kurulum", {
        method: "POST",
        json: {
          childName: childName.trim(), siteName: site.trim(), birthDate,
          parent: { name: p.name.trim(), email: p.email.trim(), password: p.password },
          second: ikinci ? { name: s.name.trim(), email: s.email.trim() } : null,
        },
      });
      setSonuc(r);
      setAdim(3);   // once depolama (gecilebilir), sonra kontrol
    } catch (err) {
      setHata(err instanceof Error ? err.message : "Kurulum tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function kopyala(v: string) {
    try { await navigator.clipboard.writeText(v); setKopya(v); setTimeout(() => setKopya(null), 2000); } catch {}
  }

  return (
    <div className="bubble p-6 sm:p-8">
      {/* Adim cubugu: sira gercek, bu yuzden numarali */}
      <ol className="flex items-center gap-2 mb-6" aria-label="Kurulum adımları">
        {ADIMLAR.map(({ n, ad, Icon }, i) => (
          <li key={n} className="flex items-center gap-2">
            <span className={clsx("grid place-items-center w-9 h-9 rounded-full font-display font-bold text-sm",
              adim === n ? "bg-crayon text-white" : adim > n ? "bg-grass-soft text-grass" : "bg-sky-deep text-ink-faint")}>
              {adim > n ? <Check size={16} strokeWidth={3} /> : <Icon size={17} />}
            </span>
            <span className={clsx("text-sm font-display font-semibold", adim === n ? "text-ink" : "text-ink-faint")}>{ad}</span>
            {i < ADIMLAR.length - 1 && <span className="w-6 h-px bg-line mx-1" aria-hidden />}
          </li>
        ))}
      </ol>

      {adim === 1 && (
        <form onSubmit={ileri1} className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold leading-tight">Hoş geldin</h1>
            <p className="text-ink-soft mt-1">Bu sayfa bir çocuğun sözlerini, fotoğraflarını ve ilklerini saklar. Önce onu tanıyalım.</p>
          </div>
          <div>
            <label className="label" htmlFor="k-ad">Çocuğunuzun adı</label>
            <input id="k-ad" className="field" autoFocus maxLength={40} value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="Zeynep" />
          </div>
          <div>
            <label className="label" htmlFor="k-dogum">Doğum tarihi</label>
            <input id="k-dogum" className="field" type="date" max={todayStr()} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            <p className="text-ink-faint text-xs mt-1">Her sözün ve fotoğrafın üstündeki yaş çıkartması buradan hesaplanır.</p>
          </div>
          <div>
            <label className="label" htmlFor="k-site">Sayfanın adı</label>
            <input id="k-site" className="field" maxLength={60} value={site}
              onChange={(e) => { setSiteElle(true); setSiteName(e.target.value); }}
              placeholder={oneri || "Zeynep'in Dünyası"} />
            <p className="text-ink-faint text-xs mt-1">Telefonun ana ekranında ve akrabalara giden linkte bu ad görünür. İstediğini yaz.</p>
          </div>
          {childName.trim() && (
            <div className="rounded-2xl bg-sky p-3 text-sm">
              <p className="text-ink-faint text-xs mb-1">Şöyle görünecek:</p>
              <p className="font-hand text-lg leading-snug">
                {ilgi(childName.trim())} sözleri · {yonelme(childName.trim())} mektuplar · {childName.trim()} ne dedi?
              </p>
            </div>
          )}
          {hata && <p role="alert" className="text-crayon text-sm font-semibold">{hata}</p>}
          <button className="btn btn-primary w-full" type="submit">Devam</button>
        </form>
      )}

      {adim === 2 && (
        <form onSubmit={bitir} className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold leading-tight">Kim girecek?</h1>
            <p className="text-ink-soft mt-1">Önce sen. Kendi şifreni belirle.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="k-pad">Adın</label>
              <input id="k-pad" className="field" autoFocus required maxLength={60} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="Anne" />
            </div>
            <div>
              <label className="label" htmlFor="k-pmail">E-posta</label>
              <input id="k-pmail" className="field" type="email" required autoComplete="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="k-psifre">Şifre <span className="font-normal text-ink-faint">(en az 8)</span></label>
              <input id="k-psifre" className="field" type="password" required minLength={8} autoComplete="new-password" value={p.password} onChange={(e) => setP({ ...p, password: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="k-ptekrar">Bir daha</label>
              <input id="k-ptekrar" className="field" type="password" required minLength={8} autoComplete="new-password" value={p.again} onChange={(e) => setP({ ...p, again: e.target.value })} />
            </div>
          </div>

          <div className="rounded-2xl border-2 border-line p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1 w-5 h-5 accent-[var(--color-crayon)]" checked={ikinci} onChange={(e) => setIkinci(e.target.checked)} />
              <span>
                <span className="font-display font-bold block">İkinci bir kişi ekle</span>
                <span className="text-ink-soft text-sm">Baba, anne, anneanne... Şifresini unutan olursa diğeri ona yeni şifre verir. Tek hesapla kalırsan yerine bir kurtarma kodu alırsın.</span>
              </span>
            </label>
            {ikinci && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="label" htmlFor="k-sad">Adı</label>
                  <input id="k-sad" className="field" maxLength={60} value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} placeholder="Baba" />
                </div>
                <div>
                  <label className="label" htmlFor="k-smail">E-postası</label>
                  <input id="k-smail" className="field" type="email" value={s.email} onChange={(e) => setS({ ...s, email: e.target.value })} />
                </div>
                <p className="text-ink-faint text-xs sm:col-span-2">Ona geçici bir şifre üretilir, sen söylersin; ilk girişte kendi şifresini belirler.</p>
              </div>
            )}
          </div>

          {hata && <p role="alert" className="text-crayon text-sm font-semibold">{hata}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setAdim(1)}>Geri</button>
            <button className="btn btn-primary flex-1" type="submit" disabled={busy}>{busy ? "Kuruluyor…" : "Kurulumu bitir"}</button>
          </div>
        </form>
      )}

      {adim === 3 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-3xl font-bold leading-tight">Şimdi fotoğraflarının nerede duracağını bağlayalım</h1>
            <p className="text-ink-soft mt-1">
              Bu sayfa fotoğraf ve videoları Vercel&apos;de değil, <b>sizin seçtiğiniz</b> ayrı bir depoda tutar —
              10 GB ücretsiz. İki dakikanı alır, tek seferlik bir iş; devam etmek için bağlaman gerekiyor.
            </p>
          </div>

          {depo && depoDurum !== "hata" ? (
            <>
              <DepoBagliSatiri sonuc={depo} />
              {depoDurum === "aktifEdiliyor" && (
                <p className="text-sm text-ink-soft flex items-center gap-1.5"><Loader size={15} className="animate-spin" /> Bağlanıyor…</p>
              )}
              {depoDurum === "aktif" && (
                <p className="text-sm text-grass flex items-center gap-1.5"><Check size={15} /> Alanın hazır, 10 GB.</p>
              )}
              <button type="button" className="btn btn-primary w-full" disabled={depoDurum === "aktifEdiliyor"} onClick={() => setAdim(4)}>
                Devam et
              </button>
            </>
          ) : (
            <>
              <DepoBagla
                onBasarili={async (r) => {
                  setDepo(r);
                  setDepoDurum("aktifEdiliyor");
                  setDepoHata(null);
                  try {
                    // Kurulumda parent.count()===0, yani medya da yok: dongu
                    // hic donmeden biter. Aile herhangi bir ilerleme gormez.
                    await depoyaTasiVeAktifEt();
                    setDepoDurum("aktif");
                  } catch (e) {
                    setDepoDurum("hata");
                    setDepoHata(tasimaHatasiMetni(e));
                  }
                }}
                gonderEtiketi="Bağla ve devam et"
              />
              {depoDurum === "hata" && (
                <p className="text-sm text-crayon flex items-start gap-1.5">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  {depoHata}
                </p>
              )}
              {depoDurum === "hata" && (
                <button type="button" className="text-sm text-ink-faint underline" onClick={() => { setDepoAtlandi(true); setAdim(4); }}>
                  Sorun devam ediyorsa, şimdilik atla ve kurulumu bitir (Ayarlar&apos;dan tekrar denenir)
                </button>
              )}
            </>
          )}
        </div>
      )}

      {adim === 4 && sonuc && (
        <div className="space-y-5">
          <div>
            <h1 className="text-3xl font-bold leading-tight">{site} hazır 🎉</h1>
            <p className="text-ink-soft mt-1">Birkaç şeyi kontrol ettim:</p>
          </div>

          <ul className="space-y-2">
            <Satir ok={sonuc.checks.veritabani} etiket="Veritabanı yazılabilir" />
            <Satir ok={sonuc.checks.depo === true || depoDurum === "aktif"} etiket="Fotoğraf deposu yazılabilir"
              not={(sonuc.checks.depo === true || depoDurum === "aktif") ? undefined : (depoAtlandi ? "Şimdilik atlandı; Ayarlar > Depolama'dan bağlayabilirsin." : (sonuc.checks.depoNotu ?? "Yazma denemesi başarısız."))} />
            <Satir ok={sonuc.checks.bildirim} etiket="Bildirim anahtarları hazır" />
            <Satir ok etiket="Günlük hatırlatma zamanlanmış" not="İstersen Vercel › Settings › Environment Variables'a CRON_SECRET adıyla 32 karakter rastgele bir değer ekle; bir kademe daha güvenli olur. Zorunlu değil." />
          </ul>

          {sonuc.tempPassword && (
            <div className="rounded-2xl p-4" style={{ background: "var(--color-grass-soft)" }}>
              <p className="font-semibold">{s.name} için geçici şifre</p>
              <div className="flex items-center gap-2 mt-2">
                <code className="font-display text-2xl tracking-wide bg-paper rounded-xl px-3 py-2 select-all">{sonuc.tempPassword}</code>
                <button type="button" onClick={() => kopyala(sonuc.tempPassword!)} className="btn btn-ghost h-10 w-10 min-h-0 p-0" aria-label="Kopyala">
                  {kopya === sonuc.tempPassword ? <Check size={18} className="text-grass" /> : <Copy size={18} />}
                </button>
              </div>
              <p className="text-ink-soft text-sm mt-2">Bir daha gösterilmez. Ona söyle; ilk girişte kendi şifresini belirleyecek.</p>
            </div>
          )}

          {sonuc.recoveryCode && (
            <div className="rounded-2xl p-4" style={{ background: "var(--color-sun-soft)" }}>
              <p className="font-semibold">Kurtarma kodun</p>
              <div className="flex items-center gap-2 mt-2">
                <code className="font-display text-2xl tracking-wide bg-paper rounded-xl px-3 py-2 select-all">{sonuc.recoveryCode}</code>
                <button type="button" onClick={() => kopyala(sonuc.recoveryCode!)} className="btn btn-ghost h-10 w-10 min-h-0 p-0" aria-label="Kopyala">
                  {kopya === sonuc.recoveryCode ? <Check size={18} className="text-grass" /> : <Copy size={18} />}
                </button>
              </div>
              <p className="text-ink-soft text-sm mt-2">
                Şifreni unutursan giriş ekranındaki &quot;Şifreni mi unuttun?&quot; altına bu kodu yazarsın. <strong className="text-ink">Bir daha gösterilmez, tek kullanımlık.</strong> Telefonunun not defterine kaydet.
              </p>
            </div>
          )}

          <div className="rounded-2xl border-2 border-grape bg-grape-soft p-4 flex gap-3">
            <Smartphone size={22} className="text-grape shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-display font-bold">Şimdi ana ekrana ekle</p>
              <p className="text-ink-soft">iPhone: Safari&apos;de paylaş düğmesi › &quot;Ana Ekrana Ekle&quot;. Android: Chrome menüsü › &quot;Ana ekrana ekle&quot;. Bunu şimdi yap; sonra yaparsan uygulamanın adı eski kalabilir.</p>
              <p className="text-ink-faint text-xs mt-1">Özel alan adı bağlayacaksan önce onu bağla, Face ID&apos;yi sonra kur; alan adı değişince Face ID kayıtları sıfırlanır.</p>
            </div>
          </div>

          <button className="btn btn-primary w-full" onClick={() => { router.push("/"); router.refresh(); }}>
            {yonelme(site)} gir
          </button>
        </div>
      )}
    </div>
  );
}

function Satir({ ok, etiket, not }: { ok: boolean; etiket: string; not?: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className={clsx("grid place-items-center w-6 h-6 rounded-full shrink-0 mt-0.5", ok ? "bg-grass text-white" : "bg-crayon text-white")}>
        {ok ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
      </span>
      <div className="text-sm">
        <span className="font-semibold">{etiket}</span>
        {not && <p className="text-ink-soft mt-0.5">{not}</p>}
      </div>
    </li>
  );
}
