import "server-only";
import { PostHog } from "posthog-node";

const globalForPostHog = globalThis as unknown as { posthog?: PostHog };

function createClient(): PostHog {
  return new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "", {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    enableExceptionAutocapture: true,
  });
}

export function getPostHog(): PostHog {
  if (!globalForPostHog.posthog) {
    globalForPostHog.posthog = createClient();
  }
  return globalForPostHog.posthog;
}

export const posthog = new Proxy({} as PostHog, {
  get(_target, prop, receiver) {
    const client = getPostHog() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
