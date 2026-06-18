/**
 * Shared brand constants + SVG generators used by the dynamic image routes
 * (app icons, apple-icon, OG/Twitter cards). Kept framework-agnostic so it can
 * be imported from `next/og` ImageResponse routes (Node runtime).
 */

export const BRAND = {
  navy: "#0f172a",
  navyDeep: "#0b1220",
  electric: "#2563eb",
  electricDeep: "#1e3a8a",
  cyan: "#38bdf8",
  amber: "#f5a623",
  white: "#ffffff",
} as const;

const STAR_PATH =
  "M16 6.2l2.74 5.56 6.13.89-4.44 4.33 1.05 6.11L16 20.31l-5.48 2.88 1.05-6.11-4.44-4.33 6.13-.89z";
const CHECK_PATH = "M13.4 15.7l1.7 1.7 3.5-3.6";

/**
 * The AutoFiveStar mark as a standalone SVG string (viewBox 0 0 32 32).
 * `maskable` produces a full-bleed background with the star inside the safe
 * zone, per the PWA maskable-icon spec.
 */
export function brandMarkSvg({ maskable = false }: { maskable?: boolean } = {}): string {
  const rx = maskable ? 0 : 8;
  const starGroup = maskable
    ? `<g transform="translate(16 16) scale(0.66) translate(-16 -16)">`
    : "<g>";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BRAND.electricDeep}"/>
      <stop offset="45%" stop-color="${BRAND.electric}"/>
      <stop offset="100%" stop-color="${BRAND.cyan}"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="${rx}" fill="url(#g)"/>
  ${starGroup}
    <path d="${STAR_PATH}" fill="${BRAND.white}"/>
    <path d="${CHECK_PATH}" fill="none" stroke="${BRAND.electric}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

/** Data URI form of the mark, for use as an <img src> inside ImageResponse. */
export function brandMarkDataUri(opts?: { maskable?: boolean }): string {
  return `data:image/svg+xml;base64,${Buffer.from(brandMarkSvg(opts)).toString("base64")}`;
}

/**
 * A single filled star as an SVG data URI. Used in the OG card so we never
 * depend on a runtime font fetch for the ★ glyph.
 */
export function starGlyphDataUri(color: string = BRAND.amber): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2l2.95 5.98 6.6.96-4.77 4.65 1.13 6.57L12 17.02 6.09 20.13l1.13-6.57L2.45 8.94l6.6-.96z" fill="${color}"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
