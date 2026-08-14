// ── King Print Agent — polling loop ─────────────────────────────────────────
// Loop: heartbeat → fetch QUEUED/FAILED jobs → for each: mark PRINTING,
// download ticket, print, report PRINTED/FAILED. Idempotent at agent level:
// a job already PRINTED locally is never printed again.

import { logger } from './logger.js';
import type { ApiClient } from './api-client.js';
import type { PrinterDriver } from './driver-adapter.js';
import { PrintQueue } from './queue.js';
import { renderTicketText } from './formatter.js';
import { buildEscposBuffer } from './escpos.js';
import type { AgentConfig } from './config.js';

export interface PollStats {
  fetched: number;
  printed: number;
  failed: number;
  skipped: number;
}

export class PrintAgent {
  private running = false;
  private stopped = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private driverConnected = false;
  private lastError: { jobId?: string; message?: string; at?: string } | null = null;
  readonly queue = new PrintQueue();
  readonly startedAt = Date.now();

  constructor(
    private cfg: AgentConfig,
    private api: ApiClient,
    private driver: PrinterDriver,
  ) {}

  get driverIsConnected(): boolean {
    return this.driverConnected;
  }

  get lastErrorInfo() {
    return this.lastError;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.stopped = false;
    logger.info('agent', 'starting', { type: this.cfg.printerType, printer: this.cfg.printerName });
    await this.connectDriver();
    this.pollTimer = setInterval(() => { void this.pollOnce(); }, this.cfg.pollIntervalMs);
    this.heartbeatTimer = setInterval(() => { void this.heartbeat(); }, this.cfg.heartbeatIntervalMs);
    // immediate first pass
    void this.pollOnce();
    void this.heartbeat();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.running = false;
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.pollTimer = null;
    this.heartbeatTimer = null;
    await this.driver.disconnect();
    this.driverConnected = false;
    logger.info('agent', 'stopped');
  }

  private async connectDriver(): Promise<void> {
    try {
      await this.driver.connect();
      this.driverConnected = true;
    } catch (e: any) {
      this.driverConnected = false;
      this.lastError = { message: `driver connect: ${String(e?.message || e)}`, at: new Date().toISOString() };
      logger.error('agent', 'driver connect failed', { error: String(e?.message || e) });
    }
  }

  private async heartbeat(): Promise<void> {
    try {
      await this.api.heartbeat();
    } catch (e: any) {
      logger.warn('agent', 'heartbeat failed', { error: String(e?.message || e) });
    }
  }

  /** One poll cycle. Returns stats for tests. */
  async pollOnce(): Promise<PollStats> {
    const stats: PollStats = { fetched: 0, printed: 0, failed: 0, skipped: 0 };
    if (this.stopped) return stats;
    try {
      const { jobs } = await this.api.fetchJobs();
      stats.fetched = jobs.length;
      for (const job of jobs) {
        const local = this.queue.get(job.id);
        if (local && local.status === 'PRINTED') {
          stats.skipped += 1; // idempotency: never reprint
          continue;
        }
        if (local && local.status === 'PRINTING') {
          stats.skipped += 1; // already in flight
          continue;
        }
        const ok = await this.processJob(job);
        if (ok) stats.printed += 1;
        else stats.failed += 1;
      }
    } catch (e: any) {
      this.lastError = { message: `poll: ${String(e?.message || e)}`, at: new Date().toISOString() };
      logger.error('agent', 'poll failed', { error: String(e?.message || e) });
    }
    return stats;
  }

  private async processJob(job: any): Promise<boolean> {
    const jobId = job.id;
    const orderId = job.orderId;
    const printerId = job.printerId;

    // Local idempotency: add once
    const { job: local, created } = this.queue.add({
      jobId,
      orderId,
      printerId,
      type: job.type || 'AUTO',
      status: 'QUEUED',
      attempts: 0,
      text: '',
      createdAt: Date.now(),
    });
    if (!created && local.status === 'PRINTED') return true; // already done

    // Honor server state: skip jobs the server already sees as PRINTING/PRINTED/FAILED.
    // This prevents spurious 'Invalid transition ...' loops when stale jobs reappear.
    const serverStatus = job.status as string | undefined;
    if (serverStatus === 'PRINTED') {
      if (local.status !== 'PRINTED') {
        try { this.queue.transition(jobId, 'PRINTED'); } catch { /* ignore */ }
      }
      return true;
    }
    if (serverStatus === 'PRINTING' || serverStatus === 'FAILED') {
      return false; // wait for server to re-queue or finish
    }

    try {
      // Mark PRINTING on server
      await this.api.reportStatus(jobId, 'PRINTING');
      // Local transition: QUEUED → PRINTING, or FAILED → PRINTING (server re-queued = retry)
      if (local.status === 'QUEUED' || local.status === 'FAILED') {
        this.queue.transition(jobId, 'PRINTING');
      }

      // Download ticket
      const { text } = await this.api.fetchTicket(jobId);
      local.text = text;

      // Print
      if (!this.driverConnected) {
        await this.connectDriver();
        if (!this.driverConnected) throw new Error('printer unavailable');
      }
      const buf = buildEscposBuffer(text, { paperWidth: this.cfg.paperWidth });
      const result = await this.driver.print(buf);
      if (!result.ok) throw new Error(result.error || 'print failed');

      // Report PRINTED
      await this.api.reportStatus(jobId, 'PRINTED');
      this.queue.transition(jobId, 'PRINTED');
      logger.info('agent', 'job printed', { jobId, orderId, bytes: result.bytes });
      return true;
    } catch (e: any) {
      const msg = String(e?.message || e);
      this.lastError = { jobId, message: msg, at: new Date().toISOString() };
      try {
        await this.api.reportStatus(jobId, 'FAILED', 'PRINT_ERROR', msg.slice(0, 500));
      } catch { /* server may be down */ }
      try {
        this.queue.transition(jobId, 'FAILED', { error: msg });
      } catch { /* already failed */ }
      logger.error('agent', 'job failed', { jobId, orderId, error: msg });
      return false;
    }
  }
}
