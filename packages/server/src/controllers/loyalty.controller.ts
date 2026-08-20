import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import crypto from 'crypto';

// ── Configurable loyalty settings (SiteSettings.loyaltySettings) ────────────
// Defaults mirror the pre-panel behaviour (1 pt = $1 spent, 100 pts = $1, 5% cashback).
const DEFAULT_LOYALTY = {
  pointsPerDollar: 1,
  pointsValue: 0.01,
  cashbackPercent: 0.05,
  minRedeemPoints: 100,
};

export async function getLoyaltySettingsValue(): Promise<{
  pointsPerDollar: number;
  pointsValue: number;
  cashbackPercent: number;
  minRedeemPoints: number;
}> {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const raw = (settings as any)?.loyaltySettings;
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_LOYALTY };
    return {
      pointsPerDollar: Number.isFinite(Number(raw.pointsPerDollar)) && Number(raw.pointsPerDollar) > 0
        ? Number(raw.pointsPerDollar) : DEFAULT_LOYALTY.pointsPerDollar,
      pointsValue: Number.isFinite(Number(raw.pointsValue)) && Number(raw.pointsValue) > 0
        ? Number(raw.pointsValue) : DEFAULT_LOYALTY.pointsValue,
      cashbackPercent: Number.isFinite(Number(raw.cashbackPercent))
        ? Number(raw.cashbackPercent) : DEFAULT_LOYALTY.cashbackPercent,
      minRedeemPoints: Number.isInteger(Number(raw.minRedeemPoints)) && Number(raw.minRedeemPoints) > 0
        ? Number(raw.minRedeemPoints) : DEFAULT_LOYALTY.minRedeemPoints,
    };
  } catch {
    return { ...DEFAULT_LOYALTY };
  }
}

// ── Customer endpoints ───────────────────────────────────────────────────────

export async function getBalance(req: Request, res: Response): Promise<void> {
  const customerId = req.user?.id;
  if (!customerId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const [customer, loyalty, rewards, redemptions] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      select: { loyaltyPoints: true },
    }),
    getLoyaltySettingsValue(),
    prisma.loyaltyReward.findMany({
      where: { isActive: true },
      orderBy: { pointsCost: 'asc' },
    }),
    prisma.loyaltyRedemption.findMany({
      where: { customerId, status: 'ISSUED' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, couponCode: true, pointsCost: true, reward: { select: { name: true } }, createdAt: true },
    }),
  ]);

  if (!customer) {
    res.status(404).json({ success: false, error: 'Customer not found' });
    return;
  }

  const transactions = await prisma.loyaltyTransaction.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      order: { select: { orderNumber: true } },
    },
  });

  res.json({
    success: true,
    data: {
      points: customer.loyaltyPoints,
      dollarValue: Math.round(customer.loyaltyPoints * loyalty.pointsValue * 100) / 100,
      pointsValue: loyalty.pointsValue,
      minRedeemPoints: loyalty.minRedeemPoints,
      transactions,
      rewards,
      redemptions,
    },
  });
}

const redeemSchema = z.object({
  points: z.number().int().min(1),
});

export async function redeemPoints(req: Request, res: Response): Promise<void> {
  const customerId = req.user?.id;
  if (!customerId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const parsed = redeemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const [customer, loyalty] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    getLoyaltySettingsValue(),
  ]);
  if (!customer) {
    res.status(404).json({ success: false, error: 'Customer not found' });
    return;
  }

  const { points } = parsed.data;
  if (points < loyalty.minRedeemPoints) {
    res.status(400).json({ success: false, error: `Minimum ${loyalty.minRedeemPoints} points to redeem` });
    return;
  }
  if (customer.loyaltyPoints < points) {
    res.status(400).json({ success: false, error: 'Insufficient points' });
    return;
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: { loyaltyPoints: { decrement: points } },
  });

  const transaction = await prisma.loyaltyTransaction.create({
    data: {
      customerId,
      type: 'REDEEM',
      points: -points,
      description: 'Points redeemed',
    },
  });

  res.json({
    success: true,
    data: {
      redeemed: points,
      remaining: customer.loyaltyPoints - points,
      transaction,
    },
  });
}

const adjustSchema = z.object({
  points: z.number().int(),
  description: z.string().optional(),
});

export async function adjustPoints(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id: customerId } = req.params;
  const parsed = adjustSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    res.status(404).json({ success: false, error: 'Customer not found' });
    return;
  }

  const newBalance = customer.loyaltyPoints + parsed.data.points;
  if (newBalance < 0) {
    res.status(400).json({ success: false, error: 'Adjustment would result in negative balance' });
    return;
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: { loyaltyPoints: newBalance },
  });

  const transaction = await prisma.loyaltyTransaction.create({
    data: {
      customerId,
      type: 'ADJUST',
      points: parsed.data.points,
      description: parsed.data.description || 'Manual adjustment',
    },
  });

  res.json({
    success: true,
    data: { points: newBalance, transaction },
  });
}

// ── Rewards (staff) ──────────────────────────────────────────────────────────

export async function listRewards(_req: Request, res: Response): Promise<void> {
  const rewards = await prisma.loyaltyReward.findMany({ orderBy: { pointsCost: 'asc' } });
  res.json({ success: true, data: rewards });
}

const rewardSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  pointsCost: z.number().int().min(1),
  value: z.number().min(0.01),
  isActive: z.boolean().optional(),
});

export async function createReward(req: Request, res: Response): Promise<void> {
  const parsed = rewardSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }
  const reward = await prisma.loyaltyReward.create({ data: parsed.data });
  res.status(201).json({ success: true, data: reward });
}

export async function updateReward(req: Request<{ id: string }>, res: Response): Promise<void> {
  const parsed = rewardSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }
  const reward = await prisma.loyaltyReward.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json({ success: true, data: reward });
}

export async function deleteReward(req: Request<{ id: string }>, res: Response): Promise<void> {
  await prisma.loyaltyReward.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}

// ── Redeem a reward (customer) → issues a unique single-use coupon ───────────

const redeemRewardSchema = z.object({
  rewardId: z.string().min(1),
});

function generateCouponCode(): string {
  return `KF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function redeemReward(req: Request, res: Response): Promise<void> {
  const customerId = req.user?.id;
  if (!customerId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const parsed = redeemRewardSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const reward = await prisma.loyaltyReward.findUnique({ where: { id: parsed.data.rewardId } });
  if (!reward || !reward.isActive) {
    res.status(404).json({ success: false, error: 'Reward not found or inactive' });
    return;
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    res.status(404).json({ success: false, error: 'Customer not found' });
    return;
  }
  if (customer.loyaltyPoints < reward.pointsCost) {
    res.status(400).json({ success: false, error: 'Insufficient points' });
    return;
  }

  // ATOMIC: debit points + create redemption + create the coupon
  const couponCode = generateCouponCode();
  const redemption = await prisma.$transaction(async (tx) => {
    const updated = await tx.customer.update({
      where: { id: customerId },
      data: { loyaltyPoints: { decrement: reward.pointsCost } },
    });

    await tx.loyaltyTransaction.create({
      data: {
        customerId,
        type: 'REDEEM',
        points: -reward.pointsCost,
        description: `Reward: ${reward.name}`,
      },
    });

    const redemptionRow = await tx.loyaltyRedemption.create({
      data: {
        rewardId: reward.id,
        customerId,
        pointsCost: reward.pointsCost,
        couponCode,
      },
    });

    await tx.coupon.create({
      data: {
        code: couponCode,
        type: 'FIXED',
        value: reward.value,
        minOrder: 0,
        perCustomer: 1,
        usageLimit: 1,
        isActive: true,
      },
    });

    return { redemption: redemptionRow, remaining: updated.loyaltyPoints };
  });

  res.status(201).json({
    success: true,
    data: {
      couponCode,
      rewardName: reward.name,
      value: reward.value,
      remainingPoints: redemption.remaining,
      redemption: redemption.redemption,
    },
  });
}
