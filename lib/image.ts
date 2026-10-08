import sharp from "sharp";

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 72;
const MAX_SIGNATURE_DIMENSION = 800;

export async function compressImage(
  buffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
  if (!mimeType.startsWith("image/") || mimeType === "image/svg+xml") {
    return { buffer, mimeType, extension: "" };
  }

  const compressed = await sharp(buffer)
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return { buffer: compressed, mimeType: "image/jpeg", extension: "jpg" };
}

export async function compressSignature(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize({
      width: MAX_SIGNATURE_DIMENSION,
      height: MAX_SIGNATURE_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}
