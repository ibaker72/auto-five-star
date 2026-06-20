"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CtaEvent =
  | "start_trial_from_audit_results"
  | "book_call_from_audit_results"
  | "pricing_from_audit_results";

type Props = {
  requestId: string;
  leadId: string;
};

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("afv_session_id") ?? "";
}

export function TrackedCtas({ requestId, leadId }: Props) {
  const [pending, startTransition] = useTransition();

  function track(eventType: CtaEvent, href: string) {
    const sessionId = getSessionId();
    startTransition(async () => {
      try {
        // Use sendBeacon so the request fires even as we navigate away.
        const payload = JSON.stringify({
          type: eventType,
          lead_id: leadId,
          request_id: requestId,
          session_id: sessionId,
          metadata: {},
        });
        if (
          typeof navigator !== "undefined" &&
          "sendBeacon" in navigator
        ) {
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon("/api/funnel/event", blob);
        } else {
          await fetch("/api/funnel/event", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: payload,
            keepalive: true,
          });
        }
      } catch {
        // Best-effort; never block navigation.
      } finally {
        window.location.href = href;
      }
    });
  }

  return (
    <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
      <Button
        size="lg"
        variant="brand"
        className="w-full sm:w-auto"
        disabled={pending}
        onClick={() =>
          track("start_trial_from_audit_results", "/signup?plan=growth")
        }
      >
        Start free trial
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="w-full sm:w-auto"
        disabled={pending}
        onClick={() =>
          track("book_call_from_audit_results", "/contact?topic=demo")
        }
      >
        Book setup call
      </Button>
      <button
        type="button"
        disabled={pending}
        onClick={() => track("pricing_from_audit_results", "/pricing")}
        className={cn(
          "text-sm text-muted-foreground underline-offset-4 hover:underline",
          "disabled:opacity-60",
        )}
      >
        See pricing →
      </button>
    </div>
  );
}
