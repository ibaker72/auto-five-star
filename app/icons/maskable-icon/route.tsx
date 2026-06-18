import { renderIconResponse } from "@/lib/brand/render-icon";

export const dynamic = "force-static";

export function GET() {
  return renderIconResponse(512, true);
}
