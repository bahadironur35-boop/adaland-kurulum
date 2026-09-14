"use client";

/**
 * Tarayicinin passkey hatalari Ingilizce DOMException'lar olarak gelir.
 * Mesaj METNINE bakmak kirilgan ("not allowed" vs "NotAllowed" tuzagi);
 * bu yuzden once hatanin ADINA bakiyoruz.
 */
function hataAdi(err: unknown): string | null {
  if (typeof err !== "object" || err === null) return null;
  const e = err as { name?: string; code?: string; cause?: { name?: string } };
  // SimpleWebAuthn kendi WebAuthnError'una sarar, orijinali cause'ta tasir.
  if (e.cause?.name) return e.cause.name;
  if (e.name && e.name !== "Error" && e.name !== "WebAuthnError") return e.name;
  return null;
}

/**
 * @param mod "giris" = mevcut passkey ile girme, "kayit" = bu cihazi ekleme.
 * Sunucudan gelen hatalar zaten Turkce, oldugu gibi gecer.
 */
export function passkeyHatasi(err: unknown, mod: "giris" | "kayit"): string {
  switch (hataAdi(err)) {
    case "NotAllowedError":
    case "AbortError":
      return mod === "giris"
        ? "Bu cihazda kayıtlı Face ID ya da parmak izi bulunamadı, veya işlem yarıda kaldı. Şifrenle girip Ayarlar'dan ekleyebilirsin."
        : "İşlem iptal edildi.";
    case "InvalidStateError":
      return "Bu cihaz zaten ekli. Girişte doğrudan Face ID düğmesini kullanabilirsin.";
    case "NotSupportedError":
      return "Bu cihaz Face ID / parmak izi girişini desteklemiyor.";
    case "SecurityError":
      return "Güvenlik nedeniyle çalışmadı. Sayfayı https adresinden açtığından emin ol.";
    case "ConstraintError":
      return "Cihazın ekran kilidi kurulu değil. Önce telefonunda Face ID, parmak izi ya da şifreli kilit tanımla.";
    case "TimeoutError":
      return "Süre doldu. Tekrar dene.";
    default:
      break;
  }
  // Kendi API'mizin hatalari duz Error'dur ve mesaji zaten Turkce: oldugu gibi goster.
  // Tarayici kaynakli her sey (DOMException, WebAuthnError) Ingilizce olur: gosterme.
  if (err instanceof Error && err.name === "Error" && err.message.trim()) return err.message.trim();
  return mod === "giris" ? "Face ID ile giriş yapılamadı. Şifrenle girebilirsin." : "Eklenemedi, tekrar dene.";
}
