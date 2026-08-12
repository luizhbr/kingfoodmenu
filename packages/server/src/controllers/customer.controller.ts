import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';

// ── Customer profile ─────────────────────────────────────────────────────────
// The authenticated identity comes from the JWT (req.user), NEVER from a
// customerId sent by the client. This prevents IDOR / privilege escalation.

const updateProfileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  phone: z.string().max(30).nullable().optional(),
});

export async function getCustomerProfile(req: Request, res: Response): Promise<void> {
  if (!req.user || req.user.type !== 'customer') {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const customer = await prisma.customer.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isGuest: true,
      loyaltyPoints: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });

  if (!customer) {
    res.status(404).json({ success: false, error: 'Customer not found' });
    return;
  }

  res.json({ success: true, data: customer });
}

export async function updateCustomerProfile(req: Request, res: Response): Promise<void> {
  if (!req.user || req.user.type !== 'customer') {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const customer = await prisma.customer.update({
    where: { id: req.user.id },
    data: parsed.data,
    select: { id: true, name: true, email: true, phone: true, isGuest: true },
  });

  res.json({ success: true, data: customer });
}

// ── Order history (own orders only) ──────────────────────────────────────────
// IDOR-safe: the customerId always comes from the token. A customer can never
// query another customer's orders.

export async function getCustomerOrders(req: Request, res: Response): Promise<void> {
  if (!req.user || req.user.type !== 'customer') {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: req.user.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderType: true,
        subtotal: true,
        tax: true,
        deliveryFee: true,
        total: true,
        createdAt: true,
        items: {
          select: { id: true, name: true, quantity: true, unitPrice: true, subtotal: true },
        },
      },
    }),
    prisma.order.count({ where: { customerId: req.user.id } }),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
