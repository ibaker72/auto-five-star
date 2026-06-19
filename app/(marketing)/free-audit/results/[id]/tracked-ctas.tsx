"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

type CtaEvent = "trial_clicked" | "demo_clicked" | "contact_clicked";

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
        onClick={() => track("trial_clicked", "/signup?plan=growth")}
      >
        Unlock full review growth plan
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="w-full sm:w-auto"
        disabled={pending}
        onClick={() => track("demo_clicked", "/contact?topic=demo")}
      >
        Book your review growth setup call
      </Button>
      <Link
        href="/pricing"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        See plans &amp; pricing →
      </Link>
    </div>
  );
}
