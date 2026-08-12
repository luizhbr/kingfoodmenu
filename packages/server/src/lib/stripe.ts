import Stripe from 'stripe';
import prisma from './db.js';

let cachedStripe: Stripe | null = null;
let cachedKey: string = '';

/**
 * Resolve the Stripe secret key. Fail-fast: in production a missing key
 * returns null (callers must fail closed) — never a fake placeholder.
 * In dev/test a placeholder exists ONLY to keep unit tests that don't
 * touch Stripe from crashing; it can never reach production.
 */
export function resolveStripeSecretKey(): string | null {
  const fromEnv = process.env.STRIPE_SECRET_KEY;
  if (fromEnv) return fromEnv;
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) return null; // caller must fail closed
  return 'sk_test_placeholder_for_unit_tests_only'; // dev/test only
}

export async function getStripe(): Promise<Stripe> {
  const resolved = resolveStripeSecretKey();
  if (!resolved) {
    throw new Error('STRIPE_SECRET_KEY is not configured. Stripe payments are disabled until a key is provided.');
  }
  let secretKey: string = resolved;

  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const payment = (settings?.paymentSettings as Record<string, any>) || {};
    if (payment.stripeSecretKey) {
      secretKey = payment.stripeSecretKey;
    }
  } catch {
    // DB unavailable — fall back to env var
  }

  if (cachedStripe && cachedKey === secretKey) {
    return cachedStripe;
  }

  cachedStripe = new Stripe(secretKey, {
    apiVersion: '2026-01-28.clover',
  });
  cachedKey = secretKey;

  return cachedStripe;
}

// Default export for backwards compatibility.
// Lazy via Proxy: instantiating Stripe (and failing on a missing key) is
// deferred until the default export is actually USED — importing this
// module must never crash the whole app in production when Stripe is
// simply not configured yet.
let defaultStripeInstance: Stripe | null = null;
function createDefaultStripe(): Stripe {
  const key = resolveStripeSecretKey();
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured. Stripe payments are disabled until a key is provided.');
  }
  return new Stripe(key, { apiVersion: '2026-01-28.clover' });
}
export default new Proxy({} as Stripe, {
  get(_target, prop) {
    if (!defaultStripeInstance) defaultStripeInstance = createDefaultStripe();
    return (defaultStripeInstance as any)[prop];
  },
});
