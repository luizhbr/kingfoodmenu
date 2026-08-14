import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrinterFindMany = vi.fn();
const mockPrintJobCreate = vi.fn();

vi.mock('../../lib/db.js', () => ({
  default: {
    printer: { findMany: (...a: any[]) => mockPrinterFindMany(...a) },
    printJob: { create: (...a: any[]) => mockPrintJobCreate(...a) },
    automationRule: { findMany: vi.fn() },
  },
}));

import { appEvents } from '../../lib/events.js';

beforeEach(() => {
  vi.clearAllMocks();
});

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('P0-004 Auto-print idempotency', () => {
  it('P0-004-01 first CONFIRM creates one AUTO job per enabled printer', async () => {
    mockPrinterFindMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    mockPrintJobCreate.mockResolvedValue({ id: 'job-id' });

    appEvents.emit('order.statusChanged', { order: { id: 'o1', status: 'CONFIRMED' }, previousStatus: 'PENDING' });
    await wait(50);

    expect(mockPrintJobCreate).toHaveBeenCalledTimes(2);
    expect(mockPrintJobCreate).toHaveBeenCalledWith(
      { data: expect.objectContaining({ orderId: 'o1', printerId: 'p1', type: 'AUTO', idempotencyKey: 'o1:AUTO:p1' }) }
    );
    expect(mockPrintJobCreate).toHaveBeenCalledWith(
      { data: expect.objectContaining({ orderId: 'o1', printerId: 'p2', type: 'AUTO', idempotencyKey: 'o1:AUTO:p2' }) }
    );
  });

  it('P0-004-02 duplicate CONFIRM (previousStatus=CONFIRMED) is ignored', async () => {
    mockPrinterFindMany.mockResolvedValue([{ id: 'p1' }]);
    mockPrintJobCreate.mockResolvedValue({ id: 'job-id' });

    appEvents.emit('order.statusChanged', { order: { id: 'o1', status: 'CONFIRMED' }, previousStatus: 'CONFIRMED' });
    await wait(50);

    expect(mockPrinterFindMany).not.toHaveBeenCalled();
    expect(mockPrintJobCreate).not.toHaveBeenCalled();
  });

  it('P0-004-03 concurrent CONFIRM events use the unique constraint and do not error', async () => {
    mockPrinterFindMany.mockResolvedValue([{ id: 'p1' }]);
    let calls = 0;
    mockPrintJobCreate.mockImplementation(() => {
      calls += 1;
      if (calls === 1) return Promise.resolve({ id: 'job-1' });
      const err = new Error('Unique constraint failed') as any;
      err.code = 'P2002';
      return Promise.reject(err);
    });

    const p1 = appEvents.emit('order.statusChanged', { order: { id: 'o2', status: 'CONFIRMED' }, previousStatus: 'PENDING' });
    const p2 = appEvents.emit('order.statusChanged', { order: { id: 'o2', status: 'CONFIRMED' }, previousStatus: 'PENDING' });
    await wait(100);

    expect(mockPrintJobCreate).toHaveBeenCalledTimes(2);
    // Handler catches P2002 silently, so no unhandled rejection
  });
});
