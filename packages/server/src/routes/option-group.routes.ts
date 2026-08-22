import { Router } from 'express';
import { authenticate, requireStaff, requirePermission } from '../middleware/auth.js';
import {
  listOptionGroups,
  getOptionGroup,
  createOptionGroup,
  updateOptionGroup,
  deleteOptionGroup,
  assignToProducts,
  unassignFromProducts,
  listGroupProducts,
} from '../controllers/option-group.controller.js';

const router = Router();

// Read is open (storefront needs it), write requires staff
router.get('/', listOptionGroups);
router.get('/:id', getOptionGroup);
router.get('/:id/products', listGroupProducts);

router.post('/', authenticate, requireStaff, requirePermission('menu.categories'), createOptionGroup);
router.put('/:id', authenticate, requireStaff, requirePermission('menu.categories'), updateOptionGroup);
router.delete('/:id', authenticate, requireStaff, requirePermission('menu.delete'), deleteOptionGroup);

router.post('/:id/assign', authenticate, requireStaff, requirePermission('menu.edit'), assignToProducts);
router.post('/:id/unassign', authenticate, requireStaff, requirePermission('menu.edit'), unassignFromProducts);

export default router;
