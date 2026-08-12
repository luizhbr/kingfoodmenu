// ── KING PRINT P15.3 — Receipt template admin routes ─────────────────────────
import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate,
  uploadLogo, previewTemplate, testPrint, getDefault,
} from '../controllers/print-template.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 512 * 1024 } });

// All template routes require SUPER_ADMIN or MANAGER
router.use(authenticate, requireRole('SUPER_ADMIN', 'MANAGER'));

router.get('/', listTemplates);
router.get('/default', getDefault);
router.get('/:id', getTemplate);
router.post('/', createTemplate);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);
router.post('/:id/logo', upload.single('logo'), uploadLogo);
router.post('/:id/preview', previewTemplate);
router.post('/test', testPrint);

export default router;
