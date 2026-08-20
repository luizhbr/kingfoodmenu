import { Router } from 'express';
import { authenticate, requireStaff, requireRole } from '../middleware/auth.js';
import {
  getBalance,
  redeemPoints,
  adjustPoints,
  listRewards,
  createReward,
  updateReward,
  deleteReward,
  redeemReward,
} from '../controllers/loyalty.controller.js';

const router = Router();

// Customer endpoints — authenticate ensures they can only access their own
router.get('/balance', authenticate, getBalance);
router.post('/redeem', authenticate, redeemPoints);
router.post('/rewards/redeem', authenticate, redeemReward);

// Staff endpoint — adjust points for a customer
router.post('/customers/:id/adjust', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), adjustPoints);

// Staff — rewards CRUD
router.get('/rewards', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), listRewards);
router.post('/rewards', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), createReward);
router.patch('/rewards/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), updateReward);
router.delete('/rewards/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), deleteReward);

export default router;
