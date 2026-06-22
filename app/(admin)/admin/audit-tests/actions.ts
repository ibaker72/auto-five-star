"use server";

import { requireAdmin } from "@/lib/auth/admin";
import {
  cleanupE2ETestLead,
  runE2EAuditTest,
  type CleanupResult,
  type E2ETestResult,
} from "@/lib/audit/e2e";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RunActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "done"; result: E2ETestResult };

export async function runAuditTestAction(input: {
  businessName: string;
  email: string;
  city?: string;
  phone?: string;
}): Promise<RunActionState> {
  await requireAdmin();

  const businessName = (input.businessName ?? "").trim();
  const email = (input.email ?? "").trim();

  if (businessName.length === 0) {
    return { status: "error", message: "Business name is required." };
  }
  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: "A valid test email is required." };
  }

  try {
    const result = await runE2EAuditTest({
      businessName,
      email,
      city: input.city?.trim() || null,
      phone: input.phone?.trim() || null,
    });
    return { status: "done", result };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Test run failed.",
    };
  }
}

export type CleanupActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "done"; result: CleanupResult };

export async function cleanupAuditTestAction(input: {
  leadId: string;
  confirm: boolean;
}): Promise<CleanupActionState> {
  await requireAdmin();

  if (!input.confirm) {
    return { status: "error", message: "Cleanup not confirmed." };
  }
  const leadId = (input.leadId ?? "").trim();
  if (leadId.length === 0) {
    return { status: "error", message: "Missing lead id." };
  }

  try {
    const result = await cleanupE2ETestLead(leadId);
    return { status: "done", result };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Cleanup failed.",
    };
  }
}
