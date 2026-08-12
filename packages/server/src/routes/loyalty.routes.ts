import { Router } from 'express';
import { authenticate, requireStaff, requireRole } from '../middleware/auth.js';
import { getBalance, redeemPoints, adjustPoints } from '../controllers/loyalty.controller.js';

const router = Router();

// Customer endpoints — authenticate ensures they can only access their own
router.get('/balance', authenticate, getBalance);
router.post('/redeem', authenticate, redeemPoints);

// Staff endpoint — adjust points for a customer
router.post('/customers/:id/adjust', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), adjustPoints);

export default router;
