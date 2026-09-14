/**
 * Aile kurulumunu guncel tutar. Ailenin KENDI deposunda, GitHub Actions icinde
 * haftada bir calisir (.github/workflows/guncelle.yml).
 *
 * NEDEN GEREKLI: Deploy Button kurulumda kodun bir KOPYASINI ailenin hesabina
 * yaziyor. O kopya kendiliginden guncellenmez; bu betik olmazsa kurulum
 * sonsuza kadar ilk gunku surumde donar.
 *
 * NEDEN BIRLESTIRME DEGIL UZERINE YAZMA: ust kaynak (ayna repo) her yayinda TEK
 * commit olarak zorla itiliyor, yani ortak gecmis yok; `merge` her seferinde
 * catisirdi. Aileler kodu duzenlemedigi icin agaci ust kaynakla ayni yapmak
 * guvenli — ailenin kendi commit gecmisi de korunuyor, zorla itme yok.
 *
 * IS AKISI DOSYALARINA DOKUNULMAZ: GitHub'in varsayilan izni, .github/workflows
 * altini degistiren bir push'u reddediyor. O yuzden ust kaynaktan gelen surumu
 * alip ailenin kendi kopyasini geri koyuyoruz; butun mantik zaten bu dosyada.
 *
 * VERIYE DOKUNULMAZ: veri kodun icinde degil, ailenin kendi veritabani ile dosya
 * deposunda. Sema degisiklikleri yayina alinirken `prisma migrate deploy` ile
 * kendiliginden uygulanir.
 *
 * GUVENLIK AGI: derleme basarisiz olursa Vercel ESKI surumu yayinda tutar, yani
 * bozuk bir guncelleme ailenin sayfasini karartmaz.
 */
import { execFileSync } from "node:child_process";

const UST = process.env.UST_KAYNAK ?? "https://github.com/bahadironur35-boop/adaland-kurulum.git";
/** GitHub, bu kadar gun hic hareket gormeyen depoda zamanlanmis is akislarini kapatiyor. */
const CANLI_TUT_GUN = 40;

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

const commitle = (...args) =>
  git("-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com",
      "-c", "user.name=github-actions[bot]", "commit", "--quiet", ...args);

function main() {
  // Uzak tanimlamadan dogrudan cek: is tekrar calissa da "remote zaten var"
  // diye patlamasin, calisma alani temiz kalsin.
  git("fetch", "--quiet", UST, "main");

  // Calisma agacini ve indeksi ust kaynakla ayni yap (HEAD yerinde kalir),
  // sonra is akisi dosyalarini ailenin kendi surumune geri dondur.
  git("read-tree", "-u", "--reset", "FETCH_HEAD");
  try { git("checkout", "HEAD", "--", ".github/workflows"); } catch { /* ust kaynakta yoksa sorun degil */ }
  git("add", "-A");

  if (!git("status", "--porcelain")) {
    // Guncel. Depo uzun suredir sessizse GitHub zamanlayiciyi kapatmasin diye
    // bos bir commit atiyoruz; bu olmazsa guncelleme bir gun sessizce durur.
    const gun = (Date.now() / 1000 - Number(git("log", "-1", "--format=%ct"))) / 86400;
    if (gun > CANLI_TUT_GUN) {
      commitle("--allow-empty", "-m", "Kontrol edildi (değişiklik yok)");
      git("push", "--quiet", "origin", "HEAD:main");
      console.log("Güncel; zamanlayıcı canlı kalsın diye boş kontrol commit'i atıldı.");
      return;
    }
    console.log("Zaten güncel, yapılacak bir şey yok.");
    return;
  }

  const ustSha = git("rev-parse", "--short", "FETCH_HEAD");
  commitle("-m", `Güncelleme (üst kaynak ${ustSha})`);
  git("push", "--quiet", "origin", "HEAD:main");
  console.log(`Güncellendi: ${ustSha}. Vercel yeni sürümü yayına alacak.`);
}

main();
