import { Router } from 'express';
import { authenticate, requireStaff, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  getSettings,
  updateSettings,
  uploadLogo,
  uploadFavicon,
  getVisualDraft,
  saveVisualDraft,
  getVisualPublished,
  publishVisual,
  getVisualHistory,
  restoreVisualVersion,
  discardVisualDraft,
  getGeneralSettings,
  updateGeneralSettings,
  getOrderSettings,
  updateOrderSettings,
  getReservationSettings,
  updateReservationSettings,
  getMailSettings,
  updateMailSettings,
  sendTestEmail,
  getPaymentSettings,
  updatePaymentSettings,
  getReviewSettings,
  updateReviewSettings,
  getLoyaltySettings,
  updateLoyaltySettings,
  getAdvancedSettings,
  updateAdvancedSettings,
} from '../controllers/settings.controller.js';

const router = Router();

// Existing branding/design routes
router.get('/', getSettings);
router.put('/', authenticate, requireStaff, updateSettings);
router.post('/logo', authenticate, requireStaff, upload.single('logo'), uploadLogo);
router.post('/favicon', authenticate, requireStaff, upload.single('favicon'), uploadFavicon);

// General — MANAGER+
router.get('/general', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), getGeneralSettings);
router.put('/general', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), updateGeneralSettings);

// Order — MANAGER+
router.get('/order', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), getOrderSettings);
router.put('/order', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), updateOrderSettings);

// Reservation — MANAGER+
router.get('/reservation', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), getReservationSettings);
router.put('/reservation', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), updateReservationSettings);

// Mail — SUPER_ADMIN only
router.get('/mail', authenticate, requireRole('SUPER_ADMIN'), getMailSettings);
router.put('/mail', authenticate, requireRole('SUPER_ADMIN'), updateMailSettings);
router.post('/mail/test', authenticate, requireRole('SUPER_ADMIN'), sendTestEmail);

// Payment — SUPER_ADMIN only
router.get('/payment', authenticate, requireRole('SUPER_ADMIN'), getPaymentSettings);
router.put('/payment', authenticate, requireRole('SUPER_ADMIN'), updatePaymentSettings);

// Review — MANAGER+
router.get('/review', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), getReviewSettings);
router.put('/review', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), updateReviewSettings);

// Loyalty — MANAGER+
router.get('/loyalty', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), getLoyaltySettings);
router.put('/loyalty', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), updateLoyaltySettings);

// Advanced — SUPER_ADMIN only
router.get('/advanced', authenticate, requireRole('SUPER_ADMIN'), getAdvancedSettings);
router.put('/advanced', authenticate, requireRole('SUPER_ADMIN'), updateAdvancedSettings);

// Visual Experience Builder (Fase 3) — MANAGER+
router.get('/visual/draft', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), getVisualDraft);
router.put('/visual/draft', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), saveVisualDraft);
router.delete('/visual/draft', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), discardVisualDraft);
// Published é público (storefront consome via GET /api/settings)
router.get('/visual/published', getVisualPublished);
router.post('/visual/publish', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), publishVisual);
router.get('/visual/history', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), getVisualHistory);
router.post('/visual/restore/:id', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), restoreVisualVersion);

export default router;
