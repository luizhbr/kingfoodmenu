import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app.js';

// Mock Prisma
vi.mock('../../lib/db.js', () => {
  const mockPrisma = {
    customer: { findUnique: vi.fn(), update: vi.fn() },
    passwordResetToken: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    refreshToken: { updateMany: vi.fn() },
    siteSettings: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

vi.mock('../../lib/email.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  passwordResetEmail: vi.fn().mockReturnValue({ subject: 'x', html: '<p>x</p>' }),
}));

import prisma from '../../lib/db.js';
import { sendEmail, passwordResetEmail } from '../../lib/email.js';

const app = createApp();
const mockedPrisma = vi.mocked(prisma);

function makeToken(): string {
  // 64 hex chars
  return 'a'.repeat(64);
}

function hashOf(token: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}

describe('Password Reset API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/customer/forgot-password', () => {
    it('returns generic message when email does NOT exist (no enumeration)', async () => {
      mockedPrisma.customer.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/customer/forgot-password')
        .send({ email: 'unknown@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('Se o email estiver cadastrado');
      expect(mockedPrisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('returns generic message when email exists and creates token (never logs token)', async () => {
      mockedPrisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1', email: 'user@example.com', password: 'hashed',
      } as any);
      mockedPrisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
      mockedPrisma.passwordResetToken.create.mockResolvedValue({ id: 't1' });

      const res = await request(app)
        .post('/api/auth/customer/forgot-password')
        .send({ email: 'user@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('Se o email estiver cadastrado');
      // token criado com hash sha256 (64 hex) — token puro nunca é armazenado
      const createCall = mockedPrisma.passwordResetToken.create.mock.calls[0][0];
      expect(createCall.data.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(passwordResetEmail).toHaveBeenCalled();
    });

    it('invalidates previous tokens of the same customer', async () => {
      mockedPrisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1', email: 'user@example.com', password: 'hash',
      } as any);
      mockedPrisma.passwordResetToken.updateMany.mockResolvedValue({ count: 2 });
      mockedPrisma.passwordResetToken.create.mockResolvedValue({ id: 't1' });

      await request(app).post('/api/auth/customer/forgot-password').send({ email: 'user@example.com' });

      expect(mockedPrisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { customerId: 'cust-1', usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
    });

    it('does NOT send email for customers without password (social-only account)', async () => {
      mockedPrisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1', email: 'social@example.com', password: null,
      } as any);

      const res = await request(app)
        .post('/api/auth/customer/forgot-password')
        .send({ email: 'social@example.com' });

      expect(res.status).toBe(200);
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/customer/reset-password', () => {
    const token = makeToken();

    it('rejects invalid token (not found)', async () => {
      mockedPrisma.passwordResetToken.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/customer/reset-password')
        .send({ token, password: 'newpass123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('inválido');
    });

    it('rejects already-used token (single use)', async () => {
      mockedPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1', customerId: 'cust-1', tokenHash: hashOf(token),
        expiresAt: new Date(Date.now() + 60000), usedAt: new Date(),
      } as any);

      const res = await request(app)
        .post('/api/auth/customer/reset-password')
        .send({ token, password: 'newpass123' });

      expect(res.status).toBe(400);
      expect(mockedPrisma.customer.update).not.toHaveBeenCalled();
    });

    it('rejects expired token', async () => {
      mockedPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1', customerId: 'cust-1', tokenHash: hashOf(token),
        expiresAt: new Date(Date.now() - 1000), usedAt: null,
      } as any);

      const res = await request(app)
        .post('/api/auth/customer/reset-password')
        .send({ token, password: 'newpass123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('expirado');
    });

    it('updates password (bcrypt cost 12), invalidates token and revokes refresh tokens', async () => {
      mockedPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1', customerId: 'cust-1', tokenHash: hashOf(token),
        expiresAt: new Date(Date.now() + 60000), usedAt: null,
        customer: { id: 'cust-1' },
      } as any);
      mockedPrisma.$transaction = vi.fn().mockImplementation(async (ops) => ops) as any;
      mockedPrisma.customer.update.mockResolvedValue({ id: 'cust-1' } as any);
      mockedPrisma.passwordResetToken.update.mockResolvedValue({ id: 't1', usedAt: new Date() } as any);
      mockedPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const res = await request(app)
        .post('/api/auth/customer/reset-password')
        .send({ token, password: 'newpass123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // bcrypt hash com cost 12 — verificar que o hash NÃO é texto plano
      const updateData = mockedPrisma.customer.update.mock.calls[0][0].data;
      expect(updateData.password).not.toBe('newpass123');
      const valid = await bcrypt.compare('newpass123', updateData.password);
      expect(valid).toBe(true);

      expect(mockedPrisma.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { usedAt: expect.any(Date) },
      });
      expect(mockedPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'cust-1', userType: 'customer', revoked: false },
        data: { revoked: true },
      });
    });

    it('rejects short password', async () => {
      const res = await request(app)
        .post('/api/auth/customer/reset-password')
        .send({ token, password: '123' });

      expect(res.status).toBe(400);
    });
  });
});
