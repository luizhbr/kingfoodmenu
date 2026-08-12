import prisma from './db.js';

// ── Cashback service ─────────────────────────────────────────────────────────
// Wallet = readable balance. Ledger (CashbackTransaction) = audit source of
// truth. All money movement is ATOMIC (single Prisma transaction) and
// idempotent (unique constraint on [type, referenceId]).
//
// Order of operations in checkout:
//   1. compute subtotal server-side
//   2. apply coupon discount
//   3. eligibleBase = subtotal - couponDiscount   (cashback base)
//   4. compute cashback on eligibleBase
//   5. apply cashback used by customer (DEBIT)
//   6. tax/delivery per existing rules
//   7. final total

const DEFAULT_CASHBACK_PERCENT = 0.05;

export class CashbackError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Read the configurable cashback rate from SiteSettings (fallback 5%). */
export async function getCashbackRate(): Promise<number> {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const rate = (settings as any)?.generalSettings?.cashbackPercent;
    const num = Number(rate);
    return Number.isFinite(num) && num >= 0 && num <= 1 ? num : DEFAULT_CASHBACK_PERCENT;
  } catch {
    return DEFAULT_CASHBACK_PERCENT;
  }
}

/** Round to cents (2 decimals) — avoids float drift on money. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Get (or lazily create) the wallet for a customer. */
export async function getOrCreateWallet(customerId: string) {
  const existing = await prisma.cashbackWallet.findUnique({ where: { customerId } });
  if (existing) return existing;
  return prisma.cashbackWallet.create({
    data: { customerId, balance: 0 },
  });
}

export interface LedgerResult {
  wallet: { id: string; customerId: string; balance: number };
  transaction: { id: string; type: string; amount: number; description: string | null };
}

/**
 * CREDIT cashback for an eligible order. Idempotent via unique [CREDIT, orderId].
 * The credit is only issued when the order reaches an eligible terminal state
 * (DELIVERED / PICKED_UP). A cancelled order can never leave spendable credit.
 */
export async function creditCashbackForOrder(
  customerId: string,
  orderId: string,
  eligibleBase: number,
): Promise<LedgerResult | null> {
  const rate = await getCashbackRate();
  const amount = roundMoney(eligibleBase * rate);
  if (amount <= 0) return null;

  const existing = await prisma.cashbackTransaction.findUnique({
    where: { type_referenceId: { type: 'CREDIT', referenceId: orderId } },
  });
  if (existing) return null; // idempotent — already credited

  const wallet = await getOrCreateWallet(customerId);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.cashbackWallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } },
    });
    const txRecord = await tx.cashbackTransaction.create({
      data: {
        walletId: wallet.id,
        customerId,
        type: 'CREDIT',
        amount,
        description: `Cashback from order`,
        orderId,
        referenceId: orderId,
      },
    });
    return { wallet: updated, transaction: txRecord };
  });
}

/**
 * DEBIT cashback at checkout. ATOMIC: balance check + wallet update + ledger
 * entry inside a single transaction. The customer can never set the balance —
 * only the server decides how much is usable.
 */
export async function debitCashback(
  customerId: string,
  amount: number,
  referenceId: string,
  orderId?: string | null,
  description = 'Cashback used on order',
): Promise<LedgerResult> {
  const useAmount = roundMoney(Math.max(0, amount));
  if (useAmount <= 0) {
    throw new CashbackError('Cashback amount must be positive');
  }
  if (!referenceId) {
    throw new CashbackError('Reference id is required for idempotency');
  }

  const existing = await prisma.cashbackTransaction.findUnique({
    where: { type_referenceId: { type: 'DEBIT', referenceId } },
  });
  if (existing) return null as any; // idempotent — already debited for this reference

  const wallet = await getOrCreateWallet(customerId);

  // ATOMIC with row lock: the balance check + decrement + ledger entry happen
  // inside one transaction with SELECT ... FOR UPDATE so two concurrent
  // checkouts can never both spend the same balance (no negative balance).
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      SELECT "balance" FROM "cashback_wallets" WHERE "id" = ${wallet.id} FOR UPDATE
    ` as { balance: number }[];
    const currentBalance = rows[0]?.balance ?? 0;
    if (currentBalance < useAmount - 0.0001) {
      throw new CashbackError('Insufficient cashback balance');
    }
    const updated = await tx.cashbackWallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: useAmount } },
    });
    const txRecord = await tx.cashbackTransaction.create({
      data: {
        walletId: wallet.id,
        customerId,
        type: 'DEBIT',
        amount: -useAmount,
        description,
        orderId: orderId ?? null,
        referenceId,
      },
    });
    return { wallet: updated, transaction: txRecord };
  });
}

/**
 * REVERSAL when an order that earned cashback is cancelled. Never deletes the
 * original CREDIT — it posts a matching -amount entry so the ledger stays
 * immutable and auditable. Idempotent via unique [REVERSAL, orderId].
 */
export async function reverseCashbackForOrder(customerId: string, orderId: string): Promise<void> {
  const credit = await prisma.cashbackTransaction.findFirst({
    where: { customerId, orderId, type: 'CREDIT' },
  });
  if (!credit) return; // nothing earned, nothing to reverse

  const existing = await prisma.cashbackTransaction.findUnique({
    where: { type_referenceId: { type: 'REVERSAL', referenceId: orderId } },
  });
  if (existing) return; // idempotent

  const wallet = await getOrCreateWallet(customerId);

  await prisma.$transaction(async (tx) => {
    const current = await tx.cashbackWallet.findUnique({ where: { id: wallet.id } });
    const reversalAmount = Math.min(credit.amount, current?.balance ?? 0);
    await tx.cashbackWallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: reversalAmount } },
    });
    await tx.cashbackTransaction.create({
      data: {
        walletId: wallet.id,
        customerId,
        type: 'REVERSAL',
        amount: -reversalAmount,
        description: `Reversal — order cancelled`,
        orderId,
        referenceId: orderId,
      },
    });
  });
}

/**
 * ADJUSTMENT (staff only). Positive or negative, never below zero.
 */
export async function adjustCashback(
  customerId: string,
  amount: number,
  description: string,
): Promise<LedgerResult> {
  const adj = roundMoney(amount);
  if (adj === 0) throw new CashbackError('Adjustment amount must not be zero');
  if (!description?.trim()) throw new CashbackError('Adjustment requires a reason');

  const wallet = await getOrCreateWallet(customerId);

  return prisma.$transaction(async (tx) => {
    const current = await tx.cashbackWallet.findUnique({ where: { id: wallet.id } });
    const newBalance = roundMoney((current?.balance ?? 0) + adj);
    if (newBalance < 0) throw new CashbackError('Adjustment would make balance negative');

    const updated = await tx.cashbackWallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance },
    });
    const txRecord = await tx.cashbackTransaction.create({
      data: {
        walletId: wallet.id,
        customerId,
        type: 'ADJUSTMENT',
        amount: adj,
        description: description.trim(),
      },
    });
    return { wallet: updated, transaction: txRecord };
  });
}

/**
 * Reverse a DEBIT that was made against a reference but whose order creation
 * failed (e.g. stock error). Restores the balance and posts a REVERSAL entry.
 * Idempotent — second call does nothing.
 */
export async function reverseDebit(customerId: string, referenceId: string): Promise<void> {
  const debit = await prisma.cashbackTransaction.findFirst({
    where: { customerId, referenceId, type: 'DEBIT' },
  });
  if (!debit) return;

  const existing = await prisma.cashbackTransaction.findUnique({
    where: { type_referenceId: { type: 'REVERSAL', referenceId: `DEBIT:${referenceId}` } },
  });
  if (existing) return;

  const wallet = await getOrCreateWallet(customerId);

  await prisma.$transaction(async (tx) => {
    await tx.cashbackWallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: Math.abs(debit.amount) } },
    });
    await tx.cashbackTransaction.create({
      data: {
        walletId: wallet.id,
        customerId,
        type: 'REVERSAL',
        amount: Math.abs(debit.amount),
        description: 'Reversal — order creation failed',
        orderId: debit.orderId,
        referenceId: `DEBIT:${referenceId}`,
      },
    });
  });
}

/**
 * Link a DEBIT (created against idempotencyKey) to the real order once the
 * order exists. Keeps the ledger traceable to the order.
 */
export async function linkDebitToOrder(customerId: string, referenceId: string, orderId: string): Promise<void> {
  await prisma.cashbackTransaction.updateMany({
    where: { customerId, referenceId, type: 'DEBIT' },
    data: { orderId },
  });
}
