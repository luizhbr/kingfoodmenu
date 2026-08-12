/**
 * ApiMetric Retention Policy
 *
 * Automatically deletes ApiMetric records older than 90 days.
 * Runs as a setInterval-based cron (no external dependencies needed).
 *
 * In production, consider replacing with a proper job scheduler
 * (node-cron, bull, etc.) for more precise scheduling.
 */

import prisma from './db.js';
import { metricsLogger } from './logger.js';

const RETENTION_DAYS = parseInt(process.env.API_METRIC_RETENTION_DAYS || '90', 10);
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Run once per day

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

async function cleanupOldMetrics(): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  try {
    const result = await prisma.apiMetric.deleteMany({
      where: {
        createdAt: {
          lt: cutoff,
        },
      },
    });
    metricsLogger.info({ deletedCount: result.count, cutoff: cutoff.toISOString() }, 'ApiMetric cleanup completed');
  } catch (err) {
    metricsLogger.error({ err }, 'ApiMetric cleanup failed');
  }
}

export function startMetricCleanup(): void {
  if (cleanupTimer) return; // Already started

  // Run immediately on startup (in production, defer by a few seconds)
  if (process.env.NODE_ENV !== 'test') {
    setTimeout(() => cleanupOldMetrics(), 30_000); // 30s grace for server startup
    cleanupTimer = setInterval(cleanupOldMetrics, CLEANUP_INTERVAL_MS);
  }

  metricsLogger.info({ retentionDays: RETENTION_DAYS }, 'ApiMetric cleanup scheduler started');
}

export function stopMetricCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

// Auto-start when imported (unless in test environment)
startMetricCleanup();
