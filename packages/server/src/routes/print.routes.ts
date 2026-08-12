import { Router } from 'express';
import { authenticate, requireRole, requireStaff } from '../middleware/auth.js';
import { requireDeviceToken } from '../middleware/deviceAuth.js';
import {
  listPrinters,
  createPrinter,
  updatePrinter,
  deletePrinter,
  generatePairing,
  createJob,
  listJobs,
  getJob,
  retryJob,
  cancelJob,
  agentPair,
  agentHeartbeat,
  agentFetchJobs,
  agentReportStatus,
  agentTicket,
} from '../controllers/print.controller.js';

const router = Router();

// ── Printers — MANAGER+ ──
router.get('/', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), listPrinters);
router.post('/', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), createPrinter);
router.put('/:id', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), updatePrinter);
router.delete('/:id', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), deletePrinter);
router.post('/:id/pairing', authenticate, requireRole('SUPER_ADMIN', 'MANAGER'), generatePairing);

// ── Print jobs — STAFF+ (kitchen can print) ──
router.post('/jobs', authenticate, requireStaff, createJob);
router.get('/jobs', authenticate, requireStaff, listJobs);
router.get('/jobs/:id', authenticate, requireStaff, getJob);
router.post('/jobs/:id/retry', authenticate, requireStaff, retryJob);
router.post('/jobs/:id/cancel', authenticate, requireStaff, cancelJob);

// ── Agent endpoints — device token ──
router.post('/agent/pair', agentPair);
router.post('/agent/heartbeat', requireDeviceToken, agentHeartbeat);
router.get('/agent/jobs', requireDeviceToken, agentFetchJobs);
router.post('/agent/status', requireDeviceToken, agentReportStatus);
router.get('/agent/jobs/:jobId/ticket', requireDeviceToken, agentTicket);

export default router;
