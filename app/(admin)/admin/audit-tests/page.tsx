import type { Metadata } from "next";
import { AuditTestRunner } from "./audit-test-runner";
import { E2E_TEST_PREFIX } from "@/lib/audit/e2e-core";

export const metadata: Metadata = {
  title: "Audit E2E Tests · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AuditTestsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Live Audit E2E Test</h1>
        <p className="text-sm text-muted-foreground">
          Run a production-like free audit, verify every funnel step, then clean
          up the test data. Test leads are prefixed{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            {E2E_TEST_PREFIX}
          </code>{" "}
          and cleanup only ever touches leads carrying that prefix.
        </p>
      </div>
      <AuditTestRunner />
    </div>
  );
}
