/**
 * Review-request templates per industry pack.
 *
 * Templates are short, human, and free of incentive language. Each one is
 * compliant with Google's review policy (no gating, no incentives, no
 * pressure language) and works for both email and SMS channels.
 *
 * Variables, validated via {@link renderTemplate}:
 * - {{customerName}}   — first name of the customer (required, falls back
 *                        to "there" when missing)
 * - {{businessName}}   — org / location name (required)
 * - {{reviewUrl}}      — direct Google review link (required)
 */

import {
  INDUSTRY_PACK_IDS,
  type IndustryPackId,
} from "@/lib/templates/industry-packs";

export type ReviewRequestTemplate = {
  industry: IndustryPackId;
  channel: "email" | "sms" | "any";
  subject?: string;
  body: string;
};

const TEMPLATES: Record<IndustryPackId, ReviewRequestTemplate> = {
  general: {
    industry: "general",
    channel: "any",
    subject: "A quick favor from {{businessName}}",
    body:
      "Hi {{customerName}}, thanks for choosing {{businessName}}. " +
      "If you have a minute, would you mind leaving us a quick Google review? " +
      "It helps local customers find us. {{reviewUrl}}",
  },
  hvac: {
    industry: "hvac",
    channel: "any",
    subject: "Thanks from the {{businessName}} team",
    body:
      "Hi {{customerName}}, thanks for trusting {{businessName}} with your home comfort. " +
      "If our technician took good care of you, a quick Google review would mean a lot: {{reviewUrl}}",
  },
  plumbing: {
    industry: "plumbing",
    channel: "any",
    subject: "Quick favor from {{businessName}}",
    body:
      "Hi {{customerName}}, glad we could help today. If you have a moment, " +
      "{{businessName}} would appreciate a short Google review so other " +
      "homeowners know we're worth a call: {{reviewUrl}}",
  },
  roofing: {
    industry: "roofing",
    channel: "any",
    subject: "Thanks from {{businessName}}",
    body:
      "Hi {{customerName}}, it was a pleasure working on your roof. " +
      "Would you share a quick Google review for {{businessName}}? " +
      "Real homeowner feedback helps neighbors find us: {{reviewUrl}}",
  },
  auto_dealer: {
    industry: "auto_dealer",
    channel: "any",
    subject: "Enjoying the new ride?",
    body:
      "Hi {{customerName}}, we hope you're loving the new car! " +
      "If your experience with {{businessName}} was a good one, a Google review " +
      "would be incredibly helpful: {{reviewUrl}}",
  },
  auto_repair: {
    industry: "auto_repair",
    channel: "any",
    subject: "How did we do?",
    body:
      "Hi {{customerName}}, thanks for stopping by {{businessName}}. " +
      "If we got your car running right, a quick Google review would " +
      "really help our small shop: {{reviewUrl}}",
  },
  dentist: {
    industry: "dentist",
    channel: "any",
    subject: "Thanks for visiting {{businessName}}",
    body:
      "Hi {{customerName}}, thanks for visiting {{businessName}}. " +
      "If you have a moment, we'd appreciate a quick Google review so " +
      "others can find our practice: {{reviewUrl}}",
  },
  restaurant: {
    industry: "restaurant",
    channel: "any",
    subject: "Thanks for dining with us",
    body:
      "Hi {{customerName}}, thanks for dining with us at {{businessName}}! " +
      "If we treated you right, a quick Google review would make our day: {{reviewUrl}}",
  },
  gym_fitness: {
    industry: "gym_fitness",
    channel: "any",
    subject: "Thanks for training with {{businessName}}",
    body:
      "Hi {{customerName}}, thanks for being part of the {{businessName}} community! " +
      "A quick Google review helps more locals find a place to train: {{reviewUrl}}",
  },
  cleaning: {
    industry: "cleaning",
    channel: "any",
    subject: "Thanks from {{businessName}}",
    body:
      "Hi {{customerName}}, thanks for letting {{businessName}} clean your space. " +
      "If we left it sparkling, a quick Google review would help us out: {{reviewUrl}}",
  },
};

export function getReviewRequestTemplate(
  industry: string | null | undefined,
): ReviewRequestTemplate {
  if (industry && isIndustryPackId(industry)) {
    return TEMPLATES[industry];
  }
  return TEMPLATES.general;
}

export function listReviewRequestTemplates(): ReviewRequestTemplate[] {
  return INDUSTRY_PACK_IDS.map((id) => TEMPLATES[id]);
}

function isIndustryPackId(value: string): value is IndustryPackId {
  return (INDUSTRY_PACK_IDS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Rendering + validation
// ---------------------------------------------------------------------------

const VARIABLE_NAMES = ["customerName", "businessName", "reviewUrl"] as const;
type VariableName = (typeof VARIABLE_NAMES)[number];

export type TemplateVariables = {
  customerName?: string | null;
  businessName: string;
  reviewUrl: string;
};

/**
 * Substitute the three allowed variables. Anything that doesn't match one of
 * the variables is left intact (so users can use single curly braces freely).
 * Output is HTML-safe — values are stripped of angle brackets so a body
 * built from this can be dropped into email HTML without escaping concerns
 * for the variable values themselves.
 */
export function renderTemplate(
  template: string,
  vars: TemplateVariables,
): string {
  const safe: Record<VariableName, string> = {
    customerName: sanitizeValue(vars.customerName) || "there",
    businessName: sanitizeValue(vars.businessName) || "us",
    reviewUrl: vars.reviewUrl, // intentionally untouched — must remain a usable URL
  };
  return template.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (full, name: string) => {
    if ((VARIABLE_NAMES as readonly string[]).includes(name)) {
      return safe[name as VariableName] ?? "";
    }
    return full;
  });
}

export function extractTemplateVariables(template: string): string[] {
  const matches = template.match(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g) ?? [];
  return Array.from(
    new Set(
      matches.map((m) => m.replace(/[{}\s]/g, "")),
    ),
  );
}

export type TemplateValidation = {
  ok: boolean;
  unknownVariables: string[];
  missingRequired: string[];
};

/**
 * Surfaces unknown variables (typos like `{{userName}}`) and required
 * variables that the template is missing. We don't make `customerName`
 * mandatory because some shop-floor templates address the customer
 * generically.
 */
export function validateTemplate(template: string): TemplateValidation {
  const found = extractTemplateVariables(template);
  const unknownVariables = found.filter(
    (name) => !(VARIABLE_NAMES as readonly string[]).includes(name),
  );
  const requiredOnAll = ["businessName", "reviewUrl"] as const;
  const missingRequired = requiredOnAll.filter((r) => !found.includes(r));
  return {
    ok: unknownVariables.length === 0 && missingRequired.length === 0,
    unknownVariables,
    missingRequired,
  };
}

function sanitizeValue(raw: string | null | undefined): string {
  if (!raw) return "";
  // Strip angle brackets and trim. Keep it light — the email/SMS senders are
  // responsible for full HTML escaping; this is defense in depth.
  return raw.replace(/[<>]/g, "").trim();
}
