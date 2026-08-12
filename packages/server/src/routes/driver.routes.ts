import { Router } from 'express';
import { authenticate, requireDriver } from '../middleware/auth.js';
import {
  getProfile,
  getOrders,
  getOrder,
  acceptOrder,
  pickupOrder,
  outForDelivery,
  deliveredOrder,
  getHistory,
} from '../controllers/driver.controller.js';

const router = Router();

// All driver routes: JWT + role DRIVER required
router.get('/profile', authenticate, requireDriver, getProfile);
router.get('/orders', authenticate, requireDriver, getOrders);
router.get('/orders/history', authenticate, requireDriver, getHistory);
router.get('/orders/:id', authenticate, requireDriver, getOrder);
router.post('/orders/:id/accept', authenticate, requireDriver, acceptOrder);
router.post('/orders/:id/pickup', authenticate, requireDriver, pickupOrder);
router.post('/orders/:id/out-for-delivery', authenticate, requireDriver, outForDelivery);
router.post('/orders/:id/delivered', authenticate, requireDriver, deliveredOrder);

export default router;
