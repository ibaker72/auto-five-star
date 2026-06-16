import { eq } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgContext } from "@/lib/auth/org";
import { db } from "@/lib/db/client";
import { locations } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const ctx = await requireOrgContext();
  const rows = await db
    .select()
    .from(locations)
    .where(eq(locations.orgId, ctx.org.id));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Locations</h1>
      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No locations yet</CardTitle>
            <CardDescription>
              Connect your Google Business Profile to pull your locations.
              Wiring lands in PR #4.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((loc) => (
            <Card key={loc.id}>
              <CardHeader>
                <CardTitle className="text-base">{loc.name}</CardTitle>
                <CardDescription>
                  {[loc.city, loc.state].filter(Boolean).join(", ") ||
                    "Address unavailable"}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Source: {loc.source}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
