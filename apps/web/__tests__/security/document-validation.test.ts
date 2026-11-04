import { describe, expect, it } from "vitest";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  DOCUMENT_MAX_SIZE_BYTES,
  DOCUMENT_SIGNED_URL_TTL_SECONDS,
  detectDocumentMime,
  isDocumentSizeAllowed,
  sanitizeDocumentFilename,
} from "@/lib/security/document-validation";

describe("document validation", () => {
  it("recognises only the four approved binary signatures", () => {
    expect(detectDocumentMime(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])))
      .toBe("application/pdf");
    expect(detectDocumentMime(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])))
      .toBe("image/jpeg");
    expect(detectDocumentMime(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
      .toBe("image/png");
    expect(detectDocumentMime(Uint8Array.from([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50,
    ]))).toBe("image/webp");
    expect(ALLOWED_DOCUMENT_MIME_TYPES).toHaveLength(4);
  });

  it("does not trust the filename or a browser-provided MIME type", () => {
    expect(detectDocumentMime(new TextEncoder().encode("not a PDF"))).toBeNull();
    expect(detectDocumentMime(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(detectDocumentMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });

  it("enforces a positive size no greater than 20 MiB", () => {
    expect(isDocumentSizeAllowed(1)).toBe(true);
    expect(isDocumentSizeAllowed(DOCUMENT_MAX_SIZE_BYTES)).toBe(true);
    expect(isDocumentSizeAllowed(DOCUMENT_MAX_SIZE_BYTES + 1)).toBe(false);
    expect(isDocumentSizeAllowed(0)).toBe(false);
    expect(isDocumentSizeAllowed(-1)).toBe(false);
    expect(isDocumentSizeAllowed(Number.NaN)).toBe(false);
    expect(isDocumentSizeAllowed(1.5)).toBe(false);
  });

  it("sanitizes filenames without preserving path separators or control characters", () => {
    expect(sanitizeDocumentFilename("../../facture\u0000\nfinale.pdf"))
      .toBe(".._.._facture finale.pdf");
    expect(sanitizeDocumentFilename("   ")).toBe("document");
    expect(sanitizeDocumentFilename("épreuve.pdf")).toBe("épreuve.pdf");
    expect(sanitizeDocumentFilename("A".repeat(200))).toHaveLength(180);
  });

  it("uses the approved 120-second signed URL lifetime", () => {
    expect(DOCUMENT_SIGNED_URL_TTL_SECONDS).toBe(120);
  });
});
