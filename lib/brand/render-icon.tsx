import { ImageResponse } from "next/og";
import { brandMarkDataUri } from "@/lib/brand/brand-assets";

/**
 * Render a square PWA icon PNG at the requested pixel size. Used by the
 * `/icons/*` route handlers referenced from the web app manifest.
 */
export function renderIconResponse(px: number, maskable = false): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brandMarkDataUri({ maskable })}
          alt="AutoFiveStar"
          width={px}
          height={px}
        />
      </div>
    ),
    { width: px, height: px },
  );
}
