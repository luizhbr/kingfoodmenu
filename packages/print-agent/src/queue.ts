// ── King Print Agent — local print queue ─────────────────────────────────────
// Mirrors the server state machine (QUEUED → PRINTING → PRINTED | FAILED).
// PRINTED is terminal — a job is never printed twice by this agent.
// The server remains the source of truth; this queue is a local mirror
// used to serialize printing and enforce idempotency at the agent level.

import { logger } from './logger.js';

export type LocalJobStatus = 'QUEUED' | 'PRINTING' | 'PRINTED' | 'FAILED';

export interface LocalJob {
  jobId: string;
  orderId: string;
  printerId: string;
  type: string;
  status: LocalJobStatus;
  attempts: number;
  text: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

const VALID: Record<LocalJobStatus, LocalJobStatus[]> = {
  QUEUED: ['PRINTING', 'FAILED'],
  PRINTING: ['PRINTED', 'FAILED'],
  PRINTED: [],
  // FAILED → PRINTING is allowed when the SERVER re-queued the job (retry).
  // The server is the source of truth; it only re-queues FAILED jobs.
  FAILED: ['QUEUED', 'PRINTING'],
};

export class PrintQueue {
  private jobs = new Map<string, LocalJob>();

  /** Add a job. Idempotent: same jobId twice → returns existing, no duplicate. */
  add(job: LocalJob): { job: LocalJob; created: boolean } {
    const existing = this.jobs.get(job.jobId);
    if (existing) return { job: existing, created: false };
    this.jobs.set(job.jobId, job);
    logger.info('queue', 'job queued', { jobId: job.jobId, orderId: job.orderId });
    return { job, created: true };
  }

  get(jobId: string): LocalJob | undefined {
    return this.jobs.get(jobId);
  }

  /** Next QUEUED job (FIFO by createdAt). */
  next(): LocalJob | undefined {
    return [...this.jobs.values()]
      .filter((j) => j.status === 'QUEUED')
      .sort((a, b) => a.createdAt - b.createdAt)[0];
  }

  transition(jobId: string, to: LocalJobStatus, meta?: { error?: string }): LocalJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Local job not found: ${jobId}`);
    if (!VALID[job.status].includes(to)) {
      throw new Error(`Invalid local transition ${job.status} → ${to}`);
    }
    job.status = to;
    if (to === 'PRINTING') { job.startedAt = Date.now(); job.attempts += 1; }
    if (to === 'PRINTED') { job.completedAt = Date.now(); job.error = undefined; }
    if (to === 'FAILED') { job.error = meta?.error; }
    if (to === 'QUEUED') { job.error = undefined; }
    logger.info('queue', 'job transition', { jobId, from: job.status, to });
    return job;
  }

  /** Count of jobs in a status (for health). */
  count(status: LocalJobStatus): number {
    return [...this.jobs.values()].filter((j) => j.status === status).length;
  }

  /** Total jobs ever seen (idempotency evidence). */
  get totalSeen(): number {
    return this.jobs.size;
  }

  /** Jobs that are PRINTED (for health last-print). */
  lastPrinted(): LocalJob | undefined {
    return [...this.jobs.values()]
      .filter((j) => j.status === 'PRINTED')
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))[0];
  }
}
