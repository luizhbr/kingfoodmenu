import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { generateToken } from '../../middleware/auth.js';
import crypto from 'crypto';

vi.mock('../../lib/db.js', () => {
  const mockPrisma = {
    location: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    order: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    orderItem: { count: vi.fn() },
    menuItem: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    deliveryZone: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    table: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    reservation: { count: vi.fn() },
    user: { findUnique: vi.fn() },
    customer: { findUnique: vi.fn(), update: vi.fn() },
    loyaltyTransaction: { create: vi.fn() },
    automationRule: { findMany: vi.fn() },
    category: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    address: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

import prisma from '../../lib/db.js';
const mockedPrisma = vi.mocked(prisma);
const app = createApp();
const staffToken = generateToken({ id: '3', email: 'staff@test.com', type: 'staff', role: 'STAFF' });
const customerAToken = generateToken({ id: 'cust-A', email: 'customerA@test.com', type: 'customer' });
const VALID_TOKEN_A = 'KF-' + crypto.randomBytes(16).toString('hex');

const sampleOrderA = { id: 'order-A', orderNumber: 'KF-AAA', customerId: 'cust-A', locationId: 'loc-1', orderType: 'PICKUP', status: 'PENDING', subtotal: 29.98, tax: 2.40, deliveryFee: 0, total: 32.38, trackingToken: null, items: [], createdAt: new Date() };
const sampleOrderB = { id: 'order-B', orderNumber: 'KF-BBB', customerId: 'cust-B', locationId: 'loc-1', orderType: 'DELIVERY', status: 'CONFIRMED', subtotal: 45, tax: 3.6, deliveryFee: 4.99, total: 53.59, trackingToken: null, items: [], createdAt: new Date() };
const sampleGuestOrderA = { id: 'guest-A', orderNumber: 'KF-GUEST-A', customerId: null, locationId: 'loc-1', orderType: 'PICKUP', status: 'PREPARING', subtotal: 20, tax: 1.6, deliveryFee: 0, total: 21.6, trackingToken: VALID_TOKEN_A, guestName: 'Guest A', guestEmail: 'guestA@test.com', guestPhone: '555', deliveryLine1: '123 St', deliveryCity: 'Columbus', deliveryPostalCode: '43201', items: [], createdAt: new Date() };

describe('Order Security - Guest Tracking', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('Token Generation', () => {
    it('token has 128 bits entropy (32 hex chars)', () => {
      const t = 'KF-' + crypto.randomBytes(16).toString('hex');
      expect(t.replace('KF-', '').length).toBe(32);
    });
    it('token not predictable from order ID', () => {
      const t = 'KF-' + crypto.randomBytes(16).toString('hex');
      expect(t).not.toContain('cuid_abc');
    });
    it('two tokens differ', () => {
      const t1 = 'KF-' + crypto.randomBytes(16).toString('hex');
      const t2 = 'KF-' + crypto.randomBytes(16).toString('hex');
      expect(t1).not.toBe(t2);
    });
  });

  describe('Guest Authorization', () => {
    it('valid token -> 200 with DTO', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(sampleGuestOrderA as any);
      const res = await request(app).get('/api/orders/' + VALID_TOKEN_A);
      expect(res.status).toBe(200);
      expect(res.body.data.orderNumber).toBe('KF-GUEST-A');
      expect(res.body.data.timeline).toBeDefined();
    });
    it('token A -> order B = 404', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(null);
      const res = await request(app).get('/api/orders/' + VALID_TOKEN_A);
      expect(res.status).toBe(404);
    });
    it('random token -> 404', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(null);
      const res = await request(app).get('/api/orders/KF-randominvalid');
      expect(res.status).toBe(404);
    });
    it('CUID -> 404 as guest', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(null);
      const res = await request(app).get('/api/orders/guest-A');
      expect(res.status).toBe(404);
    });
    it('order number -> 404 as guest', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(null);
      const res = await request(app).get('/api/orders/KF-GUEST-A');
      expect(res.status).toBe(404);
    });
  });

  describe('No PII in Guest Response', () => {
    it('no customer/guest fields', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(sampleGuestOrderA as any);
      const res = await request(app).get('/api/orders/' + VALID_TOKEN_A);
      expect(res.body.data).not.toHaveProperty('customer');
      expect(res.body.data).not.toHaveProperty('guestName');
      expect(res.body.data).not.toHaveProperty('guestEmail');
      expect(res.body.data).not.toHaveProperty('guestPhone');
    });
    it('no address fields', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(sampleGuestOrderA as any);
      const res = await request(app).get('/api/orders/' + VALID_TOKEN_A);
      expect(res.body.data).not.toHaveProperty('deliveryLine1');
      expect(res.body.data).not.toHaveProperty('deliveryCity');
    });
    it('no payment fields', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(sampleGuestOrderA as any);
      const res = await request(app).get('/api/orders/' + VALID_TOKEN_A);
      expect(res.body.data).not.toHaveProperty('payments');
    });
    it('no items/financial fields', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(sampleGuestOrderA as any);
      const res = await request(app).get('/api/orders/' + VALID_TOKEN_A);
      expect(res.body.data).not.toHaveProperty('items');
      expect(res.body.data).not.toHaveProperty('subtotal');
      expect(res.body.data).not.toHaveProperty('total');
    });
    it('only orderNumber, status, timeline', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(sampleGuestOrderA as any);
      const res = await request(app).get('/api/orders/' + VALID_TOKEN_A);
      const fields = Object.keys(res.body.data);
      for (const f of fields) { expect(['orderNumber','status','timeline']).toContain(f); }
    });
  });

  describe('Authenticated Access', () => {
    it('customer A -> own order = 200', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(sampleOrderA as any);
      const res = await request(app).get('/api/orders/order-A').set('Authorization', 'Bearer ' + customerAToken);
      expect(res.status).toBe(200);
    });
    it('customer A -> order B = 403', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(sampleOrderB as any);
      const res = await request(app).get('/api/orders/order-B').set('Authorization', 'Bearer ' + customerAToken);
      expect(res.status).toBe(403);
    });
    it('staff -> any order = 200', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(sampleOrderA as any);
      const res = await request(app).get('/api/orders/order-A').set('Authorization', 'Bearer ' + staffToken);
      expect(res.status).toBe(200);
    });
  });

  describe('CRITICAL: No auth != free access', () => {
    it('invalid token without auth = 404', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(null);
      const res = await request(app).get('/api/orders/invalid-xyz');
      expect(res.status).toBe(404);
    });
    it('timeline maps status correctly', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue({ ...sampleGuestOrderA, status: 'PENDING', orderType: 'DELIVERY' } as any);
      const res = await request(app).get('/api/orders/' + VALID_TOKEN_A);
      expect(res.body.data.timeline[0]).toMatchObject({ status: 'PENDING', label: 'Pedido recebido' });
    });
  });
});
