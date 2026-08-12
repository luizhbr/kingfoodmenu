import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  getReportsOverview,
  getReportsProducts,
  getReportsMarketing,
  getReportsLoyalty,
  getReportsDelivery,
  getReportsSales,
  exportReportsExcel,
} from '../controllers/reports.controller.js';

const router = Router();

// Reports are administrative data — MANAGER/SUPER_ADMIN only.
// (requireStaff would also admit DRIVER, so we use requireRole explicitly.)
router.get('/overview', authenticate, requireRole('MANAGER', 'SUPER_ADMIN'), getReportsOverview);
router.get('/sales', authenticate, requireRole('MANAGER', 'SUPER_ADMIN'), getReportsSales);
router.get('/products', authenticate, requireRole('MANAGER', 'SUPER_ADMIN'), getReportsProducts);
router.get('/marketing', authenticate, requireRole('MANAGER', 'SUPER_ADMIN'), getReportsMarketing);
router.get('/loyalty', authenticate, requireRole('MANAGER', 'SUPER_ADMIN'), getReportsLoyalty);
router.get('/delivery', authenticate, requireRole('MANAGER', 'SUPER_ADMIN'), getReportsDelivery);
router.get('/export', authenticate, requireRole('MANAGER', 'SUPER_ADMIN'), exportReportsExcel);

export default router;
