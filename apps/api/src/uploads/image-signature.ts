export type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

// Dosya uzantısı kullanıcının verdiği isimden değil, doğrulanmış türden türetilir; aksi halde
// "x.html" adıyla yüklenen bir dosya /uploads altından text/html olarak servis edilebilirdi.
export const EXTENSION_BY_MIME: Record<ImageMime, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export const IMAGE_HEADER_BYTES = 12;

export function isAllowedImageMime(mime: string): mime is ImageMime {
  return Object.prototype.hasOwnProperty.call(EXTENSION_BY_MIME, mime);
}

// İstemcinin bildirdiği Content-Type'a güvenmek yerine dosyanın ilk baytlarına (magic number) bakar.
export function detectImageMime(header: Buffer): ImageMime | null {
  if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    header.length >= 8 &&
    header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (header.length >= 6) {
    const signature = header.subarray(0, 6).toString("ascii");
    if (signature === "GIF87a" || signature === "GIF89a") {
      return "image/gif";
    }
  }
  if (
    header.length >= 12 &&
    header.subarray(0, 4).toString("ascii") === "RIFF" &&
    header.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}
