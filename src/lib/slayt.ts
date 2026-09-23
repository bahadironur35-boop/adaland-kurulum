import type { PhotoDTO, SayingDTO } from "./types";

export type SlaytKare = { kind: "photo"; photo: PhotoDTO } | { kind: "saying"; saying: SayingDTO };

/**
 * Slayt gosterisi icin fotograf+soz dizisi.
 *
 * NEDEN SADECE FOTOGRAF DEGIL: Akis sayfasi zaten sozleri, fotograflari, ilkleri
 * kronolojik karistiriyor — uygulamanin butun kimligi "sadece galeri" degil, bir
 * ani defteri. Yalin fotograf slayti bu ruhla uyusmazdi, ustelik cok az fotografi
 * olan bir ailede (esasi 1-2 fotograf) slayt saniyeler icinde biterdi.
 *
 * OMURGA FOTOGRAFLAR (eskiden yeniye — "kucukten buyudu" hissi), ARALARA SOZLER
 * serpistiriliyor. Bosluk sayisi = fotograf sayisi - 1 (+ sonda bir tane daha):
 * yani "arada" kelimesi ciddiye alinip, kac soz oldugu slaytin ritmini bozmuyor.
 * Once favori sozler kullanilir (en degerli anilar), tukenirse geri kalanlar
 * kronolojik sirayla, hicbiri tekrar edilmeden.
 *
 * Fotograf yoksa: tum sozler kendi basina bir slayt olur (yine de anlamli).
 * Soz yoksa: yalniz fotograflar, arada bosluk yok.
 */
export function slaytDizisiOlustur(fotograflarYeniden: PhotoDTO[], sozlerYeniden: SayingDTO[]): SlaytKare[] {
  // Sorgular yeniden-eskiye donuyor; slayt icin eskiden-yeniye ceviriyoruz.
  const fotograflar = [...fotograflarYeniden].reverse();
  const sozler = [...sozlerYeniden].reverse();

  if (fotograflar.length === 0) {
    return sozler.map((saying) => ({ kind: "saying", saying }));
  }
  if (sozler.length === 0) {
    return fotograflar.map((photo) => ({ kind: "photo", photo }));
  }

  // Favoriler once, sonra geri kalanlar — ikisi de kendi kronolojik sirasinda.
  const favoriler = sozler.filter((s) => s.isFavorite);
  const digerleri = sozler.filter((s) => !s.isFavorite);
  const siraliSozler = [...favoriler, ...digerleri];

  const bosluklar = fotograflar.length; // n foto -> n bosluk (n-1 arada + 1 sonda)
  const kullanilacakSoz = siraliSozler.slice(0, bosluklar);

  const kareler: SlaytKare[] = [];
  fotograflar.forEach((photo, i) => {
    kareler.push({ kind: "photo", photo });
    if (kullanilacakSoz[i]) kareler.push({ kind: "saying", saying: kullanilacakSoz[i] });
  });
  return kareler;
}
