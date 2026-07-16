import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { generateToken } from '../../middleware/auth.js';

vi.mock('../../lib/db.js', () => {
  const mockPrisma = {
    customer: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    address: { deleteMany: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

import prisma from '../../lib/db.js';
const mockedPrisma = vi.mocked(prisma) as any;

const app = createApp();

const customerToken = generateToken({ id: 'cust-1', email: 'c@test.com', type: 'customer' });
const staffToken = generateToken({ id: 'staff-1', email: 's@test.com', type: 'staff', role: 'SUPER_ADMIN' });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DELETE /api/customers/me', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).delete('/api/customers/me');
    expect(res.status).toBe(401);
  });

  it('rejects staff tokens', async () => {
    const res = await request(app)
      .delete('/api/customers/me')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(401);
  });

  it('anonymises the customer in place and deletes addresses', async () => {
    mockedPrisma.customer.findUnique.mockResolvedValue({ id: 'cust-1', deletedAt: null });

    const res = await request(app)
      .delete('/api/customers/me')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { deleted: true } });
    expect(mockedPrisma.address.deleteMany).toHaveBeenCalledWith({ where: { customerId: 'cust-1' } });

    const update = mockedPrisma.customer.update.mock.calls[0][0];
    expect(update.where).toEqual({ id: 'cust-1' });
    expect(update.data.email).toMatch(/^deleted-.+@anonymised\.invalid$/);
    expect(update.data.password).toBeNull();
    expect(update.data.name).toBe('Deleted account');
    expect(update.data.phone).toBeNull();
    expect(update.data.expoPushToken).toBeNull();
    expect(update.data.loyaltyPoints).toBe(0);
    expect(update.data.deletedAt).toBeInstanceOf(Date);
  });

  it('returns 404 for an already-deleted account', async () => {
    mockedPrisma.customer.findUnique.mockResolvedValue({ id: 'cust-1', deletedAt: new Date() });

    const res = await request(app)
      .delete('/api/customers/me')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(404);
    expect(mockedPrisma.customer.update).not.toHaveBeenCalled();
  });
});

describe('POST /api/customers/deletion-request (public)', () => {
  it('rejects an invalid email', async () => {
    const res = await request(app)
      .post('/api/customers/deletion-request')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('accepts a valid request without authentication', async () => {
    const res = await request(app)
      .post('/api/customers/deletion-request')
      .send({ email: 'user@example.com', message: 'please delete me' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { received: true } });
  });
});
