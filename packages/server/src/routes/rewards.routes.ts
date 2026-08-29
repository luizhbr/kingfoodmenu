import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { claimGoogleSignupReward, listMyRewards } from '../controllers/rewards.controller.js';

const router = Router();

// Recompensa de cadastro via Google — autenticado, idempotente no banco.
router.post('/google-signup', authenticate, claimGoogleSignupReward);

// Lista recompensas do cliente autenticado.
router.get('/mine', authenticate, listMyRewards);

export default router;
