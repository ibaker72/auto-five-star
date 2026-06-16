import { and, count, eq } from "drizzle-orm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgContext } from "@/lib/auth/org";
import { db } from "@/lib/db/client";
import { locations, reviews } from "@/lib/db/schema";
import { PLAN_CONFIG } from "@/lib/billing/plans";
import {
  listGoogleBusinessAccounts,
  listGoogleBusinessLocations,
  GBP_LIVE_MODE,
  type GbpAccount,
  type GbpLocation,
} from "@/lib/integrations/google";
import {
  getGoogleConnectionStatus,
  GoogleNotConnectedError,
  GoogleRefreshError,
} from "@/lib/integrations/google-tokens";
import { GoogleConnectionCard } from "./connect-card";
import { pullReviewsAction, removeLocationAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = {
  account?: string;
  google?: string;
  message?: string;
};

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireOrgContext();
  const status = await getGoogleConnectionStatus(ctx.org.id);

  let accounts: GbpAccount[] = [];
  let availableLocations: GbpLocation[] = [];
  let selectedAccount = searchParams.account ?? null;
  let connectError: string | null = null;

  if (status.connected) {
    try {
      accounts = await listGoogleBusinessAccounts(ctx.org.id);
      if (!selectedAccount && accounts[0]) selectedAccount = accounts[0].name;
      if (selectedAccount) {
        availableLocations = await listGoogleBusinessLocations(
          ctx.org.id,
          selectedAccount,
        );
      }
    } catch (err) {
      if (err instanceof GoogleNotConnectedError) {
        connectError = "Reconnect Google to continue.";
      } else if (err instanceof GoogleRefreshError) {
        connectError =
          "Google session expired. Reconnect to refresh access.";
      } else {
        connectError =
          err instanceof Error
            ? err.message
            : "Could not load Google data.";
      }
    }
  }

  const [connectedLocations, reviewCountsRows] = await Promise.all([
    db
      .select()
      .from(locations)
      .where(eq(locations.orgId, ctx.org.id)),
    db
      .select({
        locationId: reviews.locationId,
        total: count(reviews.id),
      })
      .from(reviews)
      .where(eq(reviews.orgId, ctx.org.id))
      .groupBy(reviews.locationId),
  ]);

  const reviewCounts = new Map<string, number>(
    reviewCountsRows.map((r) => [r.locationId, Number(r.total)]),
  );

  const cfg = PLAN_CONFIG[ctx.org.plan];
  const quota = {
    used: connectedLocations.length,
    limit: cfg.maxLocations,
  };

  const alreadyConnectedSourceIds = new Set(
    connectedLocations.map((l) => l.sourceLocationId),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Locations</h1>
        <p className="text-sm text-muted-foreground">
          Plan: {cfg.name} · {quota.used} / {quota.limit} locations used
        </p>
      </div>

      <Notice searchParams={searchParams} />

      <GoogleConnectionCard
        isLiveMode={GBP_LIVE_MODE}
        status={
          status.connected
            ? {
                connected: true,
                accountEmail: status.accountEmail,
                connectedAt: status.connectedAt,
              }
            : { connected: false }
        }
        accounts={accounts}
        selectedAccount={selectedAccount}
        locations={availableLocations}
        alreadyConnectedSourceIds={alreadyConnectedSourceIds}
        quota={quota}
        error={connectError}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Connected locations
        </h2>
        {connectedLocations.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No locations connected yet</CardTitle>
              <CardDescription>
                Connect Google above to pull in your first location.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {connectedLocations.map((loc) => (
              <Card key={loc.id}>
                <CardHeader>
                  <CardTitle className="text-base">{loc.name}</CardTitle>
                  <CardDescription>
                    {[loc.city, loc.state].filter(Boolean).join(", ") ||
                      "Address unavailable"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="capitalize">Source: {loc.source}</span>
                    <span>{reviewCounts.get(loc.id) ?? 0} reviews</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Connected{" "}
                      {loc.connectedAt
                        ? loc.connectedAt.toLocaleDateString()
                        : "n/a"}
                    </span>
                    <span>
                      Last synced{" "}
                      {loc.updatedAt
                        ? loc.updatedAt.toLocaleString()
                        : "never"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <form action={pullReviewsAction}>
                      <input
                        type="hidden"
                        name="location_id"
                        value={loc.id}
                      />
                      <Button type="submit" size="sm" variant="outline">
                        Pull reviews now
                      </Button>
                    </form>
                    <form action={removeLocationAction}>
                      <input
                        type="hidden"
                        name="location_id"
                        value={loc.id}
                      />
                      <Button type="submit" size="sm" variant="ghost">
                        Remove
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Notice({ searchParams }: { searchParams: SearchParams }) {
  switch (searchParams.google) {
    case "connected":
      return (
        <Alert variant="success">
          <AlertTitle>Google connected</AlertTitle>
          <AlertDescription>
            Pick an account and connect a location to start pulling reviews.
          </AlertDescription>
        </Alert>
      );
    case "location_connected":
      return (
        <Alert variant="success">
          <AlertTitle>Location connected</AlertTitle>
          <AlertDescription>
            Click <em>Pull reviews now</em> to bring in the latest reviews.
          </AlertDescription>
        </Alert>
      );
    case "reviews_pulled":
      return (
        <Alert variant="success">
          <AlertTitle>Reviews pulled</AlertTitle>
          <AlertDescription>
            New reviews are available in your inbox.
          </AlertDescription>
        </Alert>
      );
    case "location_removed":
      return (
        <Alert>
          <AlertTitle>Location removed</AlertTitle>
          <AlertDescription>You can add it back any time.</AlertDescription>
        </Alert>
      );
    case "disconnected":
      return (
        <Alert>
          <AlertTitle>Google disconnected</AlertTitle>
          <AlertDescription>
            Existing reviews stay in your inbox but no new ones will sync until
            you reconnect.
          </AlertDescription>
        </Alert>
      );
    case "error":
      return (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            {searchParams.message ?? "Please try again."}
          </AlertDescription>
        </Alert>
      );
    default:
      return null;
  }
}
