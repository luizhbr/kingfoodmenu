import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { getOrCreateWallet, adjustCashback, CashbackError } from '../lib/cashback-service.js';

// ── Customer endpoints — identity ALWAYS from the JWT (req.user.id) ──────────

export async function getBalance(req: Request, res: Response): Promise<void> {
  if (!req.user || req.user.type !== 'customer') {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  const wallet = await getOrCreateWallet(req.user.id);
  res.json({ success: true, data: { balance: wallet.balance } });
}

export async function getTransactions(req: Request, res: Response): Promise<void> {
  if (!req.user || req.user.type !== 'customer') {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  const wallet = await getOrCreateWallet(req.user.id);
  const transactions = await prisma.cashbackTransaction.findMany({
    where: { customerId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { order: { select: { orderNumber: true } } },
  });
  res.json({ success: true, data: transactions });
}

// ── Staff endpoints (RBAC server-side) ───────────────────────────────────────

const adjustSchema = z.object({
  amount: z.number(),
  reason: z.string().min(3).max(300),
});

export async function adjustBalance(req: Request<{ id: string }>, res: Response): Promise<void> {
  const parsed = adjustSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }
  try {
    const result = await adjustCashback(req.params.id, parsed.data.amount, parsed.data.reason);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof CashbackError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    throw err;
  }
}

export async function getCustomerWallet(req: Request<{ id: string }>, res: Response): Promise<void> {
  const wallet = await getOrCreateWallet(req.params.id);
  const transactions = await prisma.cashbackTransaction.findMany({
    where: { customerId: req.params.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ success: true, data: { wallet, transactions } });
}
