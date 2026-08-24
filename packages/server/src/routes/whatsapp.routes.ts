import { Router } from 'express';
import {
  getStatus,
  listConversations,
  processN8nEvent,
  receiveWebhook,
  sendTestMessage,
  setBotEnabled,
  setHandoff,
  testConnection,
  verifyWebhook,
  getWebStatus,
  connectWeb,
  disconnectWeb,
  logoutWeb,
} from '../controllers/whatsapp.controller.js';
import { authenticate, requireRole, requirePermission } from '../middleware/auth.js';

const router = Router();

// ── Webhook Meta Cloud API (público, valida assinatura internamente) ──
router.get('/webhook', verifyWebhook);
router.post('/webhook', receiveWebhook);

// ── Processamento interno (chamado pelo n8n — workflow Incoming) ──
// O n8n retorna a resposta processada; o backend valida e envia pela Meta.
router.post('/process', processN8nEvent);

// ── Central WhatsApp (Admin) — autenticado ──
router.get('/status', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), requirePermission('whatsapp.view'), getStatus);
router.post('/test', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), requirePermission('whatsapp.manage'), testConnection);
router.post('/test-message', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), requirePermission('whatsapp.manage'), sendTestMessage);
router.post('/bot', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), requirePermission('whatsapp.manage'), setBotEnabled);
router.get('/web/status', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), requirePermission('whatsapp.view'), getWebStatus);
router.post('/web/connect', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), requirePermission('whatsapp.manage'), connectWeb);
router.post('/web/disconnect', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), requirePermission('whatsapp.manage'), disconnectWeb);
router.post('/web/logout', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), requirePermission('whatsapp.manage'), logoutWeb);
router.get('/conversations', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), requirePermission('whatsapp.view'), listConversations);
router.post('/conversations/:id/handoff', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), requirePermission('whatsapp.manage'), setHandoff);

export default router;
