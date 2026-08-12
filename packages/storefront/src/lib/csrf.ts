/**
 * CSRF helper for the storefront SPA.
 *
 * The server mounts csrfProtection globally (app.ts): every state-changing
 * request without an Authorization: Bearer header must include an
 * X-CSRF-Token header matching the _csrf cookie (double-submit pattern).
 *
 * The server exposes GET /api/csrf-token which sets the _csrf cookie and
 * returns the token. This helper fetches it once, caches it, and attaches
 * it to outgoing requests.
 */
const API_BASE = import.meta.env.VITE_API_URL || '';

let csrfPromise: Promise<string | null> | null = null;

export function getCsrfToken(): Promise<string | null> {
  if (!csrfPromise) {
    csrfPromise = fetch(`${API_BASE}/api/csrf-token`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => (data?.success ? (data.data.csrfToken as string) : null))
      .catch(() => null);
    // Allow retry after failure
    csrfPromise.catch(() => {
      csrfPromise = null;
    });
  }
  return csrfPromise;
}

/**
 * Returns extra headers for a state-changing request. Safe methods and
 * Bearer-authenticated requests do not need CSRF, but sending the header
 * when available is harmless and keeps the client uniform.
 */
export async function withCsrf(headers: Record<string, string>): Promise<Record<string, string>> {
  const token = await getCsrfToken();
  if (token) {
    headers['X-CSRF-Token'] = token;
  }
  return headers;
}
