import QRCode from "qrcode";

export type QrFormat = "png" | "svg" | "dataurl";

export class QrValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QrValidationError";
  }
}

/**
 * Validate a URL is well-formed and uses an http(s) scheme so it can be
 * scanned by a typical phone camera. Returns the canonicalised string.
 */
export function validateReviewUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new QrValidationError("URL is required.");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new QrValidationError("That doesn't look like a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new QrValidationError("URL must start with http:// or https://.");
  }
  return url.toString();
}

const SHARED_OPTS = {
  errorCorrectionLevel: "M" as const,
  margin: 1,
  color: { dark: "#0f172a", light: "#ffffff" },
};

/** Server-side: render an SVG string for a URL. */
export async function generateQrSvg(input: string): Promise<string> {
  const url = validateReviewUrl(input);
  return QRCode.toString(url, { ...SHARED_OPTS, type: "svg", width: 512 });
}

/** Server-side: render a data URL (PNG) suitable for <img> or download. */
export async function generateQrDataUrl(input: string): Promise<string> {
  const url = validateReviewUrl(input);
  return QRCode.toDataURL(url, { ...SHARED_OPTS, width: 512 });
}

/** Server-side: render a PNG buffer for direct file download. */
export async function generateQrPngBuffer(input: string): Promise<Buffer> {
  const url = validateReviewUrl(input);
  return QRCode.toBuffer(url, { ...SHARED_OPTS, width: 1024 });
}
