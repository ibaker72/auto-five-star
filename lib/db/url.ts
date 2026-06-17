/**
 * Database URL resolution.
 *
 * Selection order (runtime / pooler-preferred):
 *   1. DATABASE_URL                       (preferred; pooler URL in production)
 *   2. POSTGRES_PRISMA_URL                (Vercel/Supabase integration)
 *   3. POSTGRES_URL                       (Vercel/Supabase integration)
 *   4. DIRECT_URL                         (last-resort fallback)
 *   5. POSTGRES_URL_NON_POOLING           (last-resort fallback)
 *
 * Selection order (preferDirect — migrations only):
 *   1. DIRECT_URL
 *   2. POSTGRES_URL_NON_POOLING
 *   3. DATABASE_URL
 *   4. POSTGRES_PRISMA_URL
 *   5. POSTGRES_URL
 *
 * The runtime client must not accidentally use a direct connection unless
 * none of the pooler-style vars are set. Migrations must not run through
 * the pooler unless no direct URL is available.
 *
 * On first resolution we log a redacted summary (host, host class, source
 * env var, and a username pattern) so a misconfigured URL can be spotted in
 * Vercel runtime logs without leaking credentials.
 */
type ResolveDatabaseUrlOptions = {
  preferDirect?: boolean;
};

const RUNTIME_URL_CANDIDATES = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "DIRECT_URL",
  "POSTGRES_URL_NON_POOLING",
] as const;

const DIRECT_URL_CANDIDATES = [
  "DIRECT_URL",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
] as const;

type EnvCandidate =
  | (typeof RUNTIME_URL_CANDIDATES)[number]
  | (typeof DIRECT_URL_CANDIDATES)[number];

const hasIpLikeHost = (host: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(host);

function pickEnvUrl(
  candidates: readonly EnvCandidate[],
): { source: EnvCandidate; raw: string } | null {
  for (const name of candidates) {
    const value = process.env[name]?.trim();
    if (value) return { source: name, raw: value };
  }
  return null;
}

function deriveSupabaseProjectRef(): string | null {
  const explicit = process.env.SUPABASE_PROJECT_REF?.trim();
  if (explicit) return explicit;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  try {
    const parsed = new URL(supabaseUrl);
    const [projectRef] = parsed.hostname.split(".");
    return projectRef?.trim() || null;
  } catch {
    return null;
  }
}

function withSupabasePoolerTenantIdentifier(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const host = parsed.hostname.toLowerCase();
  const isSupabasePooler = host.endsWith(".pooler.supabase.com");
  if (!isSupabasePooler) return url;

  const username = decodeURIComponent(parsed.username);
  // Supabase pooler expects postgres.<project-ref> (or another role with suffix).
  if (!username || username.includes(".")) return url;

  const projectRef = deriveSupabaseProjectRef();
  if (!projectRef) return url;

  parsed.username = encodeURIComponent(`${username}.${projectRef}`);
  return parsed.toString();
}

function withNeonTenantIdentifier(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const host = parsed.hostname.toLowerCase();
  const isNeonHost = host.endsWith(".neon.tech") || host.endsWith(".neon.build") || host.endsWith(".neon.dev");
  const username = decodeURIComponent(parsed.username);
  const hasUsernameIdentifier = username.includes("@");

  const options = parsed.searchParams.get("options");
  const decodedOptions = options ? decodeURIComponent(options) : "";
  const hasProjectOption = /(^|\s)project=/.test(decodedOptions);

  // Neon requires either an external identifier (project=...) or SNI host data.
  // If host is an IP and no identifier is present, we can inject project id.
  if ((isNeonHost || hasIpLikeHost(host)) && !hasUsernameIdentifier && !hasProjectOption) {
    const projectId = process.env.NEON_PROJECT_ID?.trim();
    if (!projectId) return url;

    const nextOptions = decodedOptions ? `${decodedOptions} project=${projectId}` : `project=${projectId}`;
    parsed.searchParams.set("options", nextOptions);
    return parsed.toString();
  }

  return url;
}

type HostClass =
  | "supabase-pooler"
  | "supabase-direct"
  | "neon"
  | "ip-literal"
  | "other";

function classifyHost(host: string): HostClass {
  const h = host.toLowerCase();
  if (h.endsWith(".pooler.supabase.com")) return "supabase-pooler";
  if (h.endsWith(".supabase.co")) return "supabase-direct";
  if (h.endsWith(".neon.tech") || h.endsWith(".neon.build") || h.endsWith(".neon.dev")) return "neon";
  if (hasIpLikeHost(h)) return "ip-literal";
  return "other";
}

function redactedUsernamePattern(username: string): string {
  if (!username) return "<empty>";
  const [head] = username.split(".");
  if (!head) return "<empty>";
  return username.includes(".") ? `${head}.<ref>` : head;
}

const RESOLUTION_LOG_KEY = Symbol.for("autofivestar.db.resolution-logged");

type ResolutionLogState = { runtime?: boolean; direct?: boolean };

function logResolution(
  kind: "runtime" | "direct",
  info: { source: EnvCandidate; resolved: string },
): void {
  if (process.env.SKIP_DB_RESOLUTION_LOG === "true") return;

  const store = globalThis as Record<symbol, ResolutionLogState | undefined>;
  const state = (store[RESOLUTION_LOG_KEY] ??= {}) as ResolutionLogState;
  if (state[kind]) return;
  state[kind] = true;

  let host = "<unparsable>";
  let port = "<default>";
  let hostClass: HostClass = "other";
  let usernamePattern = "<unknown>";
  let sslmode = "<unspecified>";

  try {
    const parsed = new URL(info.resolved);
    host = parsed.hostname;
    port = parsed.port || "<default>";
    hostClass = classifyHost(host);
    usernamePattern = redactedUsernamePattern(decodeURIComponent(parsed.username));
    sslmode = parsed.searchParams.get("sslmode") ?? "<unspecified>";
  } catch {
    /* fall through with defaults */
  }

  console.log(
    `[db] ${kind} URL resolved | source=${info.source} ` +
      `host=${host} port=${port} class=${hostClass} ` +
      `user=${usernamePattern} sslmode=${sslmode}`,
  );
}

export function resolveDatabaseUrl(options: ResolveDatabaseUrlOptions = {}): string {
  const kind: "runtime" | "direct" = options.preferDirect ? "direct" : "runtime";
  const candidates = options.preferDirect ? DIRECT_URL_CANDIDATES : RUNTIME_URL_CANDIDATES;
  const picked = pickEnvUrl(candidates);

  if (!picked) {
    throw new Error(
      `No database URL found for ${kind} client. Set one of: ${candidates.join(", ")}.`,
    );
  }

  const resolved = withNeonTenantIdentifier(
    withSupabasePoolerTenantIdentifier(picked.raw),
  );

  logResolution(kind, { source: picked.source, resolved });

  return resolved;
}

/**
 * Exported for diagnostics/tests. Returns the source env var name and the
 * fully transformed URL, without logging. Do not pass the resolved URL to
 * logs or error messages — it still contains the password.
 */
export function describeDatabaseUrlForDiagnostics(
  options: ResolveDatabaseUrlOptions = {},
): {
  source: EnvCandidate;
  host: string;
  port: string;
  hostClass: HostClass;
  usernamePattern: string;
} | null {
  const candidates = options.preferDirect ? DIRECT_URL_CANDIDATES : RUNTIME_URL_CANDIDATES;
  const picked = pickEnvUrl(candidates);
  if (!picked) return null;
  const resolved = withNeonTenantIdentifier(
    withSupabasePoolerTenantIdentifier(picked.raw),
  );
  try {
    const parsed = new URL(resolved);
    return {
      source: picked.source,
      host: parsed.hostname,
      port: parsed.port || "<default>",
      hostClass: classifyHost(parsed.hostname),
      usernamePattern: redactedUsernamePattern(decodeURIComponent(parsed.username)),
    };
  } catch {
    return null;
  }
}
