import { Router } from 'express';
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.js';
import {
  listMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  uploadMenuItemImage,
  updateMenuItemImages,
  deleteMenuItemImage,
} from '../controllers/menu-item.controller.js';
import { upload } from '../middleware/upload.js';
import {
  listAllergens,
  createAllergen,
  deleteAllergen,
} from '../controllers/allergen.controller.js';
import {
  listMealtimes,
  createMealtime,
  updateMealtime,
  deleteMealtime,
} from '../controllers/mealtime.controller.js';
import { authenticate, requireStaff, requirePermission } from '../middleware/auth.js';

const router = Router();

// Menu module discovery — public root of /api/menu (sub-resources live below)
router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      categories: '/api/menu/categories',
      items: '/api/menu/items',
      allergens: '/api/menu/allergens',
      mealtimes: '/api/menu/mealtimes',
    },
  });
});

// Categories - read is open, write requires Manager+
router.get('/categories', listCategories);
router.get('/categories/:id', getCategory);
router.post('/categories', authenticate, requireStaff, requirePermission('menu.categories'), createCategory);
router.patch('/categories/:id', authenticate, requireStaff, requirePermission('menu.categories'), updateCategory);
router.delete('/categories/:id', authenticate, requireStaff, requirePermission('menu.delete'), deleteCategory);

// Menu items - read is open, write requires Manager+
router.get('/items', listMenuItems);
router.get('/items/:id', getMenuItem);
router.post('/items', authenticate, requireStaff, requirePermission('menu.create'), createMenuItem);
router.patch('/items/:id', authenticate, requireStaff, requirePermission('menu.edit'), updateMenuItem);
router.delete('/items/:id', authenticate, requireStaff, requirePermission('menu.delete'), deleteMenuItem);
router.post('/items/:id/image', authenticate, requireStaff, requirePermission('menu.edit'), upload.single('image'), uploadMenuItemImage);
router.put('/items/:id/images', authenticate, requireStaff, requirePermission('menu.edit'), updateMenuItemImages);
router.delete('/items/:id/image', authenticate, requireStaff, requirePermission('menu.edit'), deleteMenuItemImage);

// Allergens - read is open, write requires Manager+
router.get('/allergens', listAllergens);
router.post('/allergens', authenticate, requireStaff, requirePermission('menu.categories'), createAllergen);
router.delete('/allergens/:id', authenticate, requireStaff, requirePermission('menu.delete'), deleteAllergen);

// Mealtimes - read is open, write requires Manager+
router.get('/mealtimes', listMealtimes);
router.post('/mealtimes', authenticate, requireStaff, requirePermission('menu.categories'), createMealtime);
router.patch('/mealtimes/:id', authenticate, requireStaff, requirePermission('menu.categories'), updateMealtime);
router.delete('/mealtimes/:id', authenticate, requireStaff, requirePermission('menu.delete'), deleteMealtime);

export default router;
