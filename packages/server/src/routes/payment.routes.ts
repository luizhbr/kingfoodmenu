import { Router } from 'express';
import express from 'express';
import { optionalAuth, authenticate, requireStaff, requireRole } from '../middleware/auth.js';
import { createPaymentIntent, createCheckoutSession, handleWebhook, markCashPayment, createPayPalPayment, capturePayPalPayment, refundPayment } from '../controllers/payment.controller.js';

const router = Router();

// Stripe webhook needs raw body
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// PaymentIntent (mobile app — flutter_stripe PaymentSheet)
router.post('/create-intent', optionalAuth, createPaymentIntent);

// Checkout Session (website — hosted Stripe page)
router.post('/create-checkout-session', optionalAuth, createCheckoutSession);

// Mark cash payment (staff only)
router.post('/cash', authenticate, requireStaff, markCashPayment);

// Refund (MANAGER+)
router.post('/refund', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), refundPayment);

// PayPal
router.post('/paypal/create', optionalAuth, createPayPalPayment);
router.post('/paypal/capture', optionalAuth, capturePayPalPayment);

export default router;
