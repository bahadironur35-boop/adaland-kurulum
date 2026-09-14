import { ilgi, yonelme, belirtme, bulunma } from "../src/lib/turkce";

// [ad, ilgi, yonelme, belirtme]
const beklenen: [string, string, string, string][] = [
  ["Ada",     "Ada'nın",     "Ada'ya",     "Ada'yı"],
  ["Zeynep",  "Zeynep'in",   "Zeynep'e",   "Zeynep'i"],
  ["Ömer",    "Ömer'in",     "Ömer'e",     "Ömer'i"],
  ["Poyraz",  "Poyraz'ın",   "Poyraz'a",   "Poyraz'ı"],
  ["Elif",    "Elif'in",     "Elif'e",     "Elif'i"],
  ["Su",      "Su'nun",      "Su'ya",      "Su'yu"],
  ["Deniz",   "Deniz'in",    "Deniz'e",    "Deniz'i"],
  ["Ayşe",    "Ayşe'nin",    "Ayşe'ye",    "Ayşe'yi"],
  ["Mustafa", "Mustafa'nın", "Mustafa'ya", "Mustafa'yı"],
  ["Göktürk", "Göktürk'ün",  "Göktürk'e",  "Göktürk'ü"],
  ["Ufuk",    "Ufuk'un",     "Ufuk'a",     "Ufuk'u"],
  ["Yağmur",  "Yağmur'un",   "Yağmur'a",   "Yağmur'u"],
  ["Ali",     "Ali'nin",     "Ali'ye",     "Ali'yi"],
  ["İnci",    "İnci'nin",    "İnci'ye",    "İnci'yi"],
  ["Kuzey",   "Kuzey'in",    "Kuzey'e",    "Kuzey'i"],
];
const bulunmaBeklenen: [string, string][] = [
  ["Adaland", "Adaland'da"], ["Kitap", "Kitap'ta"], ["Poyraz", "Poyraz'da"],
  ["Ufuk", "Ufuk'ta"], ["Deniz", "Deniz'de"], ["Göktürk", "Göktürk'te"],
];

let hata = 0;
const kontrol = (etiket: string, alinan: string, umulan: string) => {
  if (alinan !== umulan) { hata++; console.log(`  ✗ ${etiket}: "${alinan}" olmali "${umulan}"`); }
};
for (const [ad, i, y, b] of beklenen) {
  kontrol(ad + " ilgi", ilgi(ad), i);
  kontrol(ad + " yonelme", yonelme(ad), y);
  kontrol(ad + " belirtme", belirtme(ad), b);
}
for (const [ad, b] of bulunmaBeklenen) kontrol(ad + " bulunma", bulunma(ad), b);

const toplam = beklenen.length * 3 + bulunmaBeklenen.length;
console.log(hata === 0 ? `HEPSI GECTI (${toplam} durum)` : `${hata}/${toplam} BASARISIZ`);
process.exit(hata === 0 ? 0 : 1);
