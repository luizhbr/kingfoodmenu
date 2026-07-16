import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';

vi.mock('../../lib/db.js', () => {
  const mockPrisma = {
    order: { findUnique: vi.fn(), update: vi.fn() },
    payment: { findFirst: vi.fn(), create: vi.fn() },
    customer: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

const stripeCreateIntent = vi.fn();
vi.mock('../../lib/stripe.js', () => ({
  getStripe: vi.fn(async () => ({ paymentIntents: { create: stripeCreateIntent } })),
  default: { paymentIntents: { create: vi.fn() }, webhooks: { constructEvent: vi.fn() } },
}));

import prisma from '../../lib/db.js';
const mockedPrisma = vi.mocked(prisma) as any;

const app = createApp();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/payments/create-intent — fully discounted order', () => {
  it('skips Stripe, marks the order paid + confirmed, returns free flag', async () => {
    mockedPrisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'IK-1',
      total: 0,
      customer: { email: 'c@test.com', name: 'C' },
      guestEmail: null,
      guestName: null,
    });
    mockedPrisma.payment.findFirst.mockResolvedValue(null);

    const res = await request(app).post('/api/payments/create-intent').send({ orderId: 'order-1' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ clientSecret: null, free: true });
    expect(stripeCreateIntent).not.toHaveBeenCalled();
    expect(mockedPrisma.payment.create).toHaveBeenCalledWith({
      data: { orderId: 'order-1', method: 'STRIPE', status: 'COMPLETED', amount: 0 },
    });
    expect(mockedPrisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'CONFIRMED' },
    });
  });

  it('still charges via Stripe for a non-zero total', async () => {
    mockedPrisma.order.findUnique.mockResolvedValue({
      id: 'order-2',
      orderNumber: 'IK-2',
      total: 12.5,
      customer: { email: 'c@test.com', name: 'C' },
      guestEmail: null,
      guestName: null,
    });
    mockedPrisma.payment.findFirst.mockResolvedValue(null);
    stripeCreateIntent.mockResolvedValue({ id: 'pi_1', client_secret: 'secret_1' });

    const res = await request(app).post('/api/payments/create-intent').send({ orderId: 'order-2' });

    expect(res.status).toBe(200);
    expect(res.body.data.clientSecret).toBe('secret_1');
    expect(stripeCreateIntent).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1250, currency: 'eur' }),
    );
  });
});
