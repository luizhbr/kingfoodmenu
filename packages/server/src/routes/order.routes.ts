import { Router } from 'express';
import { authenticate, optionalAuth, requireStaff } from '../middleware/auth.js';
import { requireOwnership } from '../middleware/idor.js';
import { createOrder, listOrders, listCustomerOrders, getOrder, updateOrderStatus } from '../controllers/order.controller.js';

const router = Router();

// Customer creates order (optionalAuth - allows guest checkout)
router.post('/', optionalAuth, createOrder);

// Customer: view own orders
router.get('/my-orders', authenticate, listCustomerOrders);

// Staff: list and manage orders
router.get('/', authenticate, requireStaff, listOrders);

// Single order access — customers can only see their own, staff can see all
router.get('/:id', authenticate, requireOwnership('order'), getOrder);

// Only staff can update order status
router.patch('/:id/status', authenticate, requireStaff, updateOrderStatus);

export default router;
