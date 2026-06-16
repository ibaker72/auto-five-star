import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { resolveDatabaseUrl } from "./url";

const url = resolveDatabaseUrl();

// In serverless runtimes we want a small pool; locally we want HMR safety.
const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.client ??
  postgres(url, {
    max: 5,
    idle_timeout: 20,
    prepare: false, // Supabase pooler (PgBouncer transaction mode) requires this
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });
export { schema };
