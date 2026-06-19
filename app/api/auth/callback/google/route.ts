import { type NextRequest } from "next/server";
import { handleGoogleGbpCallback } from "@/lib/integrations/google-callback";

// Compatibility callback for the alternate redirect URI registered in Google
// Cloud: https://(www.)autofivestar.com/api/auth/callback/google
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleGoogleGbpCallback(request);
}
