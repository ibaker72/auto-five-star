"use client";

import { useState, useMemo } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  sendManualReviewRequest,
  type SendActionState,
} from "./actions";
import { renderTemplate } from "@/lib/review-requests/templates";

type Props = {
  defaultBusinessName: string;
  defaultTemplate: string;
  defaultReviewUrl: string;
  locations: Array<{ id: string; name: string }>;
  smsAllowed: boolean;
  emailLive: boolean;
  smsLive: boolean;
};

const initialState: SendActionState = { ok: false };

export function ManualForm({
  defaultBusinessName,
  defaultTemplate,
  defaultReviewUrl,
  locations,
  smsAllowed,
  emailLive,
  smsLive,
}: Props) {
  const [state, action] = useFormState(sendManualReviewRequest, initialState);

  const [template, setTemplate] = useState(defaultTemplate);
  const [customerName, setCustomerName] = useState("Sam Customer");
  const [reviewUrl, setReviewUrl] = useState(
    defaultReviewUrl || "https://g.page/r/your-business/review",
  );
  const [channel, setChannel] = useState<"email" | "sms" | "both">("email");

  const preview = useMemo(
    () =>
      renderTemplate(template, {
        customerName: customerName || "there",
        businessName: defaultBusinessName,
        reviewUrl: reviewUrl || "https://example.com",
      }),
    [template, customerName, defaultBusinessName, reviewUrl],
  );

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-4">
        <Field label="Customer name" htmlFor="customer_name">
          <Input
            id="customer_name"
            name="customer_name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Sam Customer"
            required
          />
        </Field>
        <Field
          label="Customer email"
          htmlFor="customer_email"
          hint="Required if sending by email."
        >
          <Input
            id="customer_email"
            name="customer_email"
            type="email"
            placeholder="sam@example.com"
          />
        </Field>
        <Field
          label="Customer phone"
          htmlFor="customer_phone"
          hint="Required if sending by SMS. E.164 like +15551234567."
        >
          <Input
            id="customer_phone"
            name="customer_phone"
            type="tel"
            placeholder="+15551234567"
          />
        </Field>
        <Field label="Channel" htmlFor="channel">
          <select
            id="channel"
            name="channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value as typeof channel)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="email">Email only</option>
            <option value="sms" disabled={!smsAllowed}>
              SMS only{smsAllowed ? "" : " — Growth/Pro"}
            </option>
            <option value="both" disabled={!smsAllowed}>
              Email + SMS{smsAllowed ? "" : " — Growth/Pro"}
            </option>
          </select>
        </Field>
        {locations.length > 0 ? (
          <Field
            label="Location (optional)"
            htmlFor="location_id"
            hint="Helps you analyze performance per location."
          >
            <select
              id="location_id"
              name="location_id"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue=""
            >
              <option value="">No specific location</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label="Google review URL" htmlFor="review_url">
          <Input
            id="review_url"
            name="review_url"
            type="url"
            value={reviewUrl}
            onChange={(e) => setReviewUrl(e.target.value)}
            placeholder="https://g.page/r/.../review"
            required
          />
        </Field>
      </div>

      <div className="space-y-4">
        <Field
          label="Message template"
          htmlFor="message_template"
          hint="Variables: {{customerName}}, {{businessName}}, {{reviewUrl}}."
        >
          <Textarea
            id="message_template"
            name="message_template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={6}
            required
          />
        </Field>

        <div className="rounded-lg border bg-secondary/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Preview
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {preview}
          </p>
        </div>

        <EnvNotice
          emailLive={emailLive}
          smsLive={smsLive}
          channel={channel}
        />

        {state?.error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not send</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}
        {state?.ok ? (
          <Alert variant="success">
            <AlertTitle>Request sent</AlertTitle>
            <AlertDescription>
              {summarizeResults(state.results)}
            </AlertDescription>
          </Alert>
        ) : null}

        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? "Sending…" : "Send review request"}
    </Button>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function EnvNotice({
  emailLive,
  smsLive,
  channel,
}: {
  emailLive: boolean;
  smsLive: boolean;
  channel: "email" | "sms" | "both";
}) {
  const wantsEmail = channel === "email" || channel === "both";
  const wantsSms = channel === "sms" || channel === "both";
  const bits: string[] = [];
  if (wantsEmail && !emailLive)
    bits.push("Email requests begin sending once your sending domain is verified.");
  if (wantsSms && !smsLive)
    bits.push(
      "SMS requests begin once your text-messaging number is approved — until then they're held safely rather than sent.",
    );
  if (bits.length === 0) return null;
  return (
    <Alert>
      <AlertTitle>Before you send</AlertTitle>
      <AlertDescription>{bits.join(" ")}</AlertDescription>
    </Alert>
  );
}

function summarizeResults(
  results: SendActionState["results"],
): string {
  if (!results || results.length === 0) return "No channels matched.";
  return results
    .map((r) => `${r.channel}: ${r.status}${r.error ? ` (${r.error})` : ""}`)
    .join(" · ");
}
