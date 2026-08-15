import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import printRoutes from './routes/print.routes.js';
import printTemplateRoutes from './routes/print-template.routes.js';
import locationRoutes from './routes/location.routes.js';
import deliveryRoutes from './routes/delivery.routes.js';
import menuRoutes from './routes/menu.routes.js';
import orderRoutes from './routes/order.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import reservationRoutes from './routes/reservation.routes.js';
import couponRoutes from './routes/coupon.routes.js';
import reviewRoutes from './routes/review.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import automationRoutes from './routes/automation.routes.js';
import loyaltyRoutes from './routes/loyalty.routes.js';
import legalRoutes from './routes/legal.routes.js';
import consentRoutes from './routes/consent.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import staffRoutes from './routes/staff.routes.js';
import developerRoutes from './routes/developer.routes.js';
import galleryRoutes from './routes/gallery.routes.js';
import mediaRoutes from './routes/media.routes.js';
import trackingRoutes from './routes/tracking.routes.js';
import customerRoutes from './routes/customer.routes.js';
import cashbackRoutes from './routes/cashback.routes.js';
import driverRoutes from './routes/driver.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import qrcodeRoutes from './routes/qrcode.routes.js';
import { openApiSpec } from './lib/openapi.js';
import { initPassport } from './lib/passport.js';
import passport from 'passport';
import logger from './lib/logger.js';
import { requestId } from './middleware/requestId.js';
import { httpLogger } from './middleware/httpLogger.js';
import { sanitizeRequestBody } from './middleware/logSanitizer.js';
import { metricsCollector } from './middleware/metricsCollector.js';
import { csrfProtection, csrfTokenHandler } from './middleware/csrf.js';
import { verifyWebhookSignature } from './middleware/webhookSignature.js';

// Initialize automation event listeners
import './lib/events.js';

// Start metric cleanup cron
import './lib/metricCleanup.js';

dotenv.config();

export function createApp() {
  const app = express();

  // ── Security headers (enhanced Helmet) ────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.stripe.com'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: process.env.NODE_ENV === 'production'
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  }));

  // ── CORS ──────────────────────────────────────────────────────────────
  app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  }));

  // ── Request ID & HTTP logging ─────────────────────────────────────────
  app.use(requestId);
  // Sanitize request bodies before logging (prevents sensitive data in logs)
  app.use(sanitizeRequestBody);

  if (process.env.NODE_ENV !== 'test') {
    app.use(httpLogger);
  }

  // ── Health check (before rate limiter so probes always work) ───────────
  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  });

  // ── Rate limiting (tiered) ────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'test') {
    // General API: 300 requests per minute
    const apiLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Too many requests, please try again later.' },
    });
    app.use('/api/', apiLimiter);

    // Auth routes: 100 requests per 15 minutes
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Too many authentication attempts. Please try again later.' },
    });
    app.use('/api/auth/', authLimiter);

    // Password reset / staff registration: 10 requests per minute
    const strictLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Too many attempts. Please try again later.' },
    });
    app.use('/api/auth/staff/register', strictLimiter);
    app.use('/api/auth/staff/login', strictLimiter);
  }

  // ── Webhook signature verification ────────────────────────────────────
  // Stripe webhook uses its own signature verification (raw body)
  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

  // WhatsApp webhook signature verification
  app.use('/api/automation-rules/webhook', verifyWebhookSignature);

  // ── Body parsing ──────────────────────────────────────────────────────
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── Cookie parser (needed for CSRF double-submit pattern) ────────────
  app.use(cookieParser());

  // ── CSRF protection (skip for API-only routes using Bearer auth) ──────
  // CSRF token endpoint for browser-based forms
  app.get('/api/csrf-token', csrfTokenHandler);
  // Apply CSRF to state-changing methods; skip if Authorization: Bearer header present
  app.use(csrfProtection);

  // ── Passport (social login) ───────────────────────────────────────────
  initPassport();
  app.use(passport.initialize());

  // ── Metrics collection ────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'test') {
    app.use(metricsCollector);
  }

  // ── Static files ──────────────────────────────────────────────────────
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // ── API Documentation ─────────────────────────────────────────────────
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'KitchenAsty API Documentation',
  }));

  app.get('/api/openapi.json', (_req, res) => {
    res.json(openApiSpec);
  });

  // ── Routes ────────────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/locations', locationRoutes);
  app.use('/api/delivery', deliveryRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/coupons', couponRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/automation-rules', automationRoutes);
  app.use('/api/loyalty', loyaltyRoutes);
  app.use('/api/legal', legalRoutes);
  app.use('/api/consent', consentRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/developer', developerRoutes);
  app.use('/api/gallery', galleryRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/tracking', trackingRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/cashback', cashbackRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/reports', reportsRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/qrcodes', qrcodeRoutes);
  app.use('/api/print', printRoutes);
app.use('/api/admin/print/templates', printTemplateRoutes);

  // ── 404 handler ───────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: 'Not Found',
    });
  });

  // ── Error handler ─────────────────────────────────────────────────────
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, 'Unhandled error');
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    });
  });

  return app;
}
