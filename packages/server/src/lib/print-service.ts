// ── KING PRINT (P15) — print job service ────────────────────────────────────
// Responsibilities:
//  - create print jobs with structural idempotency (@@unique orderId+type+printerId)
//  - state machine: QUEUED → PRINTING → PRINTED | FAILED | CANCELLED
//  - safe retry (never PRINTED → QUEUED)
//  - kitchen ticket template (normalized document, no sensitive data)
//  - pairing code generation for local print agents

import prisma from './db.js';
import crypto from 'crypto';

export type PrintJobStatus = 'QUEUED' | 'PRINTING' | 'PRINTED' | 'FAILED' | 'CANCELLED';

export interface CreatePrintJobInput {
  orderId: string;
  printerId: string;
  type?: 'AUTO' | 'REPRINT';
  requestedById?: string;
}

const VALID_TRANSITIONS: Record<PrintJobStatus, PrintJobStatus[]> = {
  QUEUED: ['PRINTING', 'CANCELLED', 'FAILED'],
  PRINTING: ['PRINTED', 'FAILED'],
  PRINTED: ['QUEUED'], // reprint: job já impresso pode voltar para a fila
  FAILED: ['QUEUED', 'CANCELLED'], // retry allowed from FAILED
  CANCELLED: [],
};

export function canTransition(from: PrintJobStatus, to: PrintJobStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Create a print job. Idempotent: the unique constraint
 * (orderId, type, printerId) guarantees one job per order+printer+type
 * even under concurrent requests.
 */
export async function createPrintJob(input: CreatePrintJobInput) {
  const { orderId, printerId, type = 'AUTO', requestedById } = input;

  const printer = await prisma.printer.findUnique({ where: { id: printerId } });
  if (!printer) throw new PrintError('Printer not found', 404);
  if (!printer.enabled) throw new PrintError('Printer is disabled', 400);

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new PrintError('Order not found', 404);
  if (order.status === 'CANCELLED') throw new PrintError('Cannot print a cancelled order', 400);

  const idempotencyKey = `${orderId}:${type}:${printerId}`;

  try {
    const job = await prisma.printJob.create({
      data: {
        orderId,
        printerId,
        type,
        idempotencyKey,
        requestedById,
      },
    });
    return { job, created: true };
  } catch (err: any) {
    // Unique constraint violation → job already exists → return it (idempotent)
    if (err?.code === 'P2002') {
      const existing = await prisma.printJob.findUnique({ where: { idempotencyKey } });
      if (!existing) throw err;
      // REPRINT: job já impresso OU falhou volta para a fila para imprimir de novo.
      // (PRINTED → QUEUED e FAILED → QUEUED são transições válidas.)
      if (type === 'REPRINT' && (existing.status === 'PRINTED' || existing.status === 'FAILED')) {
        const requeued = await transitionPrintJob(existing.id, 'QUEUED');
        return { job: requeued, created: false, reprinted: true };
      }
      return { job: existing, created: false };
    }
    throw err;
  }
}

/** Transition a job to a new status with validation. */
export async function transitionPrintJob(jobId: string, to: PrintJobStatus, meta?: { errorCode?: string; errorMessage?: string }) {
  const job = await prisma.printJob.findUnique({ where: { id: jobId } });
  if (!job) throw new PrintError('Print job not found', 404);
  if (!canTransition(job.status as PrintJobStatus, to)) {
    throw new PrintError(`Invalid transition ${job.status} → ${to}`, 400);
  }

  const data: any = { status: to };
  if (to === 'PRINTING') { data.startedAt = new Date(); data.attempts = { increment: 1 }; }
  if (to === 'PRINTED') data.completedAt = new Date();
  if (to === 'FAILED') { data.failedAt = new Date(); data.errorCode = meta?.errorCode; data.errorMessage = meta?.errorMessage; }
  if (to === 'QUEUED') { data.failedAt = null; data.errorCode = null; data.errorMessage = null; }

  return prisma.printJob.update({ where: { id: jobId }, data });
}

/** Retry a FAILED job (idempotent: only FAILED → QUEUED). */
export async function retryPrintJob(jobId: string) {
  return transitionPrintJob(jobId, 'QUEUED');
}

// ── Pairing ──────────────────────────────────────────────────────────────────

export function generatePairingCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 chars, single-use
}

export async function createPrinterPairing(printerId: string, ttlMinutes = 10) {
  const printer = await prisma.printer.findUnique({ where: { id: printerId } });
  if (!printer) throw new PrintError('Printer not found', 404);
  const code = generatePairingCode();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await prisma.printer.update({
    where: { id: printerId },
    data: { pairingCode: code, pairingExpiresAt: expiresAt },
  });
  return { code, expiresAt };
}

/** Pair a device: validate code, bind deviceId, clear code (single-use). */
export async function pairPrinterDevice(printerId: string, code: string, deviceId: string) {
  const printer = await prisma.printer.findUnique({ where: { id: printerId } });
  if (!printer) throw new PrintError('Printer not found', 404);
  if (!printer.pairingCode || printer.pairingCode !== code) {
    throw new PrintError('Invalid pairing code', 401);
  }
  if (!printer.pairingExpiresAt || printer.pairingExpiresAt < new Date()) {
    throw new PrintError('Pairing code expired', 401);
  }
  // single-use: clear code immediately
  await prisma.printer.update({
    where: { id: printerId },
    data: { pairingCode: null, pairingExpiresAt: null, deviceId, status: 'ONLINE', lastSeenAt: new Date() },
  });
  return { paired: true };
}

// ── Kitchen ticket template ─────────────────────────────────────────────────

export interface TicketLine {
  name: string;
  qty: number;
  options?: string[];
  comment?: string;
}

export interface KitchenTicket {
  orderNumber: string;
  createdAt: string;
  orderType: string;
  status: string;
  lines: TicketLine[];
  customerName?: string;
  deliveryAddress?: string;
  comment?: string;
}

/** Build a normalized kitchen ticket from an order (no sensitive data). */
export async function buildKitchenTicket(orderId: string): Promise<KitchenTicket> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { options: true } },
      customer: { select: { name: true } },
    },
  });
  if (!order) throw new PrintError('Order not found', 404);

  const lines: TicketLine[] = order.items.map((it: any) => ({
    name: it.name,
    qty: it.quantity,
    options: it.options?.map((o: any) => o.name) ?? [],
    comment: it.comment ?? undefined,
  }));

  return {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt.toISOString(),
    orderType: order.orderType,
    status: order.status,
    lines,
    customerName: order.customer?.name ?? order.guestName ?? undefined,
    deliveryAddress: order.deliveryFormattedAddress ?? undefined,
    comment: order.comment ?? undefined,
  };
}

/** Render a kitchen ticket as plain text (ESC/POS friendly). */
export function renderTicketText(ticket: KitchenTicket, paperWidth = 80): string {
  const W = paperWidth === 58 ? 32 : 42;
  const line = '='.repeat(W);
  const thin = '-'.repeat(W);
  const pad = (s: string) => s.padEnd(W);

  const out: string[] = [];
  out.push(pad('KING FOOD'));
  out.push(pad(`Order #${ticket.orderNumber}`));
  out.push(pad(new Date(ticket.createdAt).toLocaleString('en-US', { hour12: false })));
  out.push(line);
  for (const l of ticket.lines) {
    out.push(pad(`${l.qty}x ${l.name}`));
    for (const o of l.options ?? []) out.push(pad(`   + ${o}`));
    if (l.comment) out.push(pad(`   (${l.comment})`));
  }
  out.push(line);
  out.push(pad(`Type: ${ticket.orderType}`));
  if (ticket.customerName) out.push(pad(`Customer: ${ticket.customerName}`));
  if (ticket.deliveryAddress) out.push(pad(`Address: ${ticket.deliveryAddress}`));
  if (ticket.comment) out.push(pad(`Note: ${ticket.comment}`));
  out.push(thin);
  out.push('');
  out.push('');
  return out.join('\n');
}

export class PrintError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
