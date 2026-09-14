# Adaland

Bir çocuğun sözleri, fotoğrafları ve anıları için aile-içi portal. Herkese kapalı:
aile e-posta+şifre (ya da Face ID) ile girer, akrabalara Ayarlar'dan üretilen süreli salt-okunur
link (`/p/[token]`) verilir.

**Tek kurulum değil, dağıtılabilir.** Çocuğun ve sayfanın adı veritabanında (`Settings`),
gizli anahtarlar ilk çalıştırmada üretilip veritabanında saklanıyor. Her aile kendi Vercel
hesabına kurar; kuran kişinin veriye erişimi olmaz. Aileye giden belge: **[KURULUM.md](KURULUM.md)**.

## Stack

Next.js 16 (App Router) · Prisma 7 + Neon Postgres · Vercel Blob (private store, imzalı URL) · Vercel

## Sıfır ortam değişkeni

Deploy Button ile kurulan bir uygulamanın **hiçbir** env değişkenine ihtiyacı yok:

| Değişken | Nereden |
|---|---|
| `DATABASE_URL` (+ `POSTGRES_URL*` çeşitleri) | Neon entegrasyonu enjekte eder |
| `BLOB_STORE_ID`, `VERCEL_OIDC_TOKEN`, `BLOB_READ_WRITE_TOKEN` | Blob store bağlanınca Vercel enjekte eder |
| `SESSION_SECRET`, `VAPID_*` | **Yok.** İlk çağrıda üretilip `AppSecret` tablosuna yazılır (`src/lib/secrets.ts`) |
| `CRON_SECRET` | İsteğe bağlı. Varsa cron `Bearer` ister; yoksa uç durum-korumalı çalışır |
| `MEDIA_BACKEND` | İsteğe bağlı **acil geri dönüş kolu**. `harici` yazılırsa kayıtlı harici depoya döner. Normalde bu değer ortamda değil `AppSecret`'ta durur |
| `R2_*` (dört değişken) | **Yok.** Yalnızca env ile kurulmuş eski kurulumlar için yedek; veritabanındaki anahtar varsa o kazanır |
| `DATABASE_SCHEMA` | Yalnızca test. Ayrı bir Postgres şemasına bağlanır (boş-kurulum denemesi) |

Geçiş kuralı: aynı adlı env **varsa o kazanır** ve değeri DB'ye kopyalanır. Bu yüzden
env'i sonradan silmek kimseyi çıkış yaptırmaz.

## Geliştirme

```bash
npx vercel env pull .env.local   # DATABASE_URL vb.
npm install                       # postinstall: prisma generate
npm run db:migrate                # prisma migrate dev
# ilk hesaplar /kurulum sihirbazından açılır (Parent tablosu boşken)
npm run dev

npm run test:turkce                 # ek uyumu (51 durum)
npm run sifre:sifirla -- <e-posta>  # SON ÇARE: kimse giremiyorsa şifreyi sıfırlar
npm run ayna                        # public ayna repoyu güncelle (Deploy Button kaynağı)
```

**Boş kurulumu denemek** (canlı veriye dokunmadan, aynı Neon projesinde ayrı şema):

```bash
psql "$DATABASE_URL" -c 'CREATE SCHEMA kurulumtest'
DATABASE_URL="$DATABASE_URL?schema=kurulumtest" npx prisma migrate deploy
echo 'DATABASE_SCHEMA=kurulumtest' > .env.development.local && npm run dev
# bitince: rm .env.development.local && psql ... -c 'DROP SCHEMA kurulumtest CASCADE'
```

`?schema=` şart; `search_path` ile Prisma "migration persistence is not initialized" der.

İki tuzak:

- **Blob store yalnızca Production'a bağlı.** Yerelde medya adresleri boş döner (sayfa çökmez,
  görseller boş çıkar). Medya testleri canlıda, geçici bir test hesabıyla yapılır.
- **`prisma migrate` sonrası dev sunucusunu yeniden başlat.** Aksi halde eski Prisma client bellekte
  kalır ve yeni tablolar `findMany of undefined` hatası verir.

## Deploy

```bash
npx vercel whoami                 # hesabı doğrula
npx vercel --prod
```

Migration'lar canlıya `npm run db:deploy` ile (DATABASE_URL production ortamından).
Git → Vercel otomatik deploy bilerek kullanılmıyor; her zaman CLI.

## Sayfalar (`src/app/(app)`, hepsi oturum kapısının arkasında)

| Yol | Ne |
|---|---|
| `/` | Akış: her tür tarih sırasıyla, "bu günlerde geçen yıllarda", yaş ve doğum günü geri sayımı, bakım şeritleri |
| `/sozler` | Konuşma balonları, arama, favori, ses kaydı |
| `/fotograflar` `/videolar` | Polaroid ızgara, tam ekran görüntüleyici, tarayıcıda küçültme ve kapak karesi |
| `/sesler` | Sözden bağımsız kayıtlar: şarkı, masal, kahkaha |
| `/ilkler` `/buyume` | Zaman çizelgesi; boy/kilo grafikleri (recharts) |
| `/mektuplar` | Çocuğa mühürlü mektuplar; `openAt` gününe kadar yalnızca yazarı okur |
| `/kitap` `/kitap/[yas]` | Yaş kitabı (doğum gününden doğum gününe), yazdır → PDF (A5) |
| `/favoriler` `/ara` | Kalpli içerikler; sözler, ilkler ve notlarda arama |
| `/cop` | Çöp kutusu: silinenler 30 gün burada, geri alınabilir |
| `/paylas-al` | Android "Paylaş → Adaland" ile gelen dosyalar |
| `/ayarlar` | Aile hesapları, paylaşım linkleri, doğum günü, şifre, passkey, hatırlatma, görünüm, yedek, depolama |
| `/p/[token]` | Akraba görünümü: giriş yok, salt-okunur, tür filtreleri |

## Mimarinin kilit yerleri

- `src/lib/auth.ts` — bcrypt + 90 günlük imzalı cookie; `requireParent()` her yazma ucunda.
  `Parent.sessionsValidFrom` bu andan önce verilen çerezleri geçersiz kılar; şifre sıfırlanınca
  şimdiye çekilir, böylece kayıp telefondaki 90 günlük oturum anında kapanır. JWT'nin `iat`'i saniye
  hassasiyetinde olduğu için eşik de saniyeye yuvarlanır — yoksa sıfırladıktan hemen sonra giren de elenirdi.
- **Şifre kurtarma, e-postasız (üç katman).** Adaland'da posta altyapısı yok, bilerek:
  1. *Aile içi* — giriş yapabilen bir üye, Ayarlar › Aile hesapları'ndan diğerine geçici şifre üretir
     (`api/aile/sifirla` + `FamilyAccounts.tsx`). Şifre yalnızca cevapta bir kez döner, saklanmaz.
     Yeni yetki açmaz: üyeler zaten tam yetkili.
  1b. *Zorunlu belirleme* — geçici şifreyle giren, `Parent.mustChangePassword` yüzünden hiçbir sayfayı
     açamaz ve hiçbir yazma ucunu çağıramaz; `/sifre-belirle` ekranında kendi şifresini kurar.
     Bayrağı seed, CLI sıfırlama ve aile içi sıfırlama açar; şifre belirlenince kapanır.
     `api/auth/sifre-belirle` mevcut şifre sormaz (kullanıcı az önce girdi) ama YALNIZCA bayrak
     açıkken çalışır, yani normal değiştirmenin mevcut-şifre kontrolünü atlatmaya yaramaz.
  2. *Passkey* — Face ID / parmak izi kuran şifreye hiç ihtiyaç duymaz.
  3. *CLI* — herkes dışarıda kaldıysa `npm run sifre:sifirla`. `src/lib/password.ts` iki yolda da
     aynı okunabilir alfabeyi kullanır (0/O, 1/l/I yok).
  Giriş sayfasındaki "Şifreni mi unuttun?" (`ForgotPassword.tsx`) bu üç yolu anlatır.
- `src/lib/media.ts` — depo **cephesi**; arkada `storage/blob.ts` (Vercel Blob, kurulumun
  varsayılanı) ve `storage/harici.ts` (S3 uyumlu harici depo). DB'de tam URL değil **yol** saklanır
  (`Photo.path` vb.), bu yüzden depo değişince veri taşınmaz, yalnızca dosyalar kopyalanır.
- **Vercel Blob YENİ kurulumlarda hiç kullanılmıyor.** Deploy Button `stores`'unda Blob YOK
  (bkz. `scripts/ayna.ts`, `cocugun-sozleri/api/kod.js`) — aile Vercel panelinde kullanılmayan
  bir kaynak görmesin diye. Kurulum sihirbazının 3. adımı **zorunludur** (atlanamaz, `requireParent()`
  gerektiği için Hesaplar'dan sonra gelir): aile kendi 10 GB'lik deposunu bağlamadan kuruluma
  devam edemez — hiçbir panele girmeden, uygulamanın içinden.
  - `storage/blob.ts` koddan SİLİNMEDİ: Onur'un kendi kurulumu (adaland) hâlâ Blob'da ve
    BİLİNÇLİ olarak taşınmadı (2026-09-14 kararı). `media.ts` iki backend'i de destekler;
    yalnızca YENİ kurulumların varsayılanı değişti. Env ile önceden R2/B2 bağlanmış eski
    kurulumlar da `envAnahtari()` yedeğiyle çalışmaya devam eder.
  - İki sağlayıcı **eşit sunulur, biri önerilmez**: `DepoBagla.tsx` bilerek "kart istemiyor" ile
    "büyük ve mali olarak sağlam" arasında seçim yaptırır, sıralama yapmaz. **Backblaze B2**:
    10 GB ücretsiz, kayıtta kredi kartı istemiyor, ama küçük ve henüz kâr etmeyen bir şirket.
    **Cloudflare R2**: aynı 10 GB, çok daha büyük bir şirket, ama ücretsiz katmanda bile kart
    zorunlu. İkisi de aynı S3 API'sini konuştuğu için tek modül; fark yalnızca endpoint ve bölge
    (`r2` → `auto`, B2 bölgeyi imzada arar). Ayarlar'daki `DepoYukseltme.tsx`, aynı ekranı
    Onur'un Blob'dan geçiş yapması için hâlâ kullanır — sihirbazdaki mecburi baglama ile
    Ayarlar'daki isteğe bağlı yükseltme, `DepoBagla.tsx` bileşenini paylaşır.
  - Kurulum sihirbazındaki adım **bağlanınca otomatik aktif olur** (`depo-tasi.ts` →
    `depoyaTasiVeAktifEt`): o anda taşınacak dosya olmadığı için (henüz `Parent` yok) döngü
    boş döner, aile hiçbir bekleme görmez. Aynı yardımcı Ayarlar'daki göçte de kullanılır —
    orada gerçek dosyalar taşındığı için ilerleme çubuğu döner. Tek kod yolu, iki bağlam.
  - Anahtarlar `AppSecret`'ta (`storage/ayar.ts`). **Öncelik: önce veritabanı, sonra env.** Tersi
    sessiz bir tuzaktı; `npm run test:depo` bunu çalıştırarak doğrular (ayrı şema ister).
  - **CORS'u uygulama kendisi yazar** (`corsAyarla`, `PutBucketCors`). Aileden JSON kural
    yapıştırması istenmiyor; atlanırsa hata "tarayıcı isteği reddetti" diye anlaşılmaz geliyor.
    `AllowedOrigins: "*"` bilerek: erişimi köken değil imza belirliyor, köken sabitlenirse aile
    kendi alan adını bağladığında yüklemeler sessizce bozulurdu.
  - **Göçü tarayıcı yapar** (`/api/depo/goc`): imzalı adresle indirip imzalı adresle yükler.
    Sunucudan geçirmek tek bir büyük videoda fonksiyon süresini aşardı. Kesilebilir; kalanlar her
    çağrıda yeniden hesaplanır ve **boyut eşitliğine** bakılır (yarım yükleme "geçti" sayılmasın).
    Depo değişimi (`aktifDepoYaz`) **en sonda**, her dosya karşıya geçtikten sonra.
  - Blob'da `issueSignedToken()` bir **ağ çağrısıdır**, `presignUrl()` yerel HMAC. GET delegasyonu
    store geneli ve önbellekli; PUT delegasyonu dosyaya özel ve **önbelleklenmez** (yoksa dosya
    başına tür/boyut kısıtı kaybolur).
  - Tür ve boyut sınırı imzanın içinde: depo kendisi reddeder (harici depoda bu gömülmez,
    sunucu kontrolüne güvenilir).
  - Tek PUT tavanı ölçüldü: 300 MB geçti, 600 MB 413 verdi. Üstü `@vercel/blob/client` ile parçalı
    (`/api/upload/multipart`). `src/lib/upload.ts` imzası sabit, 7 çağrı yeri bu ayrımı görmez.
  - **İki ayrı video sınırı**: `MAX_VIDEO_BYTES` (512 MB) depoya yazılan dosya, `MAX_VIDEO_SOURCE_BYTES`
    (4 GB) tarayıcının sıkıştırmak için kabul ettiği kaynak. Karıştırılırsa sıkıştırmanın amacı kalmaz.
  - `src/lib/media-client.ts` fotoğraf/video işleme; hem yükleyiciler hem paylaş akışı bunu kullanır.
- `src/lib/share.ts` — akraba linki: 24 bayt token, süre/iptal/görüntülenme; geçersizse sebep söylenmez.
- `src/lib/webauthn.ts` + `api/passkey/*` — Face ID / parmak izi (@simplewebauthn); challenge imzalı
  cookie'de taşınır, rpID istek host'undan türetilir.
- `src/lib/push.ts` + `api/cron/hatirlatma` — günlük Vercel cron (`vercel.json`). İki kural:
  21 gün sessizlik → "<ad> ne dedi?"; doğum günü sonrası → yaş kitabı + yıllık yedek
  (`Parent.careReminders` açık olanlara). Cron kimlik doğrulaması **ikili**: `CRON_SECRET` varsa
  `Bearer` zorunlu, yoksa durum-korumalı (erken çağrı erken silmez, 30 günlük kapılar spam'i keser).
  Cevap gövdesi opak `{ok:true}` — `quietDays` kimliksiz çağırana aile alışkanlığını sızdırıyordu.
  `x-vercel-cron-schedule` kimlik doğrulama DEĞİLDİR (taklit edilemezliği belgelenmemiş).
- `src/lib/bakim.ts` — tembel bakım: çöp temizliği cron'a ek olarak `(app)` layout'ta `after()` ile,
  günde bir kez (koşullu `updateMany`, uygulama tarafında kilit yok). Cron bir ailede bozulsa da
  çöp birikmesin diye. **Demo modunda** aynı kapı günlük sıfırlamayı da çalıştırır (aşağı bak).
- **Demo modu** — yalnızca `DEMO=1` ortam değişkeni varsa; ailelerin kurulumunda bu değişken YOKTUR,
  yani hiçbir şey değişmez ve `/demo` 404 döner.
  - `src/proxy.ts` (Next 16'da middleware'in yeni adı) `/api/*` yazma isteklerini **allowlist** ile
    süzer: `src/lib/demo.ts` → `DEMO_YAZILABILIR` (söz/ilk/ölçüm/mektup POST+PATCH ve logout).
    Varsayılan KAPALI, yani sonradan eklenen bir uç demoda otomatik engelli doğar.
  - `GET /demo?ad=…` ziyaretçinin yazdığı adı **çereze** yazar (`adaland_demo_ad`), demo ebeveyni
    olarak oturum açar. `getBrand()` demoda bu çerezi okuyup DB'deki adı ezer → her ziyaretçi KENDİ
    adını görür, içerik ortaktır.
  - **Adsız gelen** (karekod, doğrudan adres) `/demo/basla` ekranına düşer ve önce adı yazar; yoksa
    uydurma ailenin adıyla karşılaşır ve kişiselleştirme tam orada kaybolur. Çerezi olan ya da
    `?atla=1` diyen bu ekranı hiç görmez. Ekran istemci betiği içermez: düz GET formu.
  - Metin içeriği her gece 03:00'te sıfırlanır: `src/lib/demo-icerik.ts` (`demoIcerigiSifirla`,
    `sonSifirlamaSiniri`). Kapı `lastHousekeepingAt < son 03:00` → günün ilk ziyaretçisinde çalışır,
    yani kimse gezerken içerik ayağının altından çekilmez. Fotoğraflara dokunulmaz (demoda yükleme
    kapalı olduğu için bozulamazlar). `scripts/demo-doldur.ts` de aynı dosyadan okur.
- **Kendi kendine güncelleme** — `.github/workflows/guncelle.yml` (haftalık) → `scripts/guncelle.mjs`.
  Ayna repodan `fetch` + `read-tree -u --reset FETCH_HEAD` ile **üzerine yazar** (ayna tek commit'lik
  force-push olduğu için merge her seferinde çatışırdı); ailenin kendi geçmişi korunur.
  Üç incelik: (1) `.github/workflows` altı güncellenmez — GitHub'ın varsayılan token'ı iş akışı
  dosyası değiştiren push'u reddeder, bu yüzden iş akışı ince bir kabuk, mantık betikte.
  (2) Değişiklik tespiti ağaç karşılaştırmasıyla değil, birleştirme sonrası `git status` ile yapılır.
  (3) 40 günden uzun sessizlikte boş commit atılır, yoksa GitHub 60 gün hareketsiz depoda
  zamanlanmış iş akışını kapatır.
- `src/lib/brand.ts` / `brand-client.tsx` / `turkce.ts` — çocuk ve site adı `Settings`'ten.
  `getBrandSafe()` **asla fırlatmaz** (metadata ve manifest onu kullanır; ilk build'de DB boş olabilir,
  fırlatırsa build çöker). `turkce.ts` ek uyumu: düz birleştirme "Zeynep'nın" üretir.
  **İç anahtarlar bilerek `adaland_*` kaldı** (`adaland_session`, `adaland-theme`, `adaland-share`…):
  bunlar marka değil ad alanı; yeniden adlandırmak mevcut kurulumlarda zorunlu çıkış demek.
- `src/lib/kurulum.ts` + `app/kurulum` — ilk çalıştırma sihirbazı. Kilit `parent.count() === 0`;
  `POST /api/kurulum` transaction içinde tekrar sayar (eşzamanlı ikinci istek 409). Tek hesapla
  kalınırsa tek kullanımlık **kurtarma kodu** üretir (`AppSecret.KURTARMA_KODU`, bcrypt,
  `normalizeCode()` iki tarafta; `POST /api/auth/kurtar` kullanınca siler).
- `src/lib/trash.ts` — çöp kutusu. **Silme asla kalıcı değil:** `deletedAt` doldurulur, dosyalar depoda kalır.
  Kalıcı silme yalnızca çöp kutusundaki kayıtlara uygulanabilir, canlı içeriğe dokunamaz. Cron 30 günü dolanı temizler.
- `src/lib/care.ts` — yaş yılı aralıkları ve bakım durumu; `CareBanner` akışta gösterir, yedek indirilince
  ve kitap kaydedilince kendiliğinden kaybolur.
- `public/sw.js` — service worker: Android paylaşımını yakalar, push bildirimi gösterir.
  **Sayfa önbelleği yok**, böylece eski sürüm takılı kalmaz.
- `src/app/api/yedek` — JSON yedek (tüm tablolar); `api/yedek/medya?yil=&tur=photos|audio|videos`
  takvim yılı bazında ZIP (archiver, akış hâlinde).

## Belgeler

- `DESIGN.md` — tasarım dili, renkler, bileşen sınıfları, kurallar.
