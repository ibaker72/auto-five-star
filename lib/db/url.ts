type ResolveDatabaseUrlOptions = {
  preferDirect?: boolean;
};

const hasIpLikeHost = (host: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(host);

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

export function resolveDatabaseUrl(options: ResolveDatabaseUrlOptions = {}): string {
  const raw = options.preferDirect
    ? process.env.DIRECT_URL ?? process.env.DATABASE_URL
    : process.env.DATABASE_URL ?? process.env.DIRECT_URL;

  if (!raw) {
    throw new Error("DATABASE_URL or DIRECT_URL must be set");
  }

  return withNeonTenantIdentifier(withSupabasePoolerTenantIdentifier(raw));
}
