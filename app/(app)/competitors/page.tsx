import { eq } from "drizzle-orm";
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
import { Textarea } from "@/components/ui/textarea";
import { MetricCard } from "@/components/ui/metric-card";
import { requireOrgContext } from "@/lib/auth/org";
import { db } from "@/lib/db/client";
import { locations as locationsTable } from "@/lib/db/schema";
import { canUseYelp } from "@/lib/billing/entitlements";
import { computeReviewAnalytics } from "@/lib/analytics/reviews";
import { addCompetitorSnapshot, getCompetitorSnapshots } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = { saved?: string; error?: string };

export default async function CompetitorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireOrgContext();
  const [entitlement, locations, snapshots, analytics] = await Promise.all([
    canUseYelp(ctx.org.id),
    db
      .select({ id: locationsTable.id, name: locationsTable.name })
      .from(locationsTable)
      .where(eq(locationsTable.orgId, ctx.org.id)),
    getCompetitorSnapshots(ctx.org.id),
    computeReviewAnalytics({ orgId: ctx.org.id }),
  ]);

  if (!entitlement.ok) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Competitor Snapshots
        </h1>
        <Alert>
          <AlertTitle>Growth plan required</AlertTitle>
          <AlertDescription>
            Competitor snapshots are available on the Growth and Reputation Guard
            plans. Upgrade to start tracking how you stack up.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  type SnapshotPayload = {
    competitor_name?: string;
    rating?: number;
    review_count?: number;
    response_rate?: number | null;
    notes?: string | null;
  };

  const grouped = new Map<
    string,
    Array<{
      id: string;
      capturedAt: Date;
      payload: SnapshotPayload;
      locationId: string;
    }>
  >();
  for (const s of snapshots) {
    const p = s.payload as SnapshotPayload;
    const name = p.competitor_name ?? "Unknown";
    const existing = grouped.get(name) ?? [];
    existing.push({
      id: s.id,
      capturedAt: s.capturedAt,
      payload: p,
      locationId: s.locationId,
    });
    grouped.set(name, existing);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Competitor Snapshots
        </h1>
        <p className="text-sm text-muted-foreground">
          Track how your local competitors are doing on Google reviews. Add
          snapshots periodically to see trends.
        </p>
      </div>

      {searchParams.saved ? (
        <Alert variant="success">
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>Competitor snapshot added.</AlertDescription>
        </Alert>
      ) : null}

      {searchParams.error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {searchParams.error === "invalid_location"
              ? "Invalid location selected."
              : "Please fill in all required fields."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Your rating"
          value={
            analytics.averageRating !== null
              ? analytics.averageRating.toFixed(1)
              : "—"
          }
          tone="primary"
          hint="Current average"
        />
        <MetricCard
          label="Your reviews"
          value={analytics.totalReviews.toString()}
          hint="Total count"
        />
        <MetricCard
          label="Your response rate"
          value={
            analytics.responseRate !== null
              ? `${analytics.responseRate}%`
              : "—"
          }
          tone="success"
        />
        <MetricCard
          label="Competitors tracked"
          value={grouped.size.toString()}
          hint={`${snapshots.length} snapshots`}
        />
      </div>

      {grouped.size > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Competitor comparison</CardTitle>
            <CardDescription>
              Your business vs. tracked competitors. Most recent snapshot per
              competitor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Competitor</th>
                    <th className="pb-2 pr-4 font-medium">Rating</th>
                    <th className="pb-2 pr-4 font-medium">Reviews</th>
                    <th className="pb-2 pr-4 font-medium">Response %</th>
                    <th className="pb-2 pr-4 font-medium">Last captured</th>
                    <th className="pb-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr className="font-medium text-primary">
                    <td className="py-2 pr-4">{ctx.org.name} (you)</td>
                    <td className="py-2 pr-4">
                      {analytics.averageRating?.toFixed(1) ?? "—"}
                    </td>
                    <td className="py-2 pr-4">{analytics.totalReviews}</td>
                    <td className="py-2 pr-4">
                      {analytics.responseRate !== null
                        ? `${analytics.responseRate}%`
                        : "—"}
                    </td>
                    <td className="py-2 pr-4">Live</td>
                    <td className="py-2">—</td>
                  </tr>
                  {Array.from(grouped.entries()).map(
                    ([name, entries]) => {
                      const latest = entries[0]!;
                      const p = latest.payload;
                      const yourRating = analytics.averageRating ?? 0;
                      const theirRating = p.rating ?? 0;
                      const ratingDiff = yourRating - theirRating;
                      return (
                        <tr key={name}>
                          <td className="py-2 pr-4 font-medium">{name}</td>
                          <td className="py-2 pr-4">
                            {p.rating?.toFixed(1) ?? "—"}
                            {ratingDiff !== 0 ? (
                              <span
                                className={
                                  ratingDiff > 0
                                    ? "ml-1 text-xs text-emerald-600"
                                    : "ml-1 text-xs text-rose-600"
                                }
                              >
                                {ratingDiff > 0 ? "+" : ""}
                                {ratingDiff.toFixed(1)} you
                              </span>
                            ) : null}
                          </td>
                          <td className="py-2 pr-4">
                            {p.review_count ?? "—"}
                          </td>
                          <td className="py-2 pr-4">
                            {p.response_rate != null
                              ? `${p.response_rate}%`
                              : "—"}
                          </td>
                          <td className="py-2 pr-4 text-xs text-muted-foreground">
                            {latest.capturedAt.toLocaleDateString()}
                          </td>
                          <td className="py-2 text-xs text-muted-foreground">
                            {p.notes ?? "—"}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Add a competitor snapshot</CardTitle>
          <CardDescription>
            Look up a local competitor on Google Maps and record their current
            stats. Repeat monthly to track trends.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addCompetitorSnapshot} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="location_id">Your location</Label>
                <select
                  id="location_id"
                  name="location_id"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="competitor_name">Competitor name</Label>
                <Input
                  id="competitor_name"
                  name="competitor_name"
                  required
                  placeholder="e.g. Smith's HVAC"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rating">Their Google rating</Label>
                <Input
                  id="rating"
                  name="rating"
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  required
                  placeholder="4.2"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="review_count">Total review count</Label>
                <Input
                  id="review_count"
                  name="review_count"
                  type="number"
                  min="0"
                  required
                  placeholder="87"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="response_rate">Response rate (%)</Label>
                <Input
                  id="response_rate"
                  name="response_rate"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="35"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  placeholder="Optional: what stands out?"
                />
              </div>
            </div>
            <Button type="submit">Save snapshot</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
