# Çocuğunuzun sözleri, sizin hesabınızda

Bir çocuğun komik sözlerini, fotoğraflarını, videolarını ve ilklerini biriktiren
küçük bir aile portalı. Herkese kapalı. Akrabalara süreli, iptal edilebilir link
verilir.

Farkı şu: **bu bir servis değil.** Kur düğmesine bastığınızda uygulama sizin
kendi hesabınıza kurulur. Veritabanı sizin, dosyalar sizin, anahtarlar sizde.
Yazılımı yazanın hiçbir erişimi olmaz, bir gün ortadan kaybolsa uygulamanız
çalışmaya devam eder.

[![Vercel ile kur](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fbahadironur35-boop%2Fadaland-kurulum&project-name=cocugumun-sayfasi&repository-name=cocugumun-sayfasi&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%7D%5D)

Kurulum yaklaşık 15 dakika sürer ve terminal gerektirmez.
Adım adım anlatım: **[KURULUM.md](KURULUM.md)**

## Neler var

- **Sözler** — tarihiyle, isterseniz ses kaydıyla. Her sözün üstünde "3 yaş 5 aylık" rozeti.
- **Fotoğraf ve video** — telefondan doğrudan; videolar tarayıcıda 720p'ye küçültülür.
- **İlkler** — ilk adım, ilk diş, ilk okul günü; zaman çizelgesi.
- **Boy ve kilo** — basit grafik.
- **Mühürlü mektuplar** — seçtiğiniz tarihe kadar kimse okuyamaz.
- **Yaş kitabı** — bir yaş yılının sözleri ve fotoğrafları, yazdırılabilir.
- **Akraba linki** — süreli, iptal edilebilir; önizlemede çocuğun fotoğrafı görünmez.
- **Çöp kutusu** — silinen 30 gün bekler.
- **Yedek** — her şey JSON + ZIP olarak iner. Kimseye bağımlı değilsiniz.

## Mahremiyet

- Sayfa arama motorlarına kapalı; dosya adresleri bir saat geçerli imzalı adreslerdir.
- **Hiçbir yapay zeka özelliği yok.** Otomatik etiketleme, yüz tanıma, dışarıya metin
  gönderme bilerek eklenmedi.
- Veritabanı ve dosyalar Avrupa bölgesinde, sizin hesabınızda.

## Güncellemeler

Sayfa kendi kendini günceller. Haftada bir, yeni bir sürüm çıkmışsa kendi
kopyanıza alınır ve yayına girer — sizin bir şey yapmanız gerekmez. Yazdığınız
sözler, fotoğraflar ve ayarlar bundan etkilenmez; onlar kodun içinde değil,
sizin kendi veritabanınızda durur.

Kapatmak isterseniz: GitHub'da deponuza girin, **Actions** sekmesinden
**Güncelleme** iş akışını seçin, sağ üstteki menüden **Disable workflow** deyin.

## Maliyet

Ücretsiz katmanda kalır: 5 GB dosya alanı ve küçük bir veritabanı. Uygulama
doluluğu gösterir ve sınıra yaklaşınca uyarır.

## Teknik

Next.js 16 · Prisma + Postgres (Neon) · Vercel Blob (private) · Vercel.
Hiçbir ortam değişkeni elle girilmez: veritabanı ve depolama kurulumda otomatik
bağlanır, oturum ve bildirim anahtarları ilk çalıştırmada üretilir.

## Kullanım koşulu

Kendi ailenize kurup kullanmanız ücretsiz ve süresizdir; kodu kendi
kurulumunuz için değiştirebilirsiniz. Yazılımı satmak, ücretli bir hizmetin
parçası olarak başkalarına kurmak ya da yeniden markalayıp yayımlamak yazılı
izne bağlıdır. Ayrıntı: [LICENSE](LICENSE)

Geliştirici notları: [README-GELISTIRME.md](README-GELISTIRME.md)
