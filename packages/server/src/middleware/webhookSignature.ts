import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Webhook Signature Verification Middleware
 *
 * Verifies HMAC-SHA256 signatures on incoming webhook requests.
 * The sender must include an X-Webhook-Signature header containing
 * the HMAC-SHA256 of the request body, using a shared WEBHOOK_SECRET.
 *
 * Usage: app.use('/api/automation-rules/webhook', verifyWebhookSignature);
 */

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

/**
 * Verify that the X-Webhook-Signature header matches the HMAC-SHA256
 * of the raw request body.
 */
export function verifyWebhookSignature(req: Request, res: Response, next: NextFunction): void {
  // Fail closed if WEBHOOK_SECRET is not configured
  if (!WEBHOOK_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[security] WEBHOOK_SECRET not set in production — rejecting webhook request');
      res.status(401).json({ success: false, error: 'Invalid webhook signature' });
      return;
    }
    // In dev/test, we allow the request to pass through (for local testing only)
    console.warn('[webhook] WEBHOOK_SECRET not set — skipping signature verification (dev mode only)');
    return next();
  }

  const signature = req.headers['x-webhook-signature'] as string | undefined;

  if (!signature) {
    res.status(401).json({
      success: false,
      error: 'Missing X-Webhook-Signature header',
    });
    return;
  }

  // Get raw body — this middleware must be registered after express.json()
  // For pre-parsed JSON bodies, we need to re-serialize deterministically
  const body = typeof req.body === 'object' && req.body !== null
    ? JSON.stringify(req.body)
    : (req.body as string);

  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      res.status(401).json({
        success: false,
        error: 'Invalid webhook signature',
      });
      return;
    }
  } catch {
    res.status(401).json({
      success: false,
      error: 'Invalid webhook signature',
    });
    return;
  }

  next();
}

/**
 * Utility to generate webhook signatures for outbound requests.
 */
export function signWebhookPayload(body: string): string {
  if (!WEBHOOK_SECRET) return '';
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
}
