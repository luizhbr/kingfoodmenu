// ── King Print Agent — retry with exponential backoff ───────────────────────

export interface RetryOptions {
  baseMs: number;
  maxMs: number;
  maxAttempts: number;
  jitter?: boolean;
}

export function backoffDelay(attempt: number, opts: RetryOptions): number {
  const exp = Math.min(opts.maxMs, opts.baseMs * Math.pow(2, Math.max(0, attempt - 1)));
  if (opts.jitter === false) return exp;
  return Math.floor(exp * (0.5 + Math.random() * 0.5));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
  shouldRetry: (err: unknown) => boolean = () => true,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    attempt += 1;
    try {
      return await fn();
    } catch (err) {
      if (attempt >= opts.maxAttempts || !shouldRetry(err)) throw err;
      const delay = backoffDelay(attempt, opts);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
