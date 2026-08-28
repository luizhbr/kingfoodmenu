import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { passwordResetEmail, sendEmail } from '../lib/email.js';

// ============================================================
// PASSWORD RESET (CUSTOMER)
// ============================================================

const TOKEN_TTL_MS = 60 * 60 * 1000; // 60 minutos

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

/**
 * POST /api/auth/customer/forgot-password
 * Sempre responde com mensagem genérica (não revela se o email existe).
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid email format' });
    return;
  }

  const { email } = parsed.data;
  const genericMessage = 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.';

  const customer = await prisma.customer.findUnique({ where: { email } });

  if (customer && customer.password) {
    // Invalida tokens anteriores do mesmo cliente (uso único + rotação segura)
    await prisma.passwordResetToken.updateMany({
      where: { customerId: customer.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await prisma.passwordResetToken.create({
      data: {
        tokenHash: hashToken(token),
        customerId: customer.id,
        expiresAt,
      },
    });

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;
    const emailContent = passwordResetEmail(resetLink);
    await sendEmail({ to: email, ...emailContent });
    // token NUNCA é logado — apenas o hash é persistido
  }

  // Mesma resposta para email existente ou não (anti-enumeração)
  res.json({ success: true, data: { message: genericMessage } });
}

const resetPasswordSchema = z.object({
  token: z.string().min(32),
  password: z.string().min(6),
});

/**
 * POST /api/auth/customer/reset-password
 * Valida token (hash, expiração, uso único), atualiza a senha e invalida o token.
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Token inválido ou senha muito curta (mínimo 6 caracteres)' });
    return;
  }

  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { customer: true },
  });

  if (!record || record.usedAt) {
    res.status(400).json({ success: false, error: 'Link de redefinição inválido ou já utilizado.' });
    return;
  }

  if (record.expiresAt < new Date()) {
    res.status(400).json({ success: false, error: 'Link de redefinição expirado. Solicite um novo.' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: record.customerId },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  // Revoga refresh tokens antigos do cliente (sessões existentes)
  await prisma.refreshToken.updateMany({
    where: { userId: record.customerId, userType: 'customer', revoked: false },
    data: { revoked: true },
  });

  res.json({ success: true, data: { message: 'Senha redefinida com sucesso. Faça login com a nova senha.' } });
}
