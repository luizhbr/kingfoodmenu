import { Router } from 'express';
import { authenticate, requireStaff, requireRole } from '../middleware/auth.js';
import {
  getBalance,
  getTransactions,
  adjustBalance,
  getCustomerWallet,
} from '../controllers/cashback.controller.js';

const router = Router();

// Customer — identity from JWT only (never from a client-supplied customerId)
router.get('/balance', authenticate, getBalance);
router.get('/transactions', authenticate, getTransactions);

// Staff — RBAC server-side
router.get('/customers/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), getCustomerWallet);
router.post('/customers/:id/adjust', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), adjustBalance);

export default router;
