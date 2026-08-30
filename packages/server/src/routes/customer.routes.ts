import { Router } from 'express';
import {
  getCustomerProfile,
  updateCustomerProfile,
  getCustomerOrders,
  searchCustomers,
} from '../controllers/customer.controller.js';
import { authenticate, requireStaff } from '../middleware/auth.js';

const router = Router();

// Staff: search customers by name/phone/email (manual/phone order flow)
router.get('/', authenticate, requireStaff, searchCustomers);

// Customer profile — identity comes from the JWT, never from a client-supplied id
router.get('/profile', authenticate, getCustomerProfile);
router.patch('/profile', authenticate, updateCustomerProfile);

// Order history — own orders only (IDOR-safe)
router.get('/orders', authenticate, getCustomerOrders);

export default router;
