"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithGoogle, loginWithPassword } from "../actions";

const REASON_MESSAGES: Record<string, string> = {
  "session-expired":
    "Your session expired or could not be verified. Please sign in again.",
  "signed-out": "You've been signed out. Sign in again to continue.",
};

export function LoginForm() {
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(
    search.get("error") ?? null,
  );
  const reason = search.get("reason");
  const notice = reason ? REASON_MESSAGES[reason] ?? null : null;
  const next = search.get("next") ?? "/dashboard";

  function onPasswordSubmit(formData: FormData) {
    setError(null);
    formData.set("next", next);
    startTransition(async () => {
      const result = await loginWithPassword(formData);
      if (result && !result.ok) setError(result.error);
    });
  }

  function onGoogleClick() {
    setError(null);
    const formData = new FormData();
    formData.set("next", next);
    startTransition(async () => {
      const result = await loginWithGoogle(formData);
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : notice ? (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      <form action={onPasswordSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@autofivestar.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onGoogleClick}
        disabled={pending}
      >
        Continue with Google
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        New to AutoFiveStar?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
