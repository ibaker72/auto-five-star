import Link from "next/link";
import {
  and,
  desc,
  eq,
  sql,
  type SQL,
} from "drizzle-orm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { requireOrgContext } from "@/lib/auth/org";
import { db } from "@/lib/db/client";
import {
  locations as locationsTable,
  responseDrafts,
  reviewResponses,
  reviews,
} from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "drafted", label: "Drafted" },
  { value: "approved", label: "Approved" },
  { value: "posted", label: "Posted" },
  { value: "skipped", label: "Skipped" },
  { value: "flagged", label: "Flagged" },
] as const;

const RATING_OPTIONS = [
  { value: "all", label: "Any" },
  { value: "1", label: "1★" },
  { value: "2", label: "2★" },
  { value: "3", label: "3★" },
  { value: "4", label: "4★" },
  { value: "5", label: "5★" },
] as const;

const SOURCE_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: "google", label: "Google" },
  { value: "yelp", label: "Yelp" },
] as const;

type SearchParams = {
  status?: string;
  rating?: string;
  source?: string;
};

const VALID_STATUSES = [
  "new",
  "drafted",
  "approved",
  "posted",
  "skipped",
  "flagged",
] as const;

export default async function InboxPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireOrgContext();

  const statusFilter = searchParams.status ?? "all";
  const ratingFilter = searchParams.rating ?? "all";
  const sourceFilter = searchParams.source ?? "all";

  const filters: SQL[] = [eq(reviews.orgId, ctx.org.id)];
  if (statusFilter !== "all") {
    if ((VALID_STATUSES as readonly string[]).includes(statusFilter)) {
      filters.push(
        eq(
          reviews.status,
          statusFilter as (typeof VALID_STATUSES)[number],
        ),
      );
    }
  }
  if (ratingFilter !== "all") {
    const rating = parseInt(ratingFilter, 10);
    if (rating >= 1 && rating <= 5) {
      filters.push(eq(reviews.rating, rating));
    }
  }
  if (sourceFilter === "google" || sourceFilter === "yelp") {
    filters.push(eq(reviews.source, sourceFilter));
  }

  const rows = await db
    .select({
      review: reviews,
      locationName: locationsTable.name,
      draftCount: sql<number>`(
        select count(*)::int from ${responseDrafts}
        where ${responseDrafts.reviewId} = ${reviews.id}
      )`.as("draft_count"),
      latestResponseStatus: sql<string | null>`(
        select status::text from ${reviewResponses}
        where ${reviewResponses.reviewId} = ${reviews.id}
        order by ${reviewResponses.updatedAt} desc
        limit 1
      )`.as("response_status"),
    })
    .from(reviews)
    .leftJoin(locationsTable, eq(locationsTable.id, reviews.locationId))
    .where(and(...filters))
    .orderBy(desc(reviews.postedAt))
    .limit(100);

  const hasAnyReviews = rows.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
        <p className="text-sm text-muted-foreground">
          Showing the latest 100 reviews matching your filters.
        </p>
      </div>

      <FilterBar
        status={statusFilter}
        rating={ratingFilter}
        source={sourceFilter}
      />

      {!hasAnyReviews ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No reviews match the current filters.{" "}
            <Link href="/locations" className="underline">
              Connect a location and pull reviews
            </Link>{" "}
            to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <ReviewRow
              key={row.review.id}
              id={row.review.id}
              rating={row.review.rating}
              reviewerName={row.review.reviewerName}
              body={row.review.body}
              status={row.review.status}
              source={row.review.source}
              postedAt={row.review.postedAt}
              locationName={row.locationName}
              draftCount={Number(row.draftCount ?? 0)}
              responseStatus={row.latestResponseStatus}
            />
          ))}
        </div>
      )}

      <Alert>
        <AlertTitle>Bulk actions</AlertTitle>
        <AlertDescription>
          Pro-tier bulk generate and bulk approve ship in PR #7.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function FilterBar({
  status,
  rating,
  source,
}: {
  status: string;
  rating: string;
  source: string;
}) {
  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3"
    >
      <FilterGroup
        label="Status"
        name="status"
        value={status}
        options={STATUS_OPTIONS}
      />
      <FilterGroup
        label="Rating"
        name="rating"
        value={rating}
        options={RATING_OPTIONS}
      />
      <FilterGroup
        label="Source"
        name="source"
        value={source}
        options={SOURCE_OPTIONS}
      />
      <button
        type="submit"
        className="ml-auto h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Apply
      </button>
    </form>
  );
}

function FilterGroup({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <label className="text-xs text-muted-foreground">
      <div className="mb-1 font-medium uppercase tracking-wider">{label}</div>
      <select
        name={name}
        defaultValue={value}
        className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReviewRow({
  id,
  rating,
  reviewerName,
  body,
  status,
  source,
  postedAt,
  locationName,
  draftCount,
  responseStatus,
}: {
  id: string;
  rating: number;
  reviewerName: string | null;
  body: string | null;
  status: string;
  source: string;
  postedAt: Date;
  locationName: string | null;
  draftCount: number;
  responseStatus: string | null;
}) {
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  const action = quickAction({ status, draftCount, responseStatus });

  return (
    <Link
      href={`/reviews/${id}`}
      className="block rounded-md border bg-card p-4 text-sm transition-colors hover:bg-secondary/40"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-amber-500" aria-label={`${rating} stars`}>
            {stars}
          </span>
          <span className="font-medium text-foreground">
            {reviewerName ?? "Anonymous"}
          </span>
          <StatusBadge status={status} />
          <SourceBadge source={source} />
          {draftCount > 0 && status !== "posted" ? (
            <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-violet-700">
              {draftCount} drafts
            </span>
          ) : null}
        </div>
        <span className="text-xs text-muted-foreground">
          {postedAt.toLocaleDateString()}
        </span>
      </div>
      {body ? (
        <p className="mt-1 line-clamp-2 text-muted-foreground">{body}</p>
      ) : null}
      <div className="mt-1 flex items-center justify-between gap-3">
        {locationName ? (
          <p className="text-xs text-muted-foreground">{locationName}</p>
        ) : (
          <span />
        )}
        <span
          className={cn(
            "text-xs font-medium",
            action.tone === "primary"
              ? "text-primary"
              : action.tone === "muted"
                ? "text-muted-foreground"
                : "text-emerald-600",
          )}
        >
          {action.label} →
        </span>
      </div>
    </Link>
  );
}

function quickAction({
  status,
  draftCount,
  responseStatus,
}: {
  status: string;
  draftCount: number;
  responseStatus: string | null;
}): { label: string; tone: "primary" | "muted" | "success" } {
  if (status === "posted" || responseStatus === "posted") {
    return { label: "Posted", tone: "success" };
  }
  if (draftCount === 0) {
    return { label: "Generate", tone: "primary" };
  }
  return { label: "Review drafts", tone: "primary" };
}

function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    drafted: "bg-violet-100 text-violet-700",
    approved: "bg-amber-100 text-amber-700",
    posted: "bg-emerald-100 text-emerald-700",
    skipped: "bg-slate-100 text-slate-600",
    flagged: "bg-rose-100 text-rose-700",
  };
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
        tone[status] ?? "bg-secondary text-secondary-foreground",
      )}
    >
      {status}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-secondary-foreground">
      {source}
    </span>
  );
}
