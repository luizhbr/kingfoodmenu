import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  updatePreferences,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  updateMe,
  deleteMe,
  requestDeletion,
  getMyCompany,
  listCompanyMembers,
} from '../controllers/customer.controller.js';

const router = Router();

// Unauthenticated: public account-deletion request form (Play Store's
// required deletion URL posts here). Covered by the global rate limiter.
router.post('/deletion-request', requestDeletion);

// All routes below operate on the currently-authenticated customer
// (req.user.type === 'customer'). Staff hitting these gets 401.

router.patch('/me', authenticate, updateMe);
router.delete('/me', authenticate, deleteMe);
router.patch('/me/preferences', authenticate, updatePreferences);

router.get('/me/addresses', authenticate, listAddresses);
router.post('/me/addresses', authenticate, createAddress);
router.patch('/me/addresses/:id', authenticate, updateAddress);
router.delete('/me/addresses/:id', authenticate, deleteAddress);

router.get('/me/company', authenticate, getMyCompany);
router.get('/me/company/members', authenticate, listCompanyMembers);

export default router;
