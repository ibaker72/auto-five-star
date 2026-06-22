"use client";

import { useState, useTransition } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ChecklistItem, ChecklistStatus } from "@/lib/audit/e2e-core";
import type { E2ETestResult } from "@/lib/audit/e2e";
import {
  cleanupAuditTestAction,
  runAuditTestAction,
  type CleanupActionState,
} from "./actions";

const STATUS_BADGE: Record<ChecklistStatus, { label: string; className: string }> = {
  ok: { label: "PASS", className: "bg-green-100 text-green-800" },
  fail: { label: "FAIL", className: "bg-red-100 text-red-800" },
  skip: { label: "SKIP", className: "bg-amber-100 text-amber-800" },
  info: { label: "INFO", className: "bg-slate-100 text-slate-700" },
};

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const badge = STATUS_BADGE[item.status];
  return (
    <li className="flex items-start justify-between gap-3 border-b py-2 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{item.label}</p>
        <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
      </div>
      <span
        className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${badge.className}`}
      >
        {badge.label}
      </span>
    </li>
  );
}

export function AuditTestRunner() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<E2ETestResult | null>(null);
  const [cleanup, setCleanup] = useState<CleanupActionState>({ status: "idle" });
  const [cleaning, startCleanup] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setResult(null);
    setCleanup({ status: "idle" });
    startTransition(async () => {
      const state = await runAuditTestAction({
        businessName: String(formData.get("business_name") ?? ""),
        email: String(formData.get("email") ?? ""),
        city: String(formData.get("city") ?? ""),
        phone: String(formData.get("phone") ?? ""),
      });
      if (state.status === "error") {
        setError(state.message);
        return;
      }
      if (state.status === "done") setResult(state.result);
    });
  }

  function onCleanup() {
    if (!result?.leadId) return;
    const ok = window.confirm(
      `Delete test lead "${result.businessName}" and all scoped audit/funnel ` +
        `records? This cannot be undone.`,
    );
    if (!ok) return;
    startCleanup(async () => {
      const state = await cleanupAuditTestAction({
        leadId: result.leadId!,
        confirm: true,
      });
      setCleanup(state);
      if (state.status === "done") setResult(null);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Run a test audit</CardTitle>
          <CardDescription>
            Uses a real production code path. The business name is automatically
            prefixed so the lead is unmistakably test data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Could not run test</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="business_name">Test business name *</Label>
              <Input
                id="business_name"
                name="business_name"
                required
                placeholder="Smith Family HVAC"
                defaultValue="QA Sample Business"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" placeholder="Austin, TX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" name="phone" type="tel" placeholder="(555) 123-4567" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Test email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="qa@autofivestar.com"
              />
            </div>

            <Button type="submit" disabled={pending}>
              {pending ? "Running test…" : "Run test audit"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Results
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${
                  result.ok
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {result.ok ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"}
              </span>
            </CardTitle>
            <CardDescription>
              Lead <code className="text-xs">{result.leadId}</code>
              {result.resultsUrl ? (
                <>
                  {" · "}
                  <a className="underline" href={result.resultsUrl} target="_blank" rel="noreferrer">
                    Results page
                  </a>
                </>
              ) : null}
              {result.pdfUrl ? (
                <>
                  {" · "}
                  <a className="underline" href={result.pdfUrl} target="_blank" rel="noreferrer">
                    PDF
                  </a>
                </>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.error ? (
              <Alert variant="destructive">
                <AlertTitle>Run error</AlertTitle>
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            ) : null}

            <ul>
              {result.checklist.map((item) => (
                <ChecklistRow key={item.key} item={item} />
              ))}
            </ul>

            <div className="flex items-center gap-3 border-t pt-4">
              <Button
                variant="destructive"
                onClick={onCleanup}
                disabled={cleaning || !result.leadId}
              >
                {cleaning ? "Cleaning up…" : "Delete this test lead"}
              </Button>
              <span className="text-xs text-muted-foreground">
                Removes the lead, its audit requests, and its funnel events.
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {cleanup.status === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>Cleanup failed</AlertTitle>
          <AlertDescription>{cleanup.message}</AlertDescription>
        </Alert>
      ) : null}
      {cleanup.status === "done" ? (
        <Alert>
          <AlertTitle>Cleanup complete</AlertTitle>
          <AlertDescription>
            Deleted lead {cleanup.result.businessName} —{" "}
            {cleanup.result.requestsDeleted} request(s),{" "}
            {cleanup.result.funnelEventsDeleted} funnel event(s).
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
