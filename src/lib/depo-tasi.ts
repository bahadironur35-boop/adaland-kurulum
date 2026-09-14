"use client";

import { api } from "./client";

/**
 * Blob'dan harici depoya (B2/R2) tasima dongusu. TEK YERDE: Ayarlar'daki
 * yukseltme (genellikle dosya VAR) ve kurulum sihirbazindaki depolama adimi
 * (genellikle dosya YOK, kurulum sirasinda parent.count()===0 oldugu icin
 * medya da olamaz) AYNI ucu, AYNI mantikla kullaniyor. Kurulumda dosya
 * sifirsa dongu hic donmeden "bitir"e gecer; aile hicbir sey gormez.
 *
 * Sunucudan degil TARAYICIDAN akiyor: imzali adresle Blob'dan indirip
 * imzali adresle harici depoya yukluyor. Kesilebilir: her cagri "kalanlari"
 * yeniden hesapliyor, ayni dosyayi iki kez tasimaz.
 */
export type GocDurum = {
  toplamDosya: number;
  kalanDosya: number;
  kalan: { yol: string; bayt: number; tur: string }[];
  kalanBayt: number;
  tasinanBayt: number;
  bitti: boolean;
};

export type TasiIlerleme = { toplam: number; biten: number; dosya: string };

/**
 * @param onIlerleme her adimda cagrilir; kurulum sihirbazi (0 dosya) bunu hic
 *   gormeyebilir, o yuzden UI'da "yukleniyor" gibi notrs bir bekleme goster.
 * @returns tasinan dosya sayisi (0 = zaten bostu / yeni kurulum)
 */
export async function depoyaTasiVeAktifEt(onIlerleme?: (i: TasiIlerleme) => void): Promise<{ tasinanDosya: number }> {
  let d = await api<GocDurum>("/api/depo/goc");
  const toplam = d.kalanBayt + d.tasinanBayt;
  let biten = d.tasinanBayt;
  onIlerleme?.({ toplam, biten, dosya: "" });

  while (!d.bitti) {
    for (const dosya of d.kalan) {
      onIlerleme?.({ toplam, biten, dosya: dosya.yol.split("/").pop() ?? dosya.yol });
      const imza = await api<{ indir: string; yukle: string; tur: string }>("/api/depo/goc", {
        method: "POST",
        json: { islem: "imza", yol: dosya.yol },
      });
      const kaynak = await fetch(imza.indir);
      if (!kaynak.ok) throw new Error(`Dosya okunamadı (${dosya.yol}).`);
      const govde = await kaynak.blob();
      const yaz = await fetch(imza.yukle, { method: "PUT", body: govde, headers: { "content-type": imza.tur } });
      if (!yaz.ok) throw new Error(`Dosya yeni depoya yazılamadı (${dosya.yol}, kod ${yaz.status}).`);
      biten += dosya.bayt;
      onIlerleme?.({ toplam, biten, dosya: dosya.yol.split("/").pop() ?? dosya.yol });
    }
    d = await api<GocDurum>("/api/depo/goc");
  }

  const sonuc = await api<{ tasinanDosya: number }>("/api/depo/goc", { method: "POST", json: { islem: "bitir" } });
  return sonuc;
}

/** Tasima sirasinda dusen hatayi aileye anlasilir cumleye cevirir. */
export function tasimaHatasiMetni(e: unknown): string {
  // Tarayici CORS'ta engellenirse fetch TypeError firlatir ve hicbir ayrinti
  // vermez; en olasi sebep bucket kuralinin yazilamamis olmasi.
  if (e instanceof TypeError) {
    return "Yeni depo tarayıcıdan gelen isteği reddetti. Sebebi büyük ihtimalle anahtarın depo ayarlarını değiştirme yetkisinin olmaması: anahtarı silip Access Type: Read and Write ile yeniden üretin, sonra buraya geri dönün. Taşınanlar kaybolmaz.";
  }
  const m = e instanceof Error ? e.message : "Taşıma yarıda kaldı.";
  return `${m} Hiçbir şey kaybolmadı; tekrar başlatırsanız kaldığı yerden devam eder.`;
}
