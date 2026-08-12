import { Router } from 'express';
import {
  getCustomerProfile,
  updateCustomerProfile,
  getCustomerOrders,
} from '../controllers/customer.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Customer profile — identity comes from the JWT, never from a client-supplied id
router.get('/profile', authenticate, getCustomerProfile);
router.patch('/profile', authenticate, updateCustomerProfile);

// Order history — own orders only (IDOR-safe)
router.get('/orders', authenticate, getCustomerOrders);

export default router;
