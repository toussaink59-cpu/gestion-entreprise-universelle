export const DOCUMENT_BUCKET = "company-private-documents";
export const DOCUMENT_MAX_SIZE_BYTES = 20 * 1024 * 1024;
export const DOCUMENT_SIGNED_URL_TTL_SECONDS = 120;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type SupportedDocumentMime = (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

/**
 * Detects supported file formats from their binary signatures, not from the
 * browser-provided MIME type or filename extension.
 */
export function detectDocumentMime(bytes: Uint8Array): SupportedDocumentMime | null {
  if (bytes.byteLength >= 5) {
    const pdf = [0x25, 0x50, 0x44, 0x46, 0x2d];
    if (pdf.every((value, index) => bytes[index] === value)) {
      return "application/pdf";
    }
  }

  if (
    bytes.byteLength >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (
    bytes.byteLength >= pngSignature.length &&
    pngSignature.every((value, index) => bytes[index] === value)
  ) {
    return "image/png";
  }

  if (
    bytes.byteLength >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return "image/webp";
  }

  return null;
}

export function isDocumentSizeAllowed(size: number): boolean {
  return Number.isSafeInteger(size) && size > 0 && size <= DOCUMENT_MAX_SIZE_BYTES;
}

export function sanitizeDocumentFilename(input: string): string {
  const normalized = input
    .normalize("NFC")
    .replace(/[\\/]/g, "_")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const truncated = [...normalized].slice(0, 180).join("").trim();
  return truncated || "document";
}
