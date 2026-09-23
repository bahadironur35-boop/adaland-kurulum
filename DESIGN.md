# Adaland — Tasarım Dili

Bir çocuğun sözlerini ve anılarını saklayan aile-içi bir portal. Tasarımın işi iki şey:
telefonda **10 saniyede söz kaydetmek** ve yıllar sonra **sıcak bir çocukluk defteri gibi okunmak**.

## His

Çocuk odası duvarına yapıştırılmış kağıtlar. Zemin ince noktalı bir duvar kağıdı, kartlar beyaz
kağıt, hafif eğik (`.tilt-l` / `.tilt-r`, ±1°), altlarında kalın kağıt gölgesi.

Varsayılan duvar **gökyüzü** (açık mavi). Ayarlar → Görünüm'den **Toz pembe**, **Lavanta** ya da
**Gece** seçilir (`data-theme`, tercih cihazda `localStorage`'da). Paletler yalnızca duvarı değiştirir
(`sky`, `sky-deep`, `dot`, `line`); kağıt, mürekkep ve boya kalemi renkleri sabit kalır. Gece modu
lacivert gökyüzü (#141c3a), koyu mavi kağıt, açık mürekkep ve zeminde seyrek yıldızlardır; yaş
çıkartmasının metni her temada koyu lacivert kalır.

## İmza: Konuşma balonu + yaş çıkartması

Çocuğun her sözü bir **konuşma balonu** (`.bubble`, sol altta kuyruk) içinde, el yazısı fontuyla.
Balonun sağ üst köşesine yapıştırılmış **yaş çıkartması** (`.sticker`, güneş sarısı, -6° dönük):
"2 yaş 4 aylık". Bu ikisi Adaland'ı hatırlatan şeydir; başka yerde tekrar edilmez.

Diğer içerikler aynı ailenin üyeleri: fotoğraf ve video **polaroid** (`.polaroid`, altında el yazısı
not, çıkartma sol üstte üzüm tonunda), ilkler **yıldızlı zaman çizelgesi**, sesler **mikrofonlu kart**
(üzüm), mektuplar **zarf** (mühürlüyken kilitli ve üzüm zemin, açılınca beyaz kağıt).

## Renkler (boya kalemi kutusu)

| Token | Hex | Kullanım |
|---|---|---|
| `sky` | #eaf3fa (gökyüzü) · #fbeef0 (pembe) · #f2effb (lavanta) · #141c3a (gece) | zemin |
| `sky-deep` | #d5e6f4 · #f3d9de · #e2dbf5 · #1f2a52 | görsel yer tutucu, hover |
| `dot` | #c9dcec · #e9cdd4 · #d6ccef | duvar kağıdı noktaları |
| `paper` | #ffffff (gecede #1e2848) | kartlar |
| `ink` / `ink-soft` / `ink-faint` | #23305a / #5b6584 / #8e97b3 | metin kademeleri |
| `line` | #d8e2ee · #ead3d9 · #e0d8f2 | çizgiler, kağıt gölgesinin alt kenarı |
| `crayon` (+ `-soft`) | #f0565e | birincil buton, favori kalbi, hata |
| `sun` (+ `-soft`) | #ffc531 | yaş çıkartması, ilk yıldızı, uyarı |
| `grass` (+ `-soft`) | #5db86a | başarı, aktif paylaşım linki |
| `grape` (+ `-soft`) | #7b5fd8 | odak halkası, fotoğraf/ses/mektup |

Renk bilgi taşır: kırmızı = yap/sev, sarı = yaş ve dikkat, üzüm = medya ve mektup, yeşil = oldu.

## Yazı

- **Başlık:** Baloo 2 (`font-display`) — tombul, yuvarlak. Butonlar da bu fontta.
- **Gövde:** Nunito (`font-body`).
- **El yazısı:** Patrick Hand (`font-hand`) — SADECE çocuğun sözleri, notlar, mektup metni ve küçük
  "defter kenarı" cümleleri için. Arayüz metni asla el yazısı olmaz.

## Bileşen sınıfları (globals.css, `@layer components`)

`.bubble`, `.sticker` (`-grape`, `-grass`), `.polaroid`, `.btn` (`-primary`, `-soft`, `-ghost`),
`.field`, `.label`, `.dots` (spinner yerine zıplayan noktalar), `.confetti-piece`, `.sheet-enter`.
Hepsi `@layer components` içinde; Tailwind utility'leri (`h-9 w-9 p-0` gibi) bunları ezebilsin diye.

Yazdırma için `@media print`: `.print:hidden` menüleri gizler, `.book-page` sayfa kırar,
`.book-avoid` kartı bölmez, eğiklik ve gölgeler kalkar, kağıt A5 olur.

## Mikro-anlar

- Kayıt başarılı → 28 parça kısa konfeti (`confetti()`, `src/lib/client.ts`).
- Boş durumlar yönlendirir, üzülmez: "Henüz söz yok — dinlemeye devam."
- Yükleme: zıplayan üç nokta; dosya yüklemede yüzde.
- `prefers-reduced-motion` tüm animasyonları kapatır.

## Kurallar

- Dokunma hedefleri ≥ 44px (ikon butonları 36–44px, alt çubuk 56px).
- Modal/sheet **her zaman `createPortal(document.body)`** — eğik kartlar `transform` taşıdığı için
  içlerinde `fixed` konumlama bozulur.
- Butonlar ne yaptığını söyler: "Sözü sakla", "Fotoğraf ekle", "Mühürle". "Gönder" yok.
- Sayı ve tarih Türkçe: "5 Eylül 2026", "3 yaş 9 aylık". Tarih metinleri sabit `Europe/Istanbul`
  saat diliminde biçimlenir, yoksa sunucu ve tarayıcı farklı yazar (hydration hatası).
- Çocuğun verisi dışarı çıkmaz: yapay zekâ ile otomatik etiketleme, yüz tanıma, dış servise metin
  gönderme bilerek yok. Akraba linkinin önizleme görseli çocuğun fotoğrafı değil, uygulama logosudur.
