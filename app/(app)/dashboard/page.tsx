import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireOrgContext } from "@/lib/auth/org";
import { getGoogleConnectionStatus } from "@/lib/integrations/google-tokens";
import { db } from "@/lib/db/client";
import { locations, reviews } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await requireOrgContext();

  const [locRows, reviewRows, unansweredRows, googleStatus] = await Promise.all([
    db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.orgId, ctx.org.id)),
    db
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.orgId, ctx.org.id)),
    db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(
          eq(reviews.orgId, ctx.org.id),
          inArray(reviews.status, ["new", "drafted"]),
        ),
      ),
    getGoogleConnectionStatus(ctx.org.id),
  ]);

  const noLocations = locRows.length === 0;
  const notConnected = !googleStatus.connected;
  const showConnectCta = notConnected || noLocations;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome to AutoFiveStar
        </h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {ctx.user.email}. Plan: {ctx.org.plan}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Locations connected" value={locRows.length} />
        <Stat label="Reviews tracked" value={reviewRows.length} />
        <Stat label="Unanswered" value={unansweredRows.length} />
      </div>

      {showConnectCta ? (
        <Card>
          <CardHeader>
            <CardTitle>Next step</CardTitle>
            <CardDescription>
              {notConnected
                ? "Connect your Google Business Profile to start pulling reviews."
                : "Pick a location and pull your first reviews."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/locations">Go to locations</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/billing">View plan & billing</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
            <CardDescription>
              {unansweredRows.length === 0
                ? "All caught up — nothing waiting for a reply."
                : `${unansweredRows.length} review${unansweredRows.length === 1 ? "" : "s"} waiting for a reply.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/inbox">Open inbox</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
