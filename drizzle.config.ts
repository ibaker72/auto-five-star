import type { Config } from "drizzle-kit";
import { resolveDatabaseUrl } from "./lib/db/url";

// drizzle-kit runs schema introspection / push / generate against a real DB
// only for the `push` and `studio` commands. We still need a URL for those
// flows. Resolution mirrors `lib/db/migrate.ts`: prefer the direct URL so we
// don't hit Supabase's pooler (PgBouncer transaction mode can't run DDL).
const url = resolveDatabaseUrl({ preferDirect: true });

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
} as Config;
