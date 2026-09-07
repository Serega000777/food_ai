import { BadRequestException } from "@nestjs/common";

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB

const SIGNATURES: Array<{ mimeType: string; bytes: number[] }> = [
  { mimeType: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mimeType: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
];

function matchesSignature(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, index) => buffer[index] === byte);
}

function isWebp(buffer: Buffer): boolean {
  // RIFF....WEBP — the 4 bytes at offset 8 identify the RIFF payload type.
  return (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  );
}

/**
 * Never trusts the client's declared content-type (master prompt §25/§26) — identifies
 * the real format from magic bytes. Throws `BadRequestException` (caught by
 * `AllExceptionsFilter`, never a raw multer/sharp error) on anything invalid.
 */
export function validateImageBuffer(buffer: Buffer): { mimeType: string } {
  if (buffer.length === 0) throw new BadRequestException("Empty file");
  if (buffer.length > MAX_PHOTO_BYTES) {
    throw new BadRequestException(`Photo exceeds the ${MAX_PHOTO_BYTES / (1024 * 1024)}MB limit`);
  }

  const matched = SIGNATURES.find((signature) => matchesSignature(buffer, signature.bytes));
  if (matched) return { mimeType: matched.mimeType };
  if (isWebp(buffer)) return { mimeType: "image/webp" };

  throw new BadRequestException("Unrecognized image format — use JPEG, PNG, or WebP");
}
