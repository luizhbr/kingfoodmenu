import { EventEmitter } from 'events';
import prisma from './db.js';
import { executeAction } from './actions.js';
import { automationLogger } from './logger.js';

export const appEvents = new EventEmitter();

// When an event fires, load matching automation rules and execute actions
appEvents.on('order.created', (data) => processRules('order.created', data));
appEvents.on('order.statusChanged', (data) => {
  processRules('order.statusChanged', data);
  void autoPrintOnConfirmed(data);
});
appEvents.on('reservation.created', (data) => processRules('reservation.created', data));
appEvents.on('review.submitted', (data) => processRules('review.submitted', data));

/**
 * KING PRINT auto-print (P15.1): when an order becomes CONFIRMED, enqueue a
 * kitchen ticket print job on every ENABLED printer. Idempotency is enforced
 * by the PrintJob unique constraint (orderId, type, printerId) — duplicate
 * events can never create a second job for the same order+printer.
 */
async function autoPrintOnConfirmed(data: Record<string, unknown>): Promise<void> {
  try {
    const order = data.order as { id?: string; status?: string } | undefined;
    if (!order?.id || order.status !== 'CONFIRMED') return;

    const printers = await prisma.printer.findMany({ where: { enabled: true } });
    if (printers.length === 0) return;

    for (const printer of printers) {
      try {
        await prisma.printJob.create({
          data: {
            orderId: order.id,
            printerId: printer.id,
            type: 'AUTO',
            idempotencyKey: `${order.id}:AUTO:${printer.id}`,
          },
        });
        automationLogger.info({ orderId: order.id, printerId: printer.id }, 'auto-print job queued');
      } catch (err: any) {
        // P2002 = already exists (idempotent) — expected on duplicate events
        if (err?.code !== 'P2002') {
          automationLogger.error({ err, orderId: order.id, printerId: printer.id }, 'auto-print job failed');
        }
      }
    }
  } catch (err) {
    automationLogger.error({ err }, 'auto-print handler error');
  }
}

async function processRules(event: string, data: Record<string, unknown>) {
  try {
    const rules = await prisma.automationRule.findMany({
      where: { event, isActive: true },
    });

    for (const rule of rules) {
      if (matchesConditions(rule.conditions as Record<string, unknown> | null, data)) {
        const actions = rule.actions as Array<{ type: string; [key: string]: unknown }>;
        for (const action of actions) {
          executeAction(action, data).catch((err) => {
            automationLogger.error({ err, rule: rule.name }, 'Automation rule action failed');
          });
        }
      }
    }
  } catch (err) {
    automationLogger.error({ err, event }, 'Error processing automation rules');
  }
}

function matchesConditions(
  conditions: Record<string, unknown> | null,
  data: Record<string, unknown>
): boolean {
  if (!conditions) return true;

  for (const [key, value] of Object.entries(conditions)) {
    // Support nested keys like "order.status"
    const actual = getNestedValue(data, key);
    if (actual !== value) return false;
  }

  return true;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}
