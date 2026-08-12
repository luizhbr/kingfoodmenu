/**
 * CSRF helper for the Admin SPA.
 *
 * The server mounts csrfProtection globally (app.ts): every state-changing
 * request without an Authorization: Bearer header must include an
 * X-CSRF-Token header matching the _csrf cookie (double-submit pattern).
 *
 * GET /api/csrf-token sets the _csrf cookie and returns the token.
 * The admin only needs this for the login POST (all other requests carry
 * a Bearer token, which csrfProtection skips).
 */
let csrfPromise: Promise<string | null> | null = null;

export function getCsrfToken(): Promise<string | null> {
  if (!csrfPromise) {
    csrfPromise = fetch('/api/csrf-token', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => (data?.success ? (data.data.csrfToken as string) : null))
      .catch(() => null);
    csrfPromise.catch(() => {
      csrfPromise = null;
    });
  }
  return csrfPromise;
}

export async function withCsrf(headers: Record<string, string>): Promise<Record<string, string>> {
  const token = await getCsrfToken();
  if (token) {
    headers['X-CSRF-Token'] = token;
  }
  return headers;
}
