"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  generateDraftsAction,
  postResponseAction,
  saveResponseAction,
} from "./actions";

export type DraftVariant = "warm" | "professional" | "brief";

export type DraftRow = {
  id: string;
  variant: DraftVariant;
  body: string;
  rationale: string | null;
  model: string;
  generatedAt: string;
};

type ResponseRow = {
  id: string;
  body: string;
  status: "draft" | "approved" | "posted" | "failed";
  draftId: string | null;
  postedAt: string | null;
  errorMessage: string | null;
};

type Props = {
  reviewId: string;
  source: "google" | "yelp";
  rating: number;
  hasDrafts: boolean;
  drafts: DraftRow[];
  response: ResponseRow | null;
  hasGoogleConnection: boolean;
  aiQuota: { used: number; limit: number | null };
  notice: { ok?: string; error?: string };
};

const VARIANT_ORDER: DraftVariant[] = ["warm", "professional", "brief"];
const VARIANT_LABEL: Record<DraftVariant, string> = {
  warm: "Warm",
  professional: "Professional",
  brief: "Brief",
};

export function ResponseWorkspace(props: Props) {
  const initialDraftId = props.response?.draftId ?? props.drafts[0]?.id ?? null;
  const initialBody =
    props.response?.body ??
    (initialDraftId
      ? props.drafts.find((d) => d.id === initialDraftId)?.body ?? ""
      : "");

  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(
    initialDraftId,
  );
  const [body, setBody] = useState<string>(initialBody);
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Re-sync when server data changes (after revalidation).
  useEffect(() => {
    if (!props.response) return;
    setBody(props.response.body);
    if (props.response.draftId) setSelectedDraftId(props.response.draftId);
  }, [props.response]);

  const posted = props.response?.status === "posted";
  const isYelp = props.source === "yelp";
  const isNegative = props.rating <= 2;
  const overQuota =
    props.aiQuota.limit !== null && props.aiQuota.used >= props.aiQuota.limit;

  function selectDraft(d: DraftRow) {
    setSelectedDraftId(d.id);
    setBody(d.body);
  }

  function onGenerate(force: boolean) {
    setActionError(null);
    const fd = new FormData();
    fd.set("review_id", props.reviewId);
    if (force) fd.set("force", "true");
    startTransition(async () => {
      const result = await generateDraftsAction(fd);
      if (!result.ok) setActionError(result.error);
    });
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4">
      {props.notice.ok ? (
        <Alert variant="success">
          <AlertTitle>
            {props.notice.ok === "posted"
              ? "Posted to Google"
              : props.notice.ok === "approved"
                ? "Response approved"
                : "Response saved"}
          </AlertTitle>
        </Alert>
      ) : null}
      {props.notice.error ? (
        <Alert variant="destructive">
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{props.notice.error}</AlertDescription>
        </Alert>
      ) : null}
      {actionError ? (
        <Alert variant="destructive">
          <AlertTitle>Generation failed</AlertTitle>
          <AlertDescription>
            {actionError}
            {overQuota ? (
              <>
                {" "}
                <Link href="/billing" className="underline">
                  Upgrade your plan
                </Link>
                .
              </>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {isNegative && !posted ? (
        <Alert variant="destructive">
          <AlertTitle>Negative review</AlertTitle>
          <AlertDescription>
            Review this draft carefully before posting. Avoid arguing or
            blaming the customer.
          </AlertDescription>
        </Alert>
      ) : null}

      {!props.hasDrafts ? (
        <div className="rounded-md border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            No drafts yet. Generate three AI variants (warm, professional,
            brief) tuned to your brand voice.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            AI usage this month:{" "}
            {props.aiQuota.limit === null
              ? `${props.aiQuota.used} (unlimited)`
              : `${props.aiQuota.used} / ${props.aiQuota.limit}`}
          </p>
          <div className="mt-3">
            <Button
              type="button"
              onClick={() => onGenerate(false)}
              disabled={pending || overQuota}
            >
              {pending ? "Generating…" : "Generate AI drafts"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div role="tablist" className="flex flex-wrap gap-2">
            {VARIANT_ORDER.map((v) => {
              const d = props.drafts.find((x) => x.variant === v);
              if (!d) return null;
              const active = selectedDraftId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectDraft(d)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-secondary",
                  )}
                >
                  {VARIANT_LABEL[v]}
                </button>
              );
            })}
          </div>

          <form action={saveResponseAction} className="space-y-3">
            <input
              type="hidden"
              name="review_id"
              value={props.reviewId}
            />
            <input
              type="hidden"
              name="draft_id"
              value={selectedDraftId ?? ""}
            />
            <Textarea
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              disabled={posted}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {body.length} chars
              </span>
              <Button
                type="submit"
                name="action"
                value="save"
                variant="outline"
                disabled={pending || posted || body.trim().length === 0}
              >
                Save edits
              </Button>
              <Button
                type="submit"
                name="action"
                value="approve"
                variant="default"
                disabled={pending || posted || body.trim().length === 0}
              >
                {props.response?.status === "approved" ? "Approved" : "Approve"}
              </Button>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onGenerate(true)}
                  disabled={pending}
                >
                  Regenerate
                </Button>
              </div>
            </div>
          </form>

          {posted ? (
            <Alert variant="success">
              <AlertTitle>Posted</AlertTitle>
              <AlertDescription>
                {props.response?.postedAt
                  ? `Posted ${new Date(props.response.postedAt).toLocaleString()}.`
                  : "Posted."}
              </AlertDescription>
            </Alert>
          ) : isYelp ? (
            <div className="rounded-md border bg-card p-3 text-sm">
              <p className="text-foreground">
                Yelp does not allow API posting. Copy this reply and paste it
                manually into Yelp.
              </p>
              <div className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCopy}
                  disabled={body.trim().length === 0}
                >
                  {copied ? "Copied" : "Copy to clipboard"}
                </Button>
              </div>
            </div>
          ) : (
            <form action={postResponseAction}>
              <input
                type="hidden"
                name="review_id"
                value={props.reviewId}
              />
              <Button
                type="submit"
                disabled={
                  pending ||
                  body.trim().length === 0 ||
                  !props.hasGoogleConnection
                }
                title={
                  !props.hasGoogleConnection
                    ? "Reconnect Google to post"
                    : undefined
                }
              >
                Post to Google
              </Button>
              {!props.hasGoogleConnection ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  <Link href="/locations" className="underline">
                    Reconnect Google
                  </Link>
                </span>
              ) : null}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
