import { Request, Response } from 'express';
import prisma from '../lib/db.js';

/**
 * Recompensa de cadastro via Google (checkout).
 *
 * Regras de negócio:
 * - $3 USD, uso único, associado ao usuário, não transferível.
 * - Válida SOMENTE para o PRÓXIMO pedido (nunca aplicada no atual).
 * - Idempotente: a unique constraint (customerId, type) no banco garante
 *   que refresh / logout+login / cliques repetidos / OAuth callback
 *   repetido NUNCA geram uma segunda recompensa.
 * - Transacional: criação + verificação atômica.
 */
const GOOGLE_SIGNUP_BONUS = {
  type: 'google_signup_bonus',
  amount: 3,
  currency: 'USD',
};

export async function claimGoogleSignupReward(req: Request, res: Response): Promise<void> {
  const customerId = (req.user as any)?.id;
  if (!customerId || (req.user as any)?.type !== 'customer') {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  try {
    const reward = await prisma.$transaction(async (tx) => {
      // Já existe? Retorna o existente (idempotente) — nunca cria duplicado.
      const existing = await tx.customerReward.findUnique({
        where: { customerId_type: { customerId, type: GOOGLE_SIGNUP_BONUS.type } },
      });
      if (existing) return existing;

      // Cria apenas se o cliente existe (FK garante integridade).
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        throw new Error('Customer not found');
      }

      return tx.customerReward.create({
        data: {
          customerId,
          type: GOOGLE_SIGNUP_BONUS.type,
          amount: GOOGLE_SIGNUP_BONUS.amount,
          currency: GOOGLE_SIGNUP_BONUS.currency,
          status: 'AVAILABLE',
          // 90 dias para usar
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          metadata: { source: 'checkout_google_offer' },
        },
      });
    });

    res.json({
      success: true,
      data: {
        id: reward.id,
        type: reward.type,
        amount: reward.amount,
        currency: reward.currency,
        status: reward.status,
        createdAt: reward.createdAt,
        expiresAt: reward.expiresAt,
      },
    });
  } catch (err: any) {
    // Concorrência: unique constraint pode disparar em requisições simultâneas.
    // Retorna o existente em vez de erro 500.
    if (err?.code === 'P2002') {
      const existing = await prisma.customerReward.findUnique({
        where: { customerId_type: { customerId, type: GOOGLE_SIGNUP_BONUS.type } },
      });
      if (existing) {
        res.json({ success: true, data: existing });
        return;
      }
    }
    console.error('[rewards] claimGoogleSignupReward error:', err);
    res.status(500).json({ success: false, error: 'Failed to create reward' });
  }
}

/** Lista recompensas disponíveis do cliente autenticado (para exibir no account). */
export async function listMyRewards(req: Request, res: Response): Promise<void> {
  const customerId = (req.user as any)?.id;
  if (!customerId || (req.user as any)?.type !== 'customer') {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  try {
    const rewards = await prisma.customerReward.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: rewards });
  } catch (err: any) {
    console.error('[rewards] listMyRewards error:', err);
    res.status(500).json({ success: false, error: 'Failed to list rewards' });
  }
}
