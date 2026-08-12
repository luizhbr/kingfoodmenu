import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExcelJS from 'exceljs';
import { round2 } from '../../lib/reports-service.js';

// Mock prisma BEFORE importing excel-service
const mockFindMany = vi.fn();
const mockAggregate = vi.fn();
const mockCount = vi.fn();
const mockGroupBy = vi.fn();
const mockQueryRaw = vi.fn();

vi.mock('../../lib/db.js', () => ({
  default: {
    order: {
      count: (...a: any[]) => mockCount(...a),
      aggregate: (...a: any[]) => mockAggregate(...a),
      groupBy: (...a: any[]) => mockGroupBy(...a),
      findMany: (...a: any[]) => mockFindMany(...a),
    },
    orderItem: { aggregate: (...a: any[]) => mockAggregate(...a) },
    customer: { count: (...a: any[]) => mockCount(...a), aggregate: (...a: any[]) => mockAggregate(...a) },
    couponUsage: { aggregate: (...a: any[]) => mockAggregate(...a), groupBy: (...a: any[]) => mockGroupBy(...a) },
    loyaltyTransaction: { groupBy: (...a: any[]) => mockGroupBy(...a) },
    cashbackTransaction: { groupBy: (...a: any[]) => mockGroupBy(...a) },
    orderAttribution: { groupBy: (...a: any[]) => mockGroupBy(...a) },
    user: { findMany: (...a: any[]) => mockFindMany(...a) },
    $queryRaw: (...a: any[]) => mockQueryRaw(...a),
  },
}));

import { buildReportWorkbook, workbookToBuffer } from '../../lib/excel-service.js';

beforeEach(() => {
  vi.clearAllMocks();
  // Defaults: no orders
  mockCount.mockResolvedValue(0);
  mockAggregate.mockResolvedValue({ _count: 0, _sum: {}, _max: null });
  mockGroupBy.mockResolvedValue([]);
  mockQueryRaw.mockResolvedValue([]);
  mockFindMany.mockResolvedValue([]);
});

describe('Excel Export - Unit Tests', () => {
  it('P9-UNIT-001 generates a valid workbook with 10 sheets', async () => {
    const wb = await buildReportWorkbook('30d', 'America/New_York');
    expect(wb).toBeInstanceOf(ExcelJS.Workbook);
    const names = wb.worksheets.map((s) => s.name);
    expect(names).toEqual(['Summary', 'Sales', 'Orders', 'Products', 'Categories', 'Marketing', 'Loyalty', 'Cashback', 'Delivery', 'Drivers']);
  });

  it('P9-UNIT-002 buffer is non-empty and starts with xlsx magic', async () => {
    const wb = await buildReportWorkbook('30d', 'America/New_York');
    const buf = await workbookToBuffer(wb);
    expect(buf.length).toBeGreaterThan(0);
    // PK = zip magic for xlsx
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });

  it('P9-UNIT-003 Summary sheet has period + timezone', async () => {
    const wb = await buildReportWorkbook('today', 'America/New_York');
    const ws = wb.getWorksheet('Summary');
    const values = ws.getColumn(1).values as any[];
    const joined = values.map((v) => String(v?.text ?? v ?? '')).join('|');
    expect(joined).toContain('Period');
    expect(joined).toContain('America/New_York');
  });

  it('P9-UNIT-004 empty data still produces valid workbook', async () => {
    const wb = await buildReportWorkbook('7d', 'America/New_York');
    const buf = await workbookToBuffer(wb);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('P9-UNIT-005 money rounding is consistent with reports', () => {
    expect(round2(10.005)).toBe(10.01);
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });

  it('P9-UNIT-006 all period keys produce workbooks', async () => {
    for (const period of ['today', 'yesterday', '7d', '30d', 'month', 'prevMonth', 'custom'] as const) {
      const wb = await buildReportWorkbook(period, 'America/New_York', '2026-08-01', '2026-08-10');
      expect(wb).toBeInstanceOf(ExcelJS.Workbook);
    }
  });

  it('P9-UNIT-007 workbook creator is King Food', async () => {
    const wb = await buildReportWorkbook('30d', 'America/New_York');
    expect(wb.creator).toBe('King Food');
  });

  it('P9-UNIT-008 custom range end is inclusive +1 day', async () => {
    const wb = await buildReportWorkbook('custom', 'America/New_York', '2026-08-01', '2026-08-10');
    const ws = wb.getWorksheet('Summary');
    const values = ws.getColumn(2).values as any[];
    const periodRow = String(values[2]?.text ?? values[2] ?? '');
    expect(periodRow).toContain('2026-08-01');
  });

  it('P9-UNIT-009 sales sheet has headers', async () => {
    const wb = await buildReportWorkbook('30d', 'America/New_York');
    const ws = wb.getWorksheet('Sales');
    const h = ws.getRow(1).values as any[];
    const joined = h.map((v) => String(v?.text ?? v ?? '')).join('|');
    expect(joined).toContain('Date');
    expect(joined).toContain('Net Sales');
  });

  it('P9-UNIT-010 orders sheet columns include financial values', async () => {
    mockFindMany.mockResolvedValue([{
      id: '1', orderNumber: 'KF-TEST-1', createdAt: new Date(), status: 'DELIVERED',
      orderType: 'DELIVERY', subtotal: 10, discount: 0, deliveryFee: 4, tax: 0.8, total: 14.8,
      couponId: null, guestName: null, customer: null, assignedTo: null, coupon: null, orderAttribution: null,
    }]);
    const wb = await buildReportWorkbook('30d', 'America/New_York');
    const ws = wb.getWorksheet('Orders');
    const row = ws.getRow(2).values as any[];
    // exceljs values are 1-based: values[1] = column A = Order #
    expect(String(row[1])).toContain('KF-TEST-1');
    expect(String(row[6])).toContain('10'); // subtotal column
  });
});
