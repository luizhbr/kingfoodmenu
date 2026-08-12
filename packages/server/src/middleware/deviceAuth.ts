// ── Device token auth for print agents ──────────────────────────────────────
// The agent authenticates with a device token (bound to a paired Printer).
// This is NOT a user JWT — it is a device credential with limited scope.

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../lib/db.js';

export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function requireDeviceToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Device ')) {
    res.status(401).json({ success: false, error: 'Device token required' });
    return;
  }
  const token = auth.slice(7).trim();
  // Look up printer by deviceId — the token is stored hashed on the printer row.
  // For the MVP we store the token itself in deviceId (replaced on re-pair).
  const printer = await prisma.printer.findUnique({ where: { deviceId: token } });
  if (!printer) {
    res.status(401).json({ success: false, error: 'Invalid device token' });
    return;
  }
  (req as any).deviceId = token;
  (req as any).printer = printer;
  next();
}
