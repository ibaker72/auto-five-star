import { ImageResponse } from "next/og";
import { brandMarkDataUri } from "@/lib/brand/brand-assets";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple touch icon: brand badge on a solid background with a little padding so
// iOS's rounded-corner mask doesn't clip the star.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          padding: 18,
        }}
      >
        <img
          src={brandMarkDataUri()}
          alt="AutoFiveStar"
          width={144}
          height={144}
        />
      </div>
    ),
    { ...size },
  );
}
