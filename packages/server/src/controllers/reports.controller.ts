import { Request, Response } from 'express';
import { z } from 'zod';
import {
  computeRange,
  DateRange,
  getOverview,
  getCustomerStats,
  getTopProducts,
  getTopCategories,
  getCouponStats,
  getLoyaltyStats,
  getCashbackStats,
  getDeliveryStats,
  getAttributionStats,
  getDailyTrend,
  PeriodKey,
} from '../lib/reports-service.js';
import { buildReportWorkbook, workbookToBuffer } from '../lib/excel-service.js';

// ── Reports controller ───────────────────────────────────────────────────────
// Manager/Admin only (requireRole). The period filter is validated with zod;
// timezone is fixed to America/New_York (restaurant's commercial day).

const periodSchema = z.object({
  period: z.enum(['today', 'yesterday', '7d', '30d', 'month', 'prevMonth', 'custom']).default('30d'),
  start: z.string().optional(),
  end: z.string().optional(),
  tz: z.string().optional(),
});

function parsePeriod(req: Request, res: Response): DateRange | null {
  const parsed = periodSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid period filter' });
    return null;
  }
  const { period, start, end, tz } = parsed.data;

  // Custom range requires BOTH start and end, and start must be < end
  if (period === 'custom') {
    if (!start || !end) {
      res.status(400).json({ success: false, error: 'Custom period requires both start and end' });
      return null;
    }
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (Number.isNaN(s) || Number.isNaN(e)) {
      res.status(400).json({ success: false, error: 'Invalid date format' });
      return null;
    }
    if (s >= e) {
      res.status(400).json({ success: false, error: 'Start date must be before end date' });
      return null;
    }
  }

  return computeRange(period as PeriodKey, tz, start ?? undefined, end ?? undefined);
}

export async function getReportsOverview(req: Request, res: Response): Promise<void> {
  const range = parsePeriod(req, res);
  if (!range) return;
  const [overview, customers, daily] = await Promise.all([
    getOverview(range),
    getCustomerStats(range),
    getDailyTrend(range),
  ]);
  res.json({ success: true, data: { range: { start: range.start, end: range.end, label: range.label }, overview, customers, daily } });
}

export async function getReportsProducts(req: Request, res: Response): Promise<void> {
  const range = parsePeriod(req, res);
  if (!range) return;
  const [products, categories] = await Promise.all([
    getTopProducts(range),
    getTopCategories(range),
  ]);
  res.json({ success: true, data: { products, categories } });
}

export async function getReportsMarketing(req: Request, res: Response): Promise<void> {
  const range = parsePeriod(req, res);
  if (!range) return;
  const [attribution, coupons] = await Promise.all([
    getAttributionStats(range),
    getCouponStats(range),
  ]);
  res.json({ success: true, data: { attribution, coupons } });
}

export async function getReportsLoyalty(req: Request, res: Response): Promise<void> {
  const range = parsePeriod(req, res);
  if (!range) return;
  const [loyalty, cashback] = await Promise.all([
    getLoyaltyStats(range),
    getCashbackStats(range),
  ]);
  res.json({ success: true, data: { loyalty, cashback } });
}

export async function getReportsDelivery(req: Request, res: Response): Promise<void> {
  const range = parsePeriod(req, res);
  if (!range) return;
  const delivery = await getDeliveryStats(range);
  res.json({ success: true, data: delivery });
}

export async function getReportsSales(req: Request, res: Response): Promise<void> {
  const range = parsePeriod(req, res);
  if (!range) return;
  const overview = await getOverview(range);
  res.json({ success: true, data: overview });
}

export async function exportReportsExcel(req: Request, res: Response): Promise<void> {
  const range = parsePeriod(req, res);
  if (!range) return;

  try {
    const period = (req.query.period as PeriodKey) || '30d';
    const tzParam = req.query.tz as string | undefined;
    const startParam = req.query.start as string | undefined;
    const endParam = req.query.end as string | undefined;
    const workbook = await buildReportWorkbook(period, tzParam, startParam, endParam);
    const buffer = await workbookToBuffer(workbook);
    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="KingFood_Report_${dateStr}.xlsx"`,
    );
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('[reports] export failed', err);
    res.status(500).json({ success: false, error: 'Export failed' });
  }
}
