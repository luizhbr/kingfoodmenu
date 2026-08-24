// ── KING PRINT (P15) — print controller ────────────────────────────────────
import { Request, Response } from 'express';
import prisma from '../lib/db.js';
import {
  createPrintJob,
  transitionPrintJob,
  retryPrintJob,
  createPrinterPairing,
  pairPrinterDevice,
  buildKitchenTicket,
  renderTicketText,
  PrintError,
} from '../lib/print-service.js';
import { renderReceipt, buildPreviewOrder } from '../lib/receipt-renderer.js';
import { effectiveTemplate } from '../lib/receipt-template.js';

// ── Printers (MANAGER+) ────────────────────────────────────────────────────

export async function listPrinters(_req: Request, res: Response): Promise<void> {
  const printers = await prisma.printer.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: printers });
}

export async function createPrinter(req: Request, res: Response): Promise<void> {
  const { name, type, paperWidth, location } = req.body;
  if (!name) { res.status(400).json({ success: false, error: 'Name is required' }); return; }
  const printer = await prisma.printer.create({
    data: { name, type: type || 'USB', paperWidth: paperWidth || 80, location },
  });
  res.status(201).json({ success: true, data: printer });
}

export async function updatePrinter(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const { name, type, paperWidth, location, enabled } = req.body;
  const printer = await prisma.printer.update({
    where: { id },
    data: { name, type, paperWidth, location, enabled },
  });
  res.json({ success: true, data: printer });
}

export async function deletePrinter(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  await prisma.printer.delete({ where: { id } });
  res.json({ success: true });
}

export async function generatePairing(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  try {
    const pairing = await createPrinterPairing(id);
    res.json({ success: true, data: pairing });
  } catch (e) {
    if (e instanceof PrintError) { res.status(e.status).json({ success: false, error: e.message }); return; }
    throw e;
  }
}

// ── Print jobs (STAFF+) ──────────────────────────────────────────────────────

export async function createJob(req: Request, res: Response): Promise<void> {
  const { orderId, printerId, type } = req.body;
  if (!printerId) { res.status(400).json({ success: false, error: 'printerId is required' }); return; }
  const jobType = type || 'AUTO';
  // TEST jobs have no order (printer self-test renders a preview ticket)
  if (jobType === 'TEST' && !orderId) {
    try {
      const job = await prisma.printJob.create({
        data: {
          printerId,
          type: 'TEST',
          idempotencyKey: `test:${printerId}:${Date.now()}`,
          requestedById: (req.user as any)?.id,
        },
      });
      res.status(201).json({ success: true, data: job, created: true });
      return;
    } catch (e) {
      if (e instanceof PrintError) { res.status(e.status).json({ success: false, error: e.message }); return; }
      throw e;
    }
  }
  if (!orderId) { res.status(400).json({ success: false, error: 'orderId is required for order print jobs' }); return; }
  try {
    const result = await createPrintJob({
      orderId,
      printerId,
      type: jobType,
      requestedById: (req.user as any)?.id,
    });
    res.status(result.created ? 201 : 200).json({ success: true, data: result.job, created: result.created });
  } catch (e) {
    if (e instanceof PrintError) { res.status(e.status).json({ success: false, error: e.message }); return; }
    throw e;
  }
}

export async function listJobs(req: Request, res: Response): Promise<void> {
  const { status, orderId, printerId, type, limit } = req.query;
  const take = Math.min(100, parseInt(limit as string) || 50);
  const where: any = {};
  if (status) where.status = status as any;
  if (orderId) where.orderId = orderId as string;
  if (printerId) where.printerId = printerId as string;
  if (type) where.type = type as string;
  const jobs = await prisma.printJob.findMany({
    where: Object.keys(where).length ? where : undefined,
    orderBy: { createdAt: 'desc' },
    take,
    include: { order: { select: { orderNumber: true } }, printer: { select: { name: true } } },
  });
  res.json({ success: true, data: jobs });
}

export async function getJob(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const job = await prisma.printJob.findUnique({
    where: { id },
    include: { order: { select: { orderNumber: true } }, printer: { select: { name: true } } },
  });
  if (!job) { res.status(404).json({ success: false, error: 'Print job not found' }); return; }
  res.json({ success: true, data: job });
}

export async function retryJob(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  try {
    const job = await retryPrintJob(id);
    res.json({ success: true, data: job });
  } catch (e) {
    if (e instanceof PrintError) { res.status(e.status).json({ success: false, error: e.message }); return; }
    throw e;
  }
}

export async function cancelJob(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  try {
    const job = await transitionPrintJob(id, 'CANCELLED');
    res.json({ success: true, data: job });
  } catch (e) {
    if (e instanceof PrintError) { res.status(e.status).json({ success: false, error: e.message }); return; }
    throw e;
  }
}

// ── Agent endpoints (device token) ──────────────────────────────────────────

export async function agentPair(req: Request, res: Response): Promise<void> {
  const { printerId, code, deviceId } = req.body;
  if (!printerId || !code || !deviceId) { res.status(400).json({ success: false, error: 'printerId, code and deviceId required' }); return; }
  try {
    const result = await pairPrinterDevice(printerId, code, deviceId);
    res.json({ success: true, data: result });
  } catch (e) {
    if (e instanceof PrintError) { res.status(e.status).json({ success: false, error: e.message }); return; }
    throw e;
  }
}

export async function agentHeartbeat(req: Request, res: Response): Promise<void> {
  const deviceId = (req as any).deviceId;
  const printer = await prisma.printer.findFirst({ where: { deviceId } });
  if (!printer) { res.status(401).json({ success: false, error: 'Device not paired' }); return; }
  const restartRequestedAt = printer.restartRequestedAt;
  // Se havia sinal de restart, limpa após entregar (o agente sai e reinicia)
  await prisma.printer.update({
    where: { id: printer.id },
    data: { status: 'ONLINE', lastSeenAt: new Date(), restartRequestedAt: null },
  });
  res.json({ success: true, data: { restartRequestedAt: restartRequestedAt?.toISOString() ?? null } });
}

export async function agentFetchJobs(req: Request, res: Response): Promise<void> {
  const deviceId = (req as any).deviceId;
  const printer = await prisma.printer.findUnique({ where: { deviceId } });
  if (!printer) { res.status(401).json({ success: false, error: 'Device not paired' }); return; }
  const jobs = await prisma.printJob.findMany({
    where: { printerId: printer.id, status: { in: ['QUEUED', 'FAILED'] } },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });
  // FAST-PRINT: renderiza o ticket junto com o job — o agente não precisa
  // de uma segunda request (fetchTicket) para imprimir. Corta ~1s por job.
  const enriched = await Promise.all(jobs.map(async (job) => {
    try {
      let text = '';
      if (!job.orderId) {
        const preview = buildPreviewOrder();
        const result = renderReceipt(preview, effectiveTemplate(undefined));
        text = result.text;
      } else {
        const ticket = await buildKitchenTicket(job.orderId);
        text = renderTicketText(ticket, printer.paperWidth || 80);
      }
      return { ...job, ticketText: text };
    } catch {
      return { ...job, ticketText: null };
    }
  }));
  res.json({ success: true, data: { printer, jobs: enriched } });
}

export async function agentReportStatus(req: Request, res: Response): Promise<void> {
  const deviceId = (req as any).deviceId;
  const { jobId, status, errorCode, errorMessage } = req.body;
  if (!jobId || !status) { res.status(400).json({ success: false, error: 'jobId and status required' }); return; }
  try {
    const job = await transitionPrintJob(jobId, status, { errorCode, errorMessage });
    res.json({ success: true, data: job });
  } catch (e) {
    if (e instanceof PrintError) { res.status(e.status).json({ success: false, error: e.message }); return; }
    throw e;
  }
}

export async function agentTicket(req: Request, res: Response): Promise<void> {
  const jobId = req.params.jobId as string;
  const job = await prisma.printJob.findUnique({ where: { id: jobId } });
  if (!job) { res.status(404).json({ success: false, error: 'Job not found' }); return; }
  // TEST jobs have no order — render the preview ticket (buildPreviewOrder)
  if (!job.orderId) {
    const printer = await prisma.printer.findUnique({ where: { id: job.printerId } });
    const preview = buildPreviewOrder();
    const result = renderReceipt(preview, effectiveTemplate(undefined));
    res.json({ success: true, data: { ticket: preview, text: result.text, template: 'TEST-PREVIEW' } });
    return;
  }
  const ticket = await buildKitchenTicket(job.orderId);
  const printer = await prisma.printer.findUnique({ where: { id: job.printerId } });

  // P15.3: use the active KITCHEN template when present; fall back to the
  // legacy renderer (DEFAULT_TEMPLATE equivalent) when none is configured.
  try {
    const template = await prisma.receiptTemplate.findFirst({
      where: { type: 'KITCHEN', enabled: true },
      orderBy: { isDefault: 'desc' },
    });
    if (template) {
      const order = await prisma.order.findUnique({
        where: { id: job.orderId },
        include: {
          items: { include: { options: true } },
          customer: { select: { name: true, phone: true } },
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
      if (order) {
        const result = renderReceipt({
          id: order.id,
          orderNumber: order.orderNumber,
          createdAt: order.createdAt,
          orderType: order.orderType,
          status: order.status,
          customerName: order.customer?.name ?? order.guestName,
          customerPhone: order.customer?.phone ?? order.guestPhone,
          deliveryAddress: order.deliveryFormattedAddress,
          comment: order.comment,
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          discount: order.discount,
          tax: order.tax,
          total: order.total,
          paymentMethod: order.payments?.[0]?.method ?? null,
          lines: order.items.map((it: any) => ({
            name: it.name,
            qty: it.quantity,
            unitPrice: it.unitPrice,
            options: it.options?.map((o: any) => o.name) ?? [],
            comment: it.comment ?? undefined,
          })),
        }, effectiveTemplate(template as any));
        res.json({ success: true, data: { ticket, text: result.text, template: template.name } });
        return;
      }
    }
  } catch {
    // template lookup failed — fall through to legacy renderer
  }

  res.json({ success: true, data: { ticket, text: renderTicketText(ticket, printer?.paperWidth || 80) } });
}

// ── Agent restart (MANAGER+) ────────────────────────────────────────────────
// Sinaliza o print-agent para reiniciar: seta restartRequestedAt no Printer.
// O agente detecta o sinal no próximo heartbeat e reinicia o processo.
export async function requestAgentRestart(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const printer = await prisma.printer.findUnique({ where: { id } });
  if (!printer) { res.status(404).json({ success: false, error: 'Printer not found' }); return; }
  if (!printer.deviceId) { res.status(400).json({ success: false, error: 'Printer has no paired agent' }); return; }
  await prisma.printer.update({
    where: { id },
    data: { restartRequestedAt: new Date() },
  });
  res.json({ success: true, data: { restartRequestedAt: new Date().toISOString() } });
}

// ── Agent status (STAFF+) ───────────────────────────────────────────────────
// Retorna status agregado do agente: online/offline + último heartbeat.
export async function agentStatus(req: Request, res: Response): Promise<void> {
  const printers = await prisma.printer.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      lastSeenAt: true,
      deviceId: true,
      restartRequestedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  const now = Date.now();
  const data = printers.map((p) => {
    const lastSeen = p.lastSeenAt ? new Date(p.lastSeenAt).getTime() : null;
    const online = p.status === 'ONLINE' && lastSeen !== null && now - lastSeen < 60_000;
    return {
      ...p,
      online,
      lastSeenAgoSec: lastSeen ? Math.floor((now - lastSeen) / 1000) : null,
    };
  });
  res.json({ success: true, data });
}
