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
        {props.error ? (
          <Alert variant="destructive">
            <AlertTitle>Connection error</AlertTitle>
            <AlertDescription>{props.error}</AlertDescription>
          </Alert>
        ) : null}

        <AccountPicker
          accounts={props.accounts}
          selectedAccount={props.selectedAccount}
        />

        {props.selectedAccount ? (
          <LocationPicker
            accountName={props.selectedAccount}
            locations={props.locations}
            alreadyConnectedSourceIds={props.alreadyConnectedSourceIds}
            quota={props.quota}
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

function AccountPicker({
  accounts,
  selectedAccount,
}: {
  accounts: GbpAccount[];
  selectedAccount: string | null;
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
      <p className="text-sm font-medium">Choose an account</p>
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
}: {
  accountName: string;
  locations: GbpLocation[];
  alreadyConnectedSourceIds: Set<string>;
  quota: { used: number; limit: number };
}) {
  const atQuota = quota.used >= quota.limit;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">Locations under this account</p>
        <p className="text-xs text-muted-foreground">
          {quota.used} / {quota.limit} locations used
        </p>
      </div>
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
