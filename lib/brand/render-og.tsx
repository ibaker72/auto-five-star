import { ImageResponse } from "next/og";
import { BRAND, brandMarkDataUri, starGlyphDataUri } from "@/lib/brand/brand-assets";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * Branded social-share card (Open Graph / Twitter). Uses only layout the OG
 * renderer (Satori) supports: fl. divs, text, and an <img> for the mark.
 */
export function renderOgResponse(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: `linear-gradient(135deg, ${BRAND.navyDeep} 0%, ${BRAND.electricDeep} 55%, ${BRAND.electric} 100%)`,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brandMarkDataUri()} alt="" width={72} height={72} />
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>
            AutoFiveStar
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            Never miss a bad review. Grow the good ones.
          </div>
          <div style={{ fontSize: 30, color: "#cbd5e1", maxWidth: 880 }}>
            AI review responses and a review growth engine for local businesses.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={starGlyphDataUri()} alt="" width={34} height={34} />
            ))}
          </div>
          <div style={{ fontSize: 26, color: "#e2e8f0" }}>
            autofivestar.com
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
