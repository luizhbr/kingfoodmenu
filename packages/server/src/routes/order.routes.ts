import { Router } from 'express';
import { authenticate, optionalAuth, requireStaff, requirePermission } from '../middleware/auth.js';
import { requireOwnership } from '../middleware/idor.js';
import { createOrder, listOrders, listCustomerOrders, getOrder, updateOrderStatus, deleteOrder, deleteOrdersBatch } from '../controllers/order.controller.js';

const router = Router();

// Customer creates order (optionalAuth - allows guest checkout)
router.post('/', optionalAuth, createOrder);

// Customer: view own orders
router.get('/my-orders', authenticate, listCustomerOrders);

// Staff: list and manage orders
router.get('/', authenticate, requireStaff, listOrders);

// Staff: delete orders (individual + batch)
router.delete('/:id', authenticate, requireStaff, requirePermission('orders.delete'), deleteOrder);
router.post('/batch-delete', authenticate, requireStaff, requirePermission('orders.delete'), deleteOrdersBatch);

// Single order access — customers can only see their own, staff can see all
router.get('/:id', optionalAuth, getOrder);

// Only staff can update order status
router.patch('/:id/status', authenticate, requireStaff, requirePermission('orders.updateStatus'), updateOrderStatus);

export default router;
