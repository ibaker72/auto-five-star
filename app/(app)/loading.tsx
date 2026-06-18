import { Loader2 } from "lucide-react";

/**
 * Route-level loading UI for the authenticated app. Shown while the server
 * validates the session and loads dashboard data, so the user never stares at
 * a blank white screen during navigation.
 */
export default function AppLoading() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      <p className="text-sm">Loading your dashboard…</p>
    </div>
  );
}
