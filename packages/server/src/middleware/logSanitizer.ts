import { Request, Response, NextFunction } from 'express';

/**
 * Log Sanitization Middleware
 *
 * Redacts sensitive fields from request bodies before they reach the logger.
 * This is applied before httpLogger so that logged request bodies are clean.
 *
 * Sensitive fields redacted:
 *  - password, passwordHash, confirmPassword
 *  - token, accessToken, refreshToken, clientSecret
 *  - creditCard, cardNumber, cvv, expiryDate
 *  - apiKey, secret, authorization (redundant with header)
 */

const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordHash',
  'confirmPassword',
  'newPassword',
  'token',
  'accessToken',
  'refreshToken',
  'clientSecret',
  'creditCard',
  'cardNumber',
  'cvv',
  'expiryDate',
  'apiKey',
  'secret',
  'smtpPass',
  'smtpPassword',
  'TWILIO_AUTH_TOKEN',
  'STRIPE_SECRET_KEY',
  'JWT_SECRET',
  'WEBHOOK_SECRET',
  'CSRF_SECRET',
]);

const REDACTED = '[REDACTED]';

function sanitizeObject(obj: unknown, depth = 0): unknown {
  if (depth > 5) return obj; // Prevent deep recursion
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_FIELDS.has(key)) {
        sanitized[key] = REDACTED;
      } else {
        sanitized[key] = sanitizeObject(value, depth + 1);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitizes request body to remove sensitive data before logging.
 * This middleware should be applied BEFORE httpLogger.
 */
export function sanitizeRequestBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    // Only sanitize JSON bodies, not raw bodies (e.g., Stripe webhooks)
    if (req.headers['content-type']?.includes('application/json')) {
      // Create a sanitized copy for logging purposes
      // The original req.body remains unchanged for controllers
      (req as any).__sanitizedBody = sanitizeObject(req.body);
    }
  }
  next();
}

/**
 * Export the sanitizer for use in ad-hoc logging.
 */
export { sanitizeObject };
