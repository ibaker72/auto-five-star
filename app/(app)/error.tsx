"use client";

import { useEffect, useTransition } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signOutAndReturnToLogin } from "./actions";

/**
 * Error boundary for the authenticated app. Catches runtime failures while
 * rendering the dashboard (e.g. a profile/subscription lookup throwing, or a
 * broken session that slipped past the layout) and shows a recoverable
 * fallback instead of a blank white page.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [signingOut, startSignOut] = useTransition();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[app/error] dashboard render failed:", error);
    }
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>We had trouble loading your dashboard</CardTitle>
          <CardDescription>
            Your session may have expired or something went wrong loading your
            data. Please try again, or sign in again to fix it.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button onClick={() => reset()} disabled={signingOut}>
            Try again
          </Button>
          <Button
            variant="outline"
            disabled={signingOut}
            onClick={() => startSignOut(() => signOutAndReturnToLogin())}
          >
            {signingOut ? "Signing out…" : "Sign out and return to login"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
