import { OG_SIZE, renderOgResponse } from "@/lib/brand/render-og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "AutoFiveStar — review growth engine for local businesses";

export default function TwitterImage() {
  return renderOgResponse();
}
