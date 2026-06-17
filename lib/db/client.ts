import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { resolveDatabaseUrl } from "./url";

type DbClient = ReturnType<typeof postgres>;
type DbInstance = ReturnType<typeof drizzle>;

// In serverless runtimes we want a small pool; locally we want HMR safety.
const globalForDb = globalThis as unknown as {
  client?: DbClient;
  db?: DbInstance;
};

function createClient(): DbClient {
  const url = resolveDatabaseUrl();
  return postgres(url, {
    max: 5,
    idle_timeout: 20,
    prepare: false, // Supabase pooler (PgBouncer transaction mode) requires this
  });
}

function getDb(): DbInstance {
  if (globalForDb.db) return globalForDb.db;

  const client =
    process.env.NODE_ENV !== "production"
      ? (globalForDb.client ?? createClient())
      : createClient();

  if (process.env.NODE_ENV !== "production") {
    globalForDb.client = client;
  }

  const instance = drizzle(client, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.db = instance;
  }

  return instance;
}

// Lazy proxy prevents build-time crashes if DB env vars are intentionally
// unavailable during static analysis.
export const db = new Proxy({} as DbInstance, {
  get(_target, prop, receiver) {
    const instance = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export { schema };
