import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { GbpAccount, GbpLocation } from "@/lib/integrations/google";
import { connectLocationAction, disconnectGoogleAction } from "./actions";

type ConnectionProps = {
  isLiveMode: boolean;
  status:
    | { connected: false }
    | { connected: true; accountEmail: string | null; connectedAt: Date | null };
  accounts: GbpAccount[];
  selectedAccount: string | null;
  locations: GbpLocation[];
  alreadyConnectedSourceIds: Set<string>;
  quota: { used: number; limit: number };
  error: string | null;
  /** Google accepted OAuth but hasn't granted this project GBP API access. */
  accessPending?: boolean;
  /** The accounts/locations shown are demo fixtures, not live data. */
  showingDemoData?: boolean;
  /** Current user can see internal setup notes. */
  isAdmin?: boolean;
};

export function GoogleConnectionCard(props: ConnectionProps) {
  if (!props.status.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connect Google Business Profile</CardTitle>
          <CardDescription>
            Pull your reviews and post replies. Read-only until you choose to
            post.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!props.isLiveMode ? (
            <Alert>
              <AlertTitle>Demo mode</AlertTitle>
              <AlertDescription>
                Using fixture data until Google Business Profile approval is
                complete. Set <code>GBP_LIVE=true</code> in your environment to
                use the live API.
              </AlertDescription>
            </Alert>
          ) : null}
          {props.error ? (
            <Alert variant="destructive">
              <AlertTitle>Connection error</AlertTitle>
              <AlertDescription>{props.error}</AlertDescription>
            </Alert>
          ) : null}
          <form action="/api/integrations/google/connect" method="post">
            <Button type="submit">Connect Google</Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  const status = props.status;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Business Profile</CardTitle>
        <CardDescription>
          Connected as <strong>{status.accountEmail ?? "unknown account"}</strong>
          {status.connectedAt
            ? ` on ${status.connectedAt.toLocaleDateString()}`
            : null}
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!props.isLiveMode ? (
          <Alert>
            <AlertTitle>Demo mode</AlertTitle>
            <AlertDescription>
              Using fixture data until Google Business Profile approval is
              complete.
            </AlertDescription>
          </Alert>
        ) : null}

        {props.accessPending ? (
          <Alert>
            <AlertTitle>Google connected — API access pending</AlertTitle>
            <AlertDescription>
              Google connected successfully, but Google has not yet granted API
              access for this project. We can finish setup manually while
              approval is pending — your connection is saved and nothing is
              lost.
            </AlertDescription>
          </Alert>
        ) : null}

        {props.accessPending && props.isAdmin ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-semibold uppercase tracking-wider">
              Internal note
            </p>
            <p className="mt-1">
              GBP APIs returned <code>RESOURCE_EXHAUSTED</code> with{" "}
              <code>quota_limit_value: 0</code>. Submit the Google Business
              Profile API access request and wait for project approval — quota
              stays 0 until Google grants it.{" "}
              <a
                href="https://developers.google.com/my-business/content/prereqs#request-access"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Request access →
              </a>
            </p>
          </div>
        ) : null}

        {props.error ? (
          <Alert variant="destructive">
            <AlertTitle>Connection error</AlertTitle>
            <AlertDescription>{props.error}</AlertDescription>
          </Alert>
        ) : null}

        <AccountPicker
          accounts={props.accounts}
          selectedAccount={props.selectedAccount}
          demoMode={props.showingDemoData}
        />

        {props.selectedAccount ? (
          <LocationPicker
            accountName={props.selectedAccount}
            locations={props.locations}
            alreadyConnectedSourceIds={props.alreadyConnectedSourceIds}
            quota={props.quota}
            demoMode={props.showingDemoData}
          />
        ) : null}

        <div className="pt-2">
          <form action={disconnectGoogleAction}>
            <Button type="submit" variant="ghost" size="sm">
              Disconnect Google
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

function DemoBadge() {
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
      Demo data
    </span>
  );
}

function AccountPicker({
  accounts,
  selectedAccount,
  demoMode,
}: {
  accounts: GbpAccount[];
  selectedAccount: string | null;
  demoMode?: boolean;
}) {
  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No Google Business Profile accounts found for this Google login.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">Choose an account</p>
        {demoMode ? <DemoBadge /> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {accounts.map((acct) => (
          <Link
            key={acct.name}
            href={`/locations?account=${encodeURIComponent(acct.name)}`}
            className={
              "rounded-md border px-3 py-1.5 text-sm transition-colors " +
              (selectedAccount === acct.name
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-secondary")
            }
          >
            {acct.accountName}
          </Link>
        ))}
      </div>
    </div>
  );
}

function LocationPicker({
  accountName,
  locations,
  alreadyConnectedSourceIds,
  quota,
  demoMode,
}: {
  accountName: string;
  locations: GbpLocation[];
  alreadyConnectedSourceIds: Set<string>;
  quota: { used: number; limit: number };
  demoMode?: boolean;
}) {
  const atQuota = quota.used >= quota.limit;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Locations under this account</p>
          {demoMode ? <DemoBadge /> : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {quota.used} / {quota.limit} locations used
        </p>
      </div>
      {demoMode ? (
        <p className="text-xs text-muted-foreground">
          Example of how your locations will appear. Connecting unlocks once
          Google grants API access.
        </p>
      ) : null}
      {locations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This account has no locations.
        </p>
      ) : (
        <ul className="space-y-2">
          {locations.map((loc) => {
            const already = alreadyConnectedSourceIds.has(loc.name);
            return (
              <li
                key={loc.name}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{loc.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[
                      loc.storefrontAddress?.locality,
                      loc.storefrontAddress?.administrativeArea,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Address unavailable"}
                  </p>
                </div>
                {already ? (
                  <span className="text-xs text-muted-foreground">
                    Connected
                  </span>
                ) : demoMode ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled
                    title="Available once Google grants API access"
                  >
                    Pending approval
                  </Button>
                ) : (
                  <form action={connectLocationAction}>
                    <input
                      type="hidden"
                      name="account"
                      value={accountName}
                    />
                    <input type="hidden" name="location" value={loc.name} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      disabled={atQuota}
                    >
                      {atQuota ? "Quota reached" : "Connect"}
                    </Button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
