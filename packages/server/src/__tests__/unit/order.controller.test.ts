import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { getOrder } from '../../controllers/order.controller';
import prisma from '../../lib/db';

// Mock the Prisma client
vi.mock('../../lib/db.js', () => ({
  __esModule: true,
  default: {
    order: {
      findUnique: vi.fn(),
    },
  },
}));

describe('GET /api/orders/:id – guest tracking (unit)', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  const sampleOrder = {
    id: 'order-123',
    orderNumber: 'KA-ABC-123',
    customerId: null,
    status: 'PREPARING',
    orderType: 'PICKUP',
  };

  it('should return 200 for guest with existing order (minimal DTO, no PII)', async () => {
    prisma.order.findUnique.mockResolvedValue(sampleOrder);

    const req = { params: { id: 'order-123' }, user: undefined, headers: {} } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await getOrder(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    // Contrato de seguranca: guest recebe apenas o DTO minimo (orderNumber,
    // status, timeline) — sem PII, sem pagamento, sem items.
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        orderNumber: 'KA-ABC-123',
        status: 'PREPARING',
        timeline: [
          { status: 'PENDING', label: 'Pedido recebido', completed: true },
          { status: 'CONFIRMED', label: 'Pedido aceito', completed: true },
          { status: 'PREPARING', label: 'Em preparo', completed: true },
          { status: 'READY', label: 'Pronto', completed: false },
          { status: 'PICKED_UP', label: 'Retirado', completed: false },
        ],
      },
    });
  });

  it('should return 404 for non‑existent order', async () => {
    prisma.order.findUnique.mockResolvedValue(null);

    const req = { params: { id: 'unknown' }, user: undefined, headers: {} } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await getOrder(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Order not found',
    });
  });

  it('should return 200 for authenticated owner', async () => {
    const orderWithCustomer = { ...sampleOrder, customerId: 'cust-456' };
    prisma.order.findUnique.mockResolvedValue(orderWithCustomer);

    const req = { params: { id: 'order-123' }, user: { id: 'cust-456', type: 'customer' }, headers: {} } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await getOrder(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: orderWithCustomer,
    });
  });

  it('should return 200 for staff', async () => {
    const orderWithCustomer = { ...sampleOrder, customerId: 'cust-456' };
    prisma.order.findUnique.mockResolvedValue(orderWithCustomer);

    const req = { params: { id: 'order-123' }, user: { id: 'staff-789', type: 'staff' }, headers: {} } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await getOrder(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: orderWithCustomer,
    });
  });

  it('should return 403 for authenticated non‑owner', async () => {
    const orderWithCustomer = { ...sampleOrder, customerId: 'cust-456' };
    prisma.order.findUnique.mockResolvedValue(orderWithCustomer);

    const req = { params: { id: 'order-123' }, user: { id: 'cust-999', type: 'customer' }, headers: {} } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await getOrder(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Access denied',
    });
  });

  it('should propagate database errors (throw)', async () => {
    const dbError = new Error('DB failure');
    prisma.order.findUnique.mockRejectedValue(dbError);

    const req = { params: { id: 'order-123' }, user: undefined, headers: {} } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    await expect(getOrder(req, res, next)).rejects.toThrow(dbError);
    expect(next).not.toHaveBeenCalled();
  });
});
