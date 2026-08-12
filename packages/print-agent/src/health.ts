// ── King Print Agent — health report ─────────────────────────────────────────
// Never includes tokens, pairing codes, or secrets.

import { logger } from './logger.js';
import type { PrintQueue } from './queue.js';
import type { PrinterDriver } from './driver-adapter.js';

export interface HealthReport {
  api: 'OK' | 'DOWN';
  device: { paired: boolean; deviceId: string };
  printer: { type: string; name: string; connected: boolean };
  queue: { queued: number; printing: number; printed: number; failed: number; totalSeen: number };
  lastPrint: { jobId?: string; at?: string } | null;
  lastError: { jobId?: string; message?: string; at?: string } | null;
  uptimeSec: number;
}

export function buildHealth(opts: {
  apiOk: boolean;
  deviceId: string;
  printerType: string;
  printerName: string;
  driverConnected: boolean;
  queue: PrintQueue;
  startedAt: number;
}): HealthReport {
  return {
    api: opts.apiOk ? 'OK' : 'DOWN',
    device: { paired: Boolean(opts.deviceId), deviceId: opts.deviceId },
    printer: { type: opts.printerType, name: opts.printerName, connected: opts.driverConnected },
    queue: {
      queued: opts.queue.count('QUEUED'),
      printing: opts.queue.count('PRINTING'),
      printed: opts.queue.count('PRINTED'),
      failed: opts.queue.count('FAILED'),
      totalSeen: opts.queue.totalSeen,
    },
    lastPrint: (() => {
      const lp = opts.queue.lastPrinted();
      return lp ? { jobId: lp.jobId, at: lp.completedAt ? new Date(lp.completedAt).toISOString() : undefined } : null;
    })(),
    lastError: null,
    uptimeSec: Math.floor((Date.now() - opts.startedAt) / 1000),
  };
}

export function printHealth(h: HealthReport): void {
  logger.info('health', 'report', h as unknown as Record<string, unknown>);
}
