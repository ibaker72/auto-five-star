import { type NextRequest } from "next/server";
import { handleGoogleGbpCallback } from "@/lib/integrations/google-callback";

// Google Business Profile OAuth callback. Registered redirect URI in Google
// Cloud: https://(www.)autofivestar.com/api/auth/google/callback
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleGoogleGbpCallback(request);
}
