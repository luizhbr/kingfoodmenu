// ── King Print Agent — AUTO PRINT listener ───────────────────────────────────
// Listens for order.statusChanged events (CONFIRMED) and creates a print job
// via the server API. The server enforces idempotency (@@unique orderId+type+printerId)
// so duplicate events produce exactly one job.

import { logger } from './logger.js';
import type { ApiClient } from './api-client.js';
import type { AgentConfig } from './config.js';

export interface OrderStatusEvent {
  order?: { id?: string; status?: string; orderNumber?: string };
  previousStatus?: string;
}

export function isConfirmedEvent(data: OrderStatusEvent): boolean {
  return data?.order?.status === 'CONFIRMED';
}

export class AutoPrintListener {
  constructor(
    private cfg: AgentConfig,
    private api: ApiClient,
  ) {}

  /** Handle one order.statusChanged event. Returns the created job or null. */
  async handleEvent(data: OrderStatusEvent): Promise<{ job: any; created: boolean } | null> {
    if (!isConfirmedEvent(data)) return null;
    const orderId = data.order?.id;
    if (!orderId) return null;
    try {
      const result = await this.api.createJob(orderId, this.cfg.printerId, 'AUTO');
      logger.info('auto-print', 'print job ensured', { orderId, created: result.created });
      return result;
    } catch (e: any) {
      logger.error('auto-print', 'create job failed', { orderId, error: String(e?.message || e) });
      return null;
    }
  }
}
