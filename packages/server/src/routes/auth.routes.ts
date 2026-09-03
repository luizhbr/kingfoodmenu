import { Router } from 'express';
import passport from 'passport';
import {
  staffLogin,
  staffRegister,
  customerRegister,
  customerLogin,
  getMe,
  getCaptchaStatus,
} from '../controllers/auth.controller.js';
import { handleSocialCallback } from '../controllers/social-auth.controller.js';
import { forgotPassword, resetPassword } from '../controllers/password-reset.controller.js';
import { savePushToken } from '../controllers/push-token.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Staff auth
router.post('/staff/login', staffLogin);
router.post('/staff/register', authenticate, requireRole('SUPER_ADMIN'), staffRegister);

// Adaptive CAPTCHA status (public — exposes only enabled/siteKey/required)
router.get('/captcha-status', getCaptchaStatus);

// Customer auth
router.post('/customer/register', customerRegister);
router.post('/customer/login', customerLogin);

// Password reset (customer)
router.post('/customer/forgot-password', forgotPassword);
router.post('/customer/reset-password', resetPassword);

// Social login — Google
if (process.env.GOOGLE_CLIENT_ID) {
  // state carrega o redirect pós-login (ex.: /checkout) — o callback devolve
  // o cliente para onde ele estava, sem perder o fluxo.
  router.get('/google', (req, res, next) => {
    const redirect = (req.query.redirect as string) || '';
    const state = new URLSearchParams();
    if (redirect) state.set('redirect', redirect);
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
      state: state.toString() || undefined,
    })(req, res, next);
  });
  router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    handleSocialCallback
  );
} else {
  // Google OAuth não configurado — redireciona para o login com mensagem
  // amigável em vez de 404 JSON (evita tela preta no navegador).
  router.get('/google', (req, res) => {
    const redirect = (req.query.redirect as string) || '';
    const target = redirect
      ? `/login?error=google_unavailable&redirect=${encodeURIComponent(redirect)}`
      : '/login?error=google_unavailable';
    res.redirect(target);
  });
}

// Social login — Facebook
if (process.env.FACEBOOK_APP_ID) {
  router.get('/facebook', passport.authenticate('facebook', { scope: ['email'], session: false }));
  router.get('/facebook/callback',
    passport.authenticate('facebook', { session: false, failureRedirect: '/login' }),
    handleSocialCallback
  );
}

// Push notifications token
router.post('/push-token', authenticate, savePushToken);

// Current user info
router.get('/me', authenticate, getMe);

export default router;
