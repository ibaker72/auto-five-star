import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const STATE_TTL_MS = 10 * 60 * 1000;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("ENCRYPTION_KEY required for OAuth state signing");
  }
  return Buffer.from(hex, "hex");
}

export type OAuthIntent = "google_gbp";

export type OAuthStatePayload = {
  intent: OAuthIntent;
  orgId: string;
  userId: string;
};

type FullState = OAuthStatePayload & { nonce: string; exp: number };

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? 0 : 4 - (s.length % 4);
  const b64 =
    s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  return Buffer.from(b64, "base64");
}

export function signOAuthState(payload: OAuthStatePayload): string {
  const full: FullState = {
    ...payload,
    nonce: randomBytes(8).toString("hex"),
    exp: Date.now() + STATE_TTL_MS,
  };
  const body = base64url(Buffer.from(JSON.stringify(full), "utf8"));
  const sig = base64url(
    createHmac("sha256", getKey()).update(body).digest(),
  );
  return `${body}.${sig}`;
}

export function verifyOAuthState(token: string): OAuthStatePayload {
  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new Error("Malformed OAuth state");
  }
  const [body, sig] = parts as [string, string];
  const expected = base64url(
    createHmac("sha256", getKey()).update(body).digest(),
  );
  const sigBuf = base64urlDecode(sig);
  const expBuf = base64urlDecode(expected);
  if (
    sigBuf.length !== expBuf.length ||
    !timingSafeEqual(sigBuf, expBuf)
  ) {
    throw new Error("OAuth state signature mismatch");
  }
  const decoded = JSON.parse(base64urlDecode(body).toString("utf8")) as FullState;
  if (typeof decoded.exp !== "number" || decoded.exp < Date.now()) {
    throw new Error("OAuth state expired");
  }
  return {
    intent: decoded.intent,
    orgId: decoded.orgId,
    userId: decoded.userId,
  };
}
