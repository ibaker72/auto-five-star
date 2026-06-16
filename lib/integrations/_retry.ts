/**
 * Retry an async function with exponential backoff.
 *
 * Retries on transient errors (HTTP 5xx and 429) by default. Pass a custom
 * `retryable` predicate for integration-specific logic. Never retries
 * authorization errors (401/403) — those need a token refresh, not a retry.
 */
export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  retryable?: (err: unknown) => boolean;
};

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export function isRetryableHttpError(err: unknown): boolean {
  if (err instanceof HttpError) {
    return err.status >= 500 || err.status === 429;
  }
  // Network errors generally retryable.
  return err instanceof TypeError;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 250,
    retryable = isRetryableHttpError,
  } = opts;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts || !retryable(err)) throw err;
      const jitter = Math.floor(Math.random() * baseDelayMs);
      const delay = baseDelayMs * 2 ** (attempt - 1) + jitter;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
