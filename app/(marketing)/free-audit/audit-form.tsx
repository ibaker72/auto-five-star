"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listIndustryPacks } from "@/lib/templates/industry-packs";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  const KEY = "afv_session_id";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

export function AuditForm() {
  const router = useRouter();
  const packs = listIndustryPacks();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set("session_id", getSessionId());
    startTransition(async () => {
      const res = await fetch("/api/audit", {
        method: "POST",
        body: formData,
        headers: { accept: "application/json" },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? "Could not run the audit. Please try again.");
        return;
      }
      const body = (await res.json()) as { results_url: string };
      router.push(body.results_url);
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="business_name">Business name *</Label>
        <Input
          id="business_name"
          name="business_name"
          required
          placeholder="Smith Family HVAC"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">City / location</Label>
        <Input
          id="city"
          name="city"
          placeholder="Austin, TX"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@yourbusiness.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="website">Website (if available)</Label>
          <Input
            id="website"
            name="website"
            type="url"
            placeholder="https://yourbusiness.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gbp_url">Google Business Profile (if available)</Label>
          <Input
            id="gbp_url"
            name="gbp_url"
            type="url"
            placeholder="https://maps.app.goo.gl/…"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="industry">Industry</Label>
        <select
          id="industry"
          name="industry"
          defaultValue=""
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Pick the closest match
          </option>
          {packs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.emoji} {p.name}
            </option>
          ))}
        </select>
      </div>

      <Button
        type="submit"
        size="lg"
        variant="brand"
        className="w-full"
        disabled={pending}
      >
        {pending ? "Running your audit…" : "Run my free audit"}
      </Button>

      <p className="text-xs text-muted-foreground">
        We'll email a copy of the report. No credit card required.
      </p>
    </form>
  );
}
