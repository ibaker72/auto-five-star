import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { integrationTokens, type IntegrationToken } from "@/lib/db/schema";
import { decryptFromString, encryptToString } from "@/lib/crypto";
import { gbpScopes, refreshAccessToken } from "./google";

export class GoogleNotConnectedError extends Error {
  constructor(orgId: string) {
    super(`Google Business Profile not connected for org ${orgId}`);
    this.name = "GoogleNotConnectedError";
  }
}

export class GoogleRefreshError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleRefreshError";
  }
}

const REFRESH_LEEWAY_MS = 60_000;

/**
 * Persist tokens for the given org. Upserts on (org_id, provider="google").
 * Encrypts both access and refresh tokens at rest using AES-256-GCM.
 */
export async function saveGoogleTokens(params: {
  orgId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresIn: number;
  scope?: string | null;
  accountEmail?: string | null;
}): Promise<void> {
  const expiresAt = new Date(Date.now() + params.expiresIn * 1000);
  const encAccess = encryptToString(params.accessToken);
  const encRefresh = params.refreshToken
    ? encryptToString(params.refreshToken)
    : null;
  const scope = params.scope ?? gbpScopes.join(" ");

  await db
    .insert(integrationTokens)
    .values({
      orgId: params.orgId,
      provider: "google",
      accessTokenEnc: encAccess,
      refreshTokenEnc: encRefresh,
      scope,
      expiresAt,
      accountEmail: params.accountEmail ?? null,
    })
    .onConflictDoUpdate({
      target: [integrationTokens.orgId, integrationTokens.provider],
      set: {
        accessTokenEnc: encAccess,
        // Only overwrite refresh token if we received a new one (Google omits
        // it on subsequent consents unless prompt=consent re-grants).
        refreshTokenEnc: encRefresh
          ? encRefresh
          : sql`${integrationTokens.refreshTokenEnc}`,
        scope,
        expiresAt,
        accountEmail: params.accountEmail ?? null,
        updatedAt: new Date(),
      },
    });
}

export async function getGoogleIntegrationRow(
  orgId: string,
): Promise<IntegrationToken | null> {
  const rows = await db
    .select()
    .from(integrationTokens)
    .where(
      and(
        eq(integrationTokens.orgId, orgId),
        eq(integrationTokens.provider, "google"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Returns the connected Google account email, or null if not connected.
 * Cheap status check that does NOT decrypt tokens.
 */
export async function getGoogleConnectionStatus(
  orgId: string,
): Promise<{ connected: boolean; accountEmail: string | null; connectedAt: Date | null }> {
  const row = await getGoogleIntegrationRow(orgId);
  if (!row) return { connected: false, accountEmail: null, connectedAt: null };
  return {
    connected: true,
    accountEmail: row.accountEmail,
    connectedAt: row.createdAt,
  };
}

export async function disconnectGoogle(orgId: string): Promise<void> {
  await db
    .delete(integrationTokens)
    .where(
      and(
        eq(integrationTokens.orgId, orgId),
        eq(integrationTokens.provider, "google"),
      ),
    );
}

/**
 * Returns a valid (non-expired) Google access token for the org, refreshing
 * via the refresh token if needed. Persists the refreshed access token.
 *
 * Throws GoogleNotConnectedError if no integration row exists.
 * Throws GoogleRefreshError if refresh fails (caller should prompt reconnect).
 */
export async function getValidGoogleAccessToken(
  orgId: string,
): Promise<string> {
  const row = await getGoogleIntegrationRow(orgId);
  if (!row) throw new GoogleNotConnectedError(orgId);

  const expiresAtMs = row.expiresAt?.getTime() ?? 0;
  const stillValid = expiresAtMs > Date.now() + REFRESH_LEEWAY_MS;
  if (stillValid) {
    return decryptFromString(row.accessTokenEnc);
  }

  if (!row.refreshTokenEnc) {
    throw new GoogleRefreshError(
      "Google session expired and no refresh token is stored. Reconnect required.",
    );
  }

  const refreshToken = decryptFromString(row.refreshTokenEnc);
  try {
    const refreshed = await refreshAccessToken(refreshToken);
    await db
      .update(integrationTokens)
      .set({
        accessTokenEnc: encryptToString(refreshed.accessToken),
        expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(integrationTokens.orgId, orgId),
          eq(integrationTokens.provider, "google"),
        ),
      );
    return refreshed.accessToken;
  } catch (err) {
    throw new GoogleRefreshError(
      err instanceof Error ? err.message : String(err),
    );
  }
}
