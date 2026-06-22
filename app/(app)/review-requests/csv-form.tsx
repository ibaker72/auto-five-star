"use client";

import { useState, useRef, useMemo } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { importCsvCampaign, type SendActionState } from "./actions";
import { renderTemplate } from "@/lib/review-requests/templates";
import {
  DAILY_LIMIT_OPTIONS,
  campaignDaySpan,
} from "@/lib/review-requests/schedule";

type Props = {
  defaultBusinessName: string;
  defaultTemplate: string;
  defaultReviewUrl: string;
  locations: Array<{ id: string; name: string }>;
  smsAllowed: boolean;
  allowed: boolean;
  upgradeReason: string;
};

type ParsedRow = {
  name: string;
  email: string | null;
  phone: string | null;
  valid: boolean;
  reason?: string;
};

const initial: SendActionState = { ok: false };

export function CsvForm({
  defaultBusinessName,
  defaultTemplate,
  defaultReviewUrl,
  locations,
  smsAllowed,
  allowed,
  upgradeReason,
}: Props) {
  const [state, action] = useFormState(importCsvCampaign, initial);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [template, setTemplate] = useState(defaultTemplate);
  const [reviewUrl, setReviewUrl] = useState(
    defaultReviewUrl || "https://g.page/r/your-business/review",
  );
  const [channel, setChannel] = useState<"email" | "sms" | "both">("email");
  const [sendMode, setSendMode] = useState<"immediate" | "scheduled">(
    "immediate",
  );
  const [dailyLimit, setDailyLimit] = useState<number>(25);
  const inputRef = useRef<HTMLInputElement>(null);

  const validRows = useMemo(() => rows.filter((r) => r.valid), [rows]);

  // Recipients = rows × channels (email and/or sms).
  const channelCount = channel === "both" ? 2 : 1;
  const sendCount = validRows.length * channelCount;
  const daySpan = useMemo(
    () => campaignDaySpan(sendCount, dailyLimit),
    [sendCount, dailyLimit],
  );

  const preview = useMemo(
    () =>
      renderTemplate(template, {
        customerName: validRows[0]?.name || "there",
        businessName: defaultBusinessName,
        reviewUrl: reviewUrl || "https://example.com",
      }),
    [template, validRows, defaultBusinessName, reviewUrl],
  );

  if (!allowed) {
    return (
      <div className="rounded-lg border bg-secondary/30 p-6 text-sm">
        <p className="font-medium text-foreground">CSV import is on Growth.</p>
        <p className="mt-1 text-muted-foreground">{upgradeReason}</p>
        <Button asChild className="mt-4" size="sm">
          <a href="/billing">Upgrade plan</a>
        </Button>
      </div>
    );
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setRows(parseCsv(text));
    };
    reader.readAsText(file);
  }

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="csv-file">
          CSV file (columns: name, email, phone)
        </Label>
        <Input
          id="csv-file"
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
        />
        {fileName ? (
          <p className="text-xs text-muted-foreground">
            Loaded <strong>{fileName}</strong>: {validRows.length} valid /{" "}
            {rows.length} total
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Each row needs a name plus at least an email or phone. Max 500
            rows per campaign.
          </p>
        )}
      </div>

      {rows.length > 0 ? (
        <div className="max-h-60 overflow-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-secondary/40 text-left text-muted-foreground">
              <tr>
                <th className="px-2 py-1">Name</th>
                <th className="px-2 py-1">Email</th>
                <th className="px-2 py-1">Phone</th>
                <th className="px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1">{r.name || "—"}</td>
                  <td className="px-2 py-1">{r.email ?? "—"}</td>
                  <td className="px-2 py-1">{r.phone ?? "—"}</td>
                  <td className="px-2 py-1">
                    {r.valid ? (
                      <span className="text-emerald-600">ready</span>
                    ) : (
                      <span className="text-rose-600">{r.reason}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 50 ? (
            <p className="border-t bg-secondary/30 px-2 py-1 text-center text-[11px] text-muted-foreground">
              + {rows.length - 50} more rows
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="campaign_name">Campaign name</Label>
          <Input
            id="campaign_name"
            name="campaign_name"
            defaultValue={`Bulk · ${new Date().toLocaleDateString()}`}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="csv-channel">Channel</Label>
          <select
            id="csv-channel"
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
        </div>
        {locations.length > 0 ? (
          <div className="space-y-1.5">
            <Label htmlFor="csv-location">Location (optional)</Label>
            <select
              id="csv-location"
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
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="csv-review-url">Google review URL</Label>
          <Input
            id="csv-review-url"
            name="review_url"
            value={reviewUrl}
            onChange={(e) => setReviewUrl(e.target.value)}
            required
          />
        </div>
      </div>

      <fieldset className="space-y-3 rounded-md border p-4">
        <legend className="px-1 text-sm font-medium">Sending schedule</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="send_mode"
              value="immediate"
              checked={sendMode === "immediate"}
              onChange={() => setSendMode("immediate")}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Send immediately</span>
              <span className="block text-xs text-muted-foreground">
                All requests go out as soon as you confirm.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="send_mode"
              value="scheduled"
              checked={sendMode === "scheduled"}
              onChange={() => setSendMode("scheduled")}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Drip over several days</span>
              <span className="block text-xs text-muted-foreground">
                Spread sends out to look natural and stay within limits.
              </span>
            </span>
          </label>
        </div>

        {sendMode === "scheduled" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="csv-daily-limit">Daily send limit</Label>
              <select
                id="csv-daily-limit"
                name="daily_limit"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {DAILY_LIMIT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} per day
                  </option>
                ))}
              </select>
              {sendCount > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {sendCount} send{sendCount === 1 ? "" : "s"} over {daySpan}{" "}
                  day{daySpan === 1 ? "" : "s"}.
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="csv-start-at">Start (optional)</Label>
              <Input
                id="csv-start-at"
                name="start_at"
                type="datetime-local"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to begin within the hour.
              </p>
            </div>
          </div>
        ) : null}
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="csv-template">Message template</Label>
        <Textarea
          id="csv-template"
          name="message_template"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={5}
          required
        />
        <div className="rounded-md border bg-secondary/30 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Preview
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
            {preview}
          </p>
        </div>
      </div>

      <input
        type="hidden"
        name="rows_json"
        value={JSON.stringify(
          validRows.map((r) => ({
            name: r.name,
            email: r.email,
            phone: r.phone,
          })),
        )}
      />

      <ConfirmAndSubmit count={sendCount} sendMode={sendMode} />

      {state?.error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not import</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state?.ok ? (
        <Alert variant="success">
          <AlertTitle>
            {sendMode === "scheduled" ? "Campaign scheduled" : "Campaign sent"}
          </AlertTitle>
          <AlertDescription>
            {state.results?.[0]?.status ?? "Done."}
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}

function ConfirmAndSubmit({
  count,
  sendMode,
}: {
  count: number;
  sendMode: "immediate" | "scheduled";
}) {
  const { pending } = useFormStatus();
  const [confirmed, setConfirmed] = useState(false);
  const verb = sendMode === "scheduled" ? "Schedule" : "Send";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-secondary/30 p-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="confirm"
          value="yes"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        I confirm these are real customers who recently used my service.
      </label>
      <Button type="submit" disabled={pending || !confirmed || count === 0}>
        {pending
          ? sendMode === "scheduled"
            ? "Scheduling…"
            : "Sending…"
          : count > 0
            ? `${verb} ${count} request${count === 1 ? "" : "s"}`
            : "Add rows to send"}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV parser (RFC-4180-ish; sufficient for name/email/phone)
// ---------------------------------------------------------------------------

function parseCsv(input: string): ParsedRow[] {
  const lines = input.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0] ?? "").map((c) => c.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  const emailIdx = header.indexOf("email");
  const phoneIdx = header.indexOf("phone");

  // Allow no header row by sniffing: if first row looks like data
  const hasHeader = nameIdx >= 0 || emailIdx >= 0 || phoneIdx >= 0;
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const idxName = hasHeader ? nameIdx : 0;
  const idxEmail = hasHeader ? emailIdx : 1;
  const idxPhone = hasHeader ? phoneIdx : 2;

  const out: ParsedRow[] = [];
  for (const line of dataLines) {
    const cells = splitCsvLine(line);
    const name = (idxName >= 0 ? cells[idxName] ?? "" : "").trim();
    const email = (idxEmail >= 0 ? cells[idxEmail] ?? "" : "").trim() || null;
    const phone = (idxPhone >= 0 ? cells[idxPhone] ?? "" : "").trim() || null;
    const emailOk = email ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) : true;
    const phoneOk = phone ? /^[+\d\s()-]{7,}$/.test(phone) : true;
    let valid = true;
    let reason: string | undefined;
    if (!name) {
      valid = false;
      reason = "name missing";
    } else if (!email && !phone) {
      valid = false;
      reason = "no contact";
    } else if (!emailOk) {
      valid = false;
      reason = "bad email";
    } else if (!phoneOk) {
      valid = false;
      reason = "bad phone";
    }
    out.push({ name, email, phone, valid, reason });
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}
