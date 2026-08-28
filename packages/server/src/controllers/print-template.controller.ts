// ── KING PRINT P15.3 — Receipt template admin controller ─────────────────────
// CRUD for ReceiptTemplate + test-print endpoint. Admin-only (routes enforce).
// The frontend sends CONFIGURATION only — never ESC/POS bytes.

import { Request, Response } from 'express';
import prisma from '../lib/db.js';
import { sanitizeTemplate, DEFAULT_TEMPLATE, ReceiptTemplate } from '../lib/receipt-template.js';
import { renderReceipt, buildPreviewOrder } from '../lib/receipt-renderer.js';
import { processLogo, LogoError } from '../lib/logo-processor.js';
import { auditLog } from '../lib/audit.js';

const TEMPLATE_SELECT = {
  id: true, name: true, type: true, isDefault: true, enabled: true,
  showLogo: true, logoUrl: true, logoAlignment: true, logoWidth: true,
  showBusinessName: true, businessName: true, showPhone: true, phone: true,
  showAddress: true, address: true, showInstagram: true, instagram: true,
  showOrderNumber: true, showDateTime: true, showOrderType: true,
  showCustomer: true, showCustomerPhone: true, showDeliveryAddress: true,
  showNotes: true, showQuantity: true, showItemName: true, showModifiers: true,
  showPrices: true, showSubtotal: true, showDeliveryFee: true, showDiscount: true,
  showTax: true, showTotal: true, showPaymentMethod: true, showFooter: true,
  footerText: true, footerAlignment: true, separatorStyle: true, fontSize: true,
  boldBusinessName: true, boldOrderNumber: true, boldTotal: true, lineWidth: true,
  paperWidth: true, characterWidth: true, createdAt: true, updatedAt: true,
} as const;

export async function listTemplates(_req: Request, res: Response): Promise<void> {
  const templates = await prisma.receiptTemplate.findMany({ orderBy: { createdAt: 'asc' } });
  res.json({ success: true, data: templates });
}

export async function getTemplate(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const t = await prisma.receiptTemplate.findUnique({ where: { id } });
  if (!t) { res.status(404).json({ success: false, error: 'Template not found' }); return; }
  res.json({ success: true, data: t });
}

export async function createTemplate(req: Request, res: Response): Promise<void> {
  const safe = sanitizeTemplate(req.body);
  const t = await prisma.receiptTemplate.create({ data: safe as any });
  auditLog(req, { action: 'create', entity: 'ReceiptTemplate', entityId: t.id, details: { name: t.name, type: t.type } });
  res.status(201).json({ success: true, data: t });
}

export async function updateTemplate(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const existing = await prisma.receiptTemplate.findUnique({ where: { id } });
  if (!existing) { res.status(404).json({ success: false, error: 'Template not found' }); return; }

  const safe = sanitizeTemplate({ ...existing, ...req.body });
  const t = await prisma.receiptTemplate.update({ where: { id }, data: safe as any });
  auditLog(req, { action: 'update', entity: 'ReceiptTemplate', entityId: t.id, details: { name: t.name } });
  res.json({ success: true, data: t });
}

export async function deleteTemplate(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const existing = await prisma.receiptTemplate.findUnique({ where: { id } });
  if (!existing) { res.status(404).json({ success: false, error: 'Template not found' }); return; }
  await prisma.receiptTemplate.delete({ where: { id } });
  auditLog(req, { action: 'delete', entity: 'ReceiptTemplate', entityId: id, details: { name: existing.name } });
  res.json({ success: true });
}

/** POST /api/admin/print/templates/:id/logo — upload + process logo (multipart). */
export async function uploadLogo(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const t = await prisma.receiptTemplate.findUnique({ where: { id } });
  if (!t) { res.status(404).json({ success: false, error: 'Template not found' }); return; }

  const file = (req as any).file;
  if (!file || !file.buffer) { res.status(400).json({ success: false, error: 'No file uploaded' }); return; }

  try {
    const processed = processLogo(file.buffer);
    // Store processed raster as base64 data URL (config, not raw ESC/POS)
    const logoData = `data:image/bmp;base64,${processed.data.toString('base64')}`;
    const updated = await prisma.receiptTemplate.update({
      where: { id },
      data: { logoUrl: logoData, showLogo: true, logoWidth: processed.width },
    });
    auditLog(req, { action: 'update', entity: 'ReceiptTemplate', entityId: id, details: { logo: true, w: processed.width, h: processed.height } });
    res.json({ success: true, data: { id: updated.id, logoUrl: logoData, width: processed.width, height: processed.height, bytes: processed.bytes } });
  } catch (e) {
    if (e instanceof LogoError) { res.status(e.status).json({ success: false, error: e.message }); return; }
    throw e;
  }
}

/** POST /api/admin/print/templates/:id/preview — render sample (never prints). */
export async function previewTemplate(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const t = await prisma.receiptTemplate.findUnique({ where: { id } });
  if (!t) { res.status(404).json({ success: false, error: 'Template not found' }); return; }
  const result = renderReceipt(buildPreviewOrder(), t as any);
  res.json({ success: true, data: { text: result.text, usedDefault: result.usedDefault } });
}

/** POST /api/admin/print/test — render + return ESC/POS bytes for a test print.
 *  The ADMIN UI calls this; the agent (or a paired device) prints the bytes.
 *  This endpoint NEVER sends to a printer directly — it returns the bytes
 *  so the caller can route them through the existing agent pipeline. */
export async function testPrint(req: Request, res: Response): Promise<void> {
  const templateId = (req.body?.templateId as string) || undefined;
  let template: any = null;
  if (templateId) {
    template = await prisma.receiptTemplate.findUnique({ where: { id: templateId } });
  }
  const result = renderReceipt(buildPreviewOrder(), template);
  res.json({ success: true, data: { text: result.text, usedDefault: result.usedDefault } });
}

/** GET /api/admin/print/templates/default — the effective default. */
export async function getDefault(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: DEFAULT_TEMPLATE });
}
