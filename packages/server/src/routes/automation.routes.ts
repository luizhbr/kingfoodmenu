import { Router } from 'express';
import {
  listAutomationRules,
  getAutomationRule,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
} from '../controllers/automation.controller.js';
import { authenticate, requireStaff, requireRole } from '../middleware/auth.js';
import { verifyWebhookSignature } from '../middleware/webhookSignature.js';

const router = Router();

// Webhook endpoint for incoming automation triggers (signature-verified)
router.post('/webhook', verifyWebhookSignature, (req, res) => {
  // Webhook handler will be implemented by automation controller
  // For now, acknowledge receipt — the event system processes asynchronously
  res.json({ success: true, message: 'Webhook received' });
});

// CRUD — staff only
router.get('/', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), listAutomationRules);
router.get('/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), getAutomationRule);
router.post('/', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), createAutomationRule);
router.patch('/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), updateAutomationRule);
router.delete('/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN'), deleteAutomationRule);

export default router;
