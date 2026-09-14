"use client";

/**
 * Tarayicida video kucultme. Sunucu, ek servis ya da ucret yok:
 * WebCodecs donanim kodlayicisini kullanir, mediabunny demux/mux isini yapar.
 *
 * Kural: ASLA basarisiz olmaz. Tarayici desteklemiyorsa, kaynak zaten kucukse
 * ya da kodlama patlarsa orijinal dosyayi oldugu gibi geri verir. Yukleme durmaz.
 */

/**
 * "720p" demek KISA kenarin 720 olmasi demek: yatay videoda yukseklik,
 * dikey telefon videosunda genislik. Uzun kenari sinirlamak yanlis olurdu:
 * 1920x1080'i 720x405'e dusururdu. Cozunurluk degistirilecekse tek yer burasi.
 */
const TARGET_SHORT_EDGE = 720;
/**
 * 1920x1080 icin hedef hiz; diger cozunurlukler piksel sayisina gore olceklenir.
 * 1280x720 icin bu ~1,6 Mbps demek, yani dakikada ~12 MB.
 */
const REFERENCE_BITRATE = 3_500_000;
const REFERENCE_PIXELS = 1920 * 1080;
const MIN_BITRATE = 800_000;
const MAX_BITRATE = 6_000_000;
const AUDIO_BITRATE = 128_000;

/** Kaynak zaten bu kadar yalinsa dokunma: yeniden kodlamak sadece kalite kaybettirir. */
const LEAN_ENOUGH = 1.25;

export type CompressOutcome = {
  blob: Blob;
  mime: string;
  ext: "mp4" | "mov" | "webm";
  /** Gercekten kucultuldu mu */
  compressed: boolean;
  originalBytes: number;
  /** Kucultulmediyse sebebi (gunluge yazmak icin, kullaniciya gosterilmez) */
  skipped?: string;
};

function targetBitrate(width: number, height: number) {
  const scaled = (REFERENCE_BITRATE * width * height) / REFERENCE_PIXELS;
  return Math.round(Math.min(MAX_BITRATE, Math.max(MIN_BITRATE, scaled)));
}

function extOf(mime: string): "mp4" | "mov" | "webm" {
  return mime === "video/quicktime" ? "mov" : mime === "video/webm" ? "webm" : "mp4";
}

function asIs(file: File, skipped: string): CompressOutcome {
  const mime = file.type || "video/mp4";
  return { blob: file, mime, ext: extOf(mime), compressed: false, originalBytes: file.size, skipped };
}

/**
 * @param onProgress 0-1 arasi ilerleme
 */
export async function compressVideo(file: File, onProgress?: (p: number) => void): Promise<CompressOutcome> {
  if (typeof window === "undefined" || typeof VideoEncoder === "undefined") {
    return asIs(file, "tarayıcı WebCodecs desteklemiyor");
  }

  let input: { dispose?: () => void } | null = null;
  try {
    const mb = await import("mediabunny");
    const {
      Input, Output, Conversion, BlobSource, BufferTarget, Mp4OutputFormat, ALL_FORMATS, Quality, canEncodeVideo,
    } = mb;

    const inp = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
    input = inp as unknown as { dispose?: () => void };

    const track = await inp.getPrimaryVideoTrack();
    if (!track) return asIs(file, "video izi bulunamadı");

    const srcW = track.displayWidth;
    const srcH = track.displayHeight;
    if (!srcW || !srcH) return asIs(file, "boyut okunamadı");

    // Sadece kucult, asla buyutme
    const shortEdge = Math.min(srcW, srcH);
    const scale = shortEdge > TARGET_SHORT_EDGE ? TARGET_SHORT_EDGE / shortEdge : 1;
    // H.264 cift sayi ister
    const outW = Math.max(2, Math.round((srcW * scale) / 2) * 2);
    const outH = Math.max(2, Math.round((srcH * scale) / 2) * 2);
    const bitrate = targetBitrate(outW, outH);

    // Kaynak zaten hedeften yalinsa ve buyutulmeyecekse dokunma
    if (scale === 1) {
      const duration = await inp.computeDuration().catch(() => 0);
      if (duration > 0) {
        const srcBitrate = (file.size * 8) / duration;
        if (srcBitrate <= bitrate * LEAN_ENOUGH) return asIs(file, "kaynak zaten yeterince küçük");
      }
    }

    if (!(await canEncodeVideo("avc", { width: outW, height: outH }))) {
      return asIs(file, "tarayıcı H.264 kodlayamıyor");
    }

    const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
    const conversion = await Conversion.init({
      input: inp,
      output,
      video: {
        width: outW,
        height: outH,
        fit: "contain",
        codec: "avc",
        quality: new Quality({ bitrate, bitrateMode: "variable" }),
      },
      audio: { codec: "aac", quality: new Quality({ bitrate: AUDIO_BITRATE }) },
    });
    if (onProgress) conversion.onProgress = (p) => onProgress(Math.max(0, Math.min(1, p)));

    await conversion.execute();
    const buffer = output.target.buffer;
    if (!buffer) return asIs(file, "çıktı üretilemedi");

    const blob = new Blob([buffer], { type: "video/mp4" });
    // Kucultme ise yaramadiysa orijinali koru
    if (blob.size >= file.size) return asIs(file, "küçültme kazanç sağlamadı");

    return { blob, mime: "video/mp4", ext: "mp4", compressed: true, originalBytes: file.size };
  } catch (e) {
    console.warn("[video] küçültme başarısız, orijinal yükleniyor", e);
    return asIs(file, e instanceof Error ? e.message : "bilinmeyen hata");
  } finally {
    try { input?.dispose?.(); } catch {}
  }
}
