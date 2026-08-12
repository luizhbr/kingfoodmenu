import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma BEFORE importing print-service
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockFindMany = vi.fn();

vi.mock('../../lib/db.js', () => ({
  default: {
    printer: {
      findUnique: (...a: any[]) => mockFindUnique(...a),
      create: (...a: any[]) => mockCreate(...a),
      update: (...a: any[]) => mockUpdate(...a),
      updateMany: (...a: any[]) => mockUpdate(...a),
    },
    printJob: {
      create: (...a: any[]) => mockCreate(...a),
      findUnique: (...a: any[]) => mockFindUnique(...a),
      findMany: (...a: any[]) => mockFindMany(...a),
      update: (...a: any[]) => mockUpdate(...a),
    },
    order: {
      findUnique: (...a: any[]) => mockFindUnique(...a),
    },
  },
}));

import {
  canTransition,
  createPrintJob,
  transitionPrintJob,
  retryPrintJob,
  createPrinterPairing,
  pairPrinterDevice,
  buildKitchenTicket,
  renderTicketText,
  PrintError,
} from '../../lib/print-service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('KING PRINT - State Machine', () => {
  it('P15-UNIT-001 QUEUED → PRINTING → PRINTED is valid', () => {
    expect(canTransition('QUEUED', 'PRINTING')).toBe(true);
    expect(canTransition('PRINTING', 'PRINTED')).toBe(true);
  });

  it('P15-UNIT-002 PRINTED → anything is invalid (no double print)', () => {
    expect(canTransition('PRINTED', 'QUEUED')).toBe(false);
    expect(canTransition('PRINTED', 'PRINTING')).toBe(false);
    expect(canTransition('PRINTED', 'FAILED')).toBe(false);
  });

  it('P15-UNIT-003 FAILED → QUEUED (retry) is valid', () => {
    expect(canTransition('FAILED', 'QUEUED')).toBe(true);
  });

  it('P15-UNIT-004 QUEUED → CANCELLED is valid', () => {
    expect(canTransition('QUEUED', 'CANCELLED')).toBe(true);
  });
});

describe('KING PRINT - Idempotency', () => {
  it('P15-UNIT-005 createPrintJob returns created=true on first', async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 'p1', enabled: true }) // printer
      .mockResolvedValueOnce({ id: 'o1', status: 'CONFIRMED' }); // order
    mockCreate.mockResolvedValue({ id: 'j1', status: 'QUEUED' });
    const r = await createPrintJob({ orderId: 'o1', printerId: 'p1' });
    expect(r.created).toBe(true);
    expect(r.job.id).toBe('j1');
  });

  it('P15-UNIT-006 duplicate create returns existing job (idempotent)', async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 'p1', enabled: true })
      .mockResolvedValueOnce({ id: 'o1', status: 'CONFIRMED' });
    mockCreate.mockRejectedValue({ code: 'P2002' });
    mockFindUnique.mockResolvedValueOnce({ id: 'j1', status: 'QUEUED' });
    const r = await createPrintJob({ orderId: 'o1', printerId: 'p1' });
    expect(r.created).toBe(false);
    expect(r.job.id).toBe('j1');
  });

  it('P15-UNIT-007 idempotency key is orderId:type:printerId', async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 'p1', enabled: true })
      .mockResolvedValueOnce({ id: 'o1', status: 'CONFIRMED' });
    mockCreate.mockImplementation(({ data }) => Promise.resolve({ id: 'j1', key: data.idempotencyKey }));
    await createPrintJob({ orderId: 'o1', printerId: 'p1' });
    expect(mockCreate.mock.calls[0][0].data.idempotencyKey).toBe('o1:AUTO:p1');
  });
});

describe('KING PRINT - Validation', () => {
  it('P15-UNIT-008 printer not found → 404', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    await expect(createPrintJob({ orderId: 'o1', printerId: 'nope' })).rejects.toThrow(PrintError);
  });

  it('P15-UNIT-009 disabled printer → 400', async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 'p1', enabled: false });
    await expect(createPrintJob({ orderId: 'o1', printerId: 'p1' })).rejects.toThrow('disabled');
  });

  it('P15-UNIT-010 cancelled order → 400', async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 'p1', enabled: true })
      .mockResolvedValueOnce({ id: 'o1', status: 'CANCELLED' });
    await expect(createPrintJob({ orderId: 'o1', printerId: 'p1' })).rejects.toThrow('cancelled');
  });

  it('P15-UNIT-011 invalid transition throws', async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 'j1', status: 'PRINTED' });
    await expect(transitionPrintJob('j1', 'QUEUED')).rejects.toThrow('Invalid transition');
  });
});

describe('KING PRINT - Pairing', () => {
  it('P15-UNIT-012 pairing code is 8 hex chars', () => {
    mockFindUnique.mockResolvedValue({ id: 'p1' });
    mockUpdate.mockResolvedValue({});
    return createPrinterPairing('p1').then(({ code }) => {
      expect(code).toMatch(/^[0-9A-F]{8}$/);
    });
  });

  it('P15-UNIT-013 pairing code expires', async () => {
    mockFindUnique.mockResolvedValue({ id: 'p1' });
    mockUpdate.mockResolvedValue({});
    const { expiresAt } = await createPrinterPairing('p1', 10);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('P15-UNIT-014 wrong code → 401', async () => {
    mockFindUnique.mockResolvedValue({ id: 'p1', pairingCode: 'ABCD1234', pairingExpiresAt: new Date(Date.now() + 60000) });
    await expect(pairPrinterDevice('p1', 'WRONG', 'dev1')).rejects.toThrow('Invalid pairing code');
  });

  it('P15-UNIT-015 expired code → 401', async () => {
    mockFindUnique.mockResolvedValue({ id: 'p1', pairingCode: 'ABCD1234', pairingExpiresAt: new Date(Date.now() - 1000) });
    await expect(pairPrinterDevice('p1', 'ABCD1234', 'dev1')).rejects.toThrow('expired');
  });

  it('P15-UNIT-016 valid pairing clears code (single-use)', async () => {
    mockFindUnique.mockResolvedValue({ id: 'p1', pairingCode: 'ABCD1234', pairingExpiresAt: new Date(Date.now() + 60000) });
    mockUpdate.mockResolvedValue({});
    const r = await pairPrinterDevice('p1', 'ABCD1234', 'dev1');
    expect(r.paired).toBe(true);
    const updateData = mockUpdate.mock.calls[0][0].data;
    expect(updateData.pairingCode).toBeNull();
    expect(updateData.deviceId).toBe('dev1');
  });
});

describe('KING PRINT - Ticket template', () => {
  it('P15-UNIT-017 buildKitchenTicket includes order + lines', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'o1', orderNumber: 'KF-1045', createdAt: new Date(), orderType: 'DELIVERY',
      status: 'CONFIRMED', guestName: 'Test', deliveryFormattedAddress: '123 Main St',
      comment: null, customer: null,
      items: [{ name: 'Açaí 500ml', quantity: 2, comment: null, options: [{ name: 'Sensação' }] }],
    });
    const t = await buildKitchenTicket('o1');
    expect(t.orderNumber).toBe('KF-1045');
    expect(t.lines[0].name).toBe('Açaí 500ml');
    expect(t.lines[0].qty).toBe(2);
    expect(t.lines[0].options).toContain('Sensação');
  });

  it('P15-UNIT-018 renderTicketText has order number and lines', async () => {
    const text = renderTicketText({
      orderNumber: 'KF-1045', createdAt: new Date().toISOString(), orderType: 'DELIVERY',
      status: 'CONFIRMED', lines: [{ name: 'Bowl', qty: 1 }],
    });
    expect(text).toContain('KF-1045');
    expect(text).toContain('1x Bowl');
    expect(text).toContain('KING FOOD');
  });

  it('P15-UNIT-019 58mm paper uses narrower width', () => {
    const text = renderTicketText({
      orderNumber: 'KF-1', createdAt: new Date().toISOString(), orderType: 'PICKUP',
      status: 'CONFIRMED', lines: [{ name: 'X', qty: 1 }],
    }, 58);
    const line = text.split('\n')[0];
    expect(line.length).toBeLessThanOrEqual(32);
  });
});
