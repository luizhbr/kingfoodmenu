// ── Adaptive CAPTCHA / anti-automation service ───────────────────────────────
// Provider: Cloudflare Turnstile (managed mode)
//
// Design rules:
//  - Server-side verification ONLY. The frontend sends the provider token;
//    the server validates it directly with Cloudflare. A boolean like
//    `captchaPassed` from the client is NEVER trusted.
//  - Adaptive: normal logins are unaffected. After repeated failures the
//    risk level rises and CAPTCHA becomes required.
//  - Fail-safe: if the provider is unreachable we FAIL CLOSED for
//    authentication (login rejected with a generic message) rather than
//    silently allowing automated abuse.
//  - CAPTCHA_ENABLED=false (default) keeps the system fully functional
//    until the operator provisions real Cloudflare keys. Nothing in this
//    file changes behaviour when disabled.

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type RiskLevel = 0 | 1 | 2 | 3;

interface RiskEntry {
  failures: number;
  firstFailure: number;
  lockedUntil: number;
}

// In-memory risk store. Production could swap this for Redis/DB, but the
// in-memory map is per-instance and sufficient for the current Vercel
// serverless footprint (auth limiter already bounds abuse per window).
const riskStore = new Map<string, RiskEntry>();
const RISK_TTL_MS = 15 * 60 * 1000; // 15 min window
const LOCKOUT_MS = 30 * 60 * 1000; // level 3: 30 min lockout

export function isCaptchaEnabled(): boolean {
  return (
    process.env.CAPTCHA_ENABLED === 'true' &&
    !!process.env.CAPTCHA_SITE_KEY &&
    !!process.env.CAPTCHA_SECRET_KEY
  );
}

export function getCaptchaSiteKey(): string | null {
  return process.env.CAPTCHA_SITE_KEY || null;
}

function riskKey(email: string, ip: string): string {
  return `${ip}|${email.toLowerCase().trim()}`;
}

function prune() {
  const now = Date.now();
  for (const [k, v] of riskStore) {
    if (now - v.firstFailure > RISK_TTL_MS && now > v.lockedUntil) riskStore.delete(k);
  }
}

/** Increment failure counter for (email, ip). Returns the new level. */
export function recordAuthFailure(email: string, ip: string): RiskLevel {
  prune();
  const key = riskKey(email, ip);
  const now = Date.now();
  const entry = riskStore.get(key) ?? { failures: 0, firstFailure: now, lockedUntil: 0 };
  // if lockout active and not expired, stay locked
  if (entry.lockedUntil > now) return 3;
  entry.failures += 1;
  if (entry.failures >= 10) {
    entry.lockedUntil = now + LOCKOUT_MS;
    entry.failures = 0; // reset counter, lockout governs now
  }
  riskStore.set(key, entry);
  return levelFor(entry);
}

/** Clear the failure counter on successful authentication. */
export function recordAuthSuccess(email: string, ip: string): void {
  prune();
  riskStore.delete(riskKey(email, ip));
}

export function getRiskLevel(email: string, ip: string): RiskLevel {
  prune();
  const entry = riskStore.get(riskKey(email, ip));
  if (!entry) return 0;
  if (entry.lockedUntil > Date.now()) return 3;
  return levelFor(entry);
}

function levelFor(entry: RiskEntry): RiskLevel {
  if (entry.failures >= 6) return 2;
  if (entry.failures >= 3) return 1;
  return 0;
}

export interface CaptchaResult {
  success: boolean;
  reason?: string;
  providerError?: boolean;
}

/**
 * Verify a Turnstile token directly with Cloudflare.
 * Never trusts client-supplied booleans.
 */
export async function verifyCaptchaToken(token: string, remoteIp?: string): Promise<CaptchaResult> {
  if (!token || typeof token !== 'string') {
    return { success: false, reason: 'missing-token' };
  }
  if (!isCaptchaEnabled()) {
    // When the layer is disabled there is nothing to verify; callers gate
    // on isCaptchaEnabled() before invoking this path, so this branch is a
    // defensive no-op for disabled state.
    return { success: true };
  }
  const secret = process.env.CAPTCHA_SECRET_KEY!;
  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  body.set('remoteip', remoteIp || '');

  let resp: Response;
  try {
    resp = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return { success: false, reason: 'provider-unreachable', providerError: true };
  }

  if (!resp.ok) {
    return { success: false, reason: 'provider-error', providerError: true };
  }

  let data: any;
  try {
    data = await resp.json();
  } catch {
    return { success: false, reason: 'provider-invalid-response', providerError: true };
  }

  if (data?.success === true) {
    return { success: true };
  }
  const codes: string[] = Array.isArray(data?.['error-codes']) ? data['error-codes'] : [];
  const reason =
    codes.includes('timeout-or-duplicate') ? 'token-reused-or-expired'
    : codes.includes('invalid-input-response') ? 'token-invalid'
    : codes.includes('missing-input-response') ? 'token-missing'
    : 'verification-failed';
  return { success: false, reason };
}

/**
 * Decide whether CAPTCHA is required for this login attempt.
 * Level 0: normal login. Level 1+: CAPTCHA required.
 * Level 3: temporary lockout — reject regardless (CAPTCHA alone cannot
 * unlock during the lockout window).
 */
export function captchaPolicy(level: RiskLevel): { required: boolean; lockedOut: boolean } {
  if (level >= 3) return { required: true, lockedOut: true };
  if (level >= 1) return { required: true, lockedOut: false };
  return { required: false, lockedOut: false };
}
