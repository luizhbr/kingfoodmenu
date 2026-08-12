import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { generateToken } from '../middleware/auth.js';
import {
  isCaptchaEnabled,
  getCaptchaSiteKey,
  recordAuthFailure,
  recordAuthSuccess,
  getRiskLevel,
  verifyCaptchaToken,
  captchaPolicy,
} from '../lib/captcha-service.js';


function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

/** CAPTCHA gate for privileged auth — fail-closed when the layer is active. */
async function enforceCaptcha(req: Request, email: string, level: ReturnType<typeof getRiskLevel>): Promise<string | null> {
  if (!isCaptchaEnabled()) return null; // layer disabled — normal flow
  const policy = captchaPolicy(level);
  if (policy.lockedOut) return 'Account temporarily locked. Try again later.';
  if (!policy.required) return null;
  const token = (req.body?.captchaToken as string) || '';
  const result = await verifyCaptchaToken(token, getClientIp(req));
  if (!result.success) {
    console.warn(`[captcha] fail email=${email} reason=${result.reason}`);
    return 'Unable to authenticate.';
  }
  return null;
}

// ============================================================
// STAFF AUTH
// ============================================================

const staffLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function staffLogin(req: Request, res: Response): Promise<void> {
  const parsed = staffLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid email or password format' });
    return;
  }

  const { email, password } = parsed.data;
  const ip = getClientIp(req);

  // Adaptive CAPTCHA gate (fail-closed when active)
  const level = getRiskLevel(email, ip);
  const gateError = await enforceCaptcha(req, email, level);
  if (gateError) {
    res.status(401).json({ success: false, error: gateError });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    recordAuthFailure(email, ip);
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    recordAuthFailure(email, ip);
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  recordAuthSuccess(email, ip);

  const token = generateToken({
    id: user.id,
    email: user.email,
    type: 'staff',
    role: user.role,
  });

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    },
  });
}

const staffRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['SUPER_ADMIN', 'MANAGER', 'STAFF', 'DRIVER']).optional(),
});

export async function staffRegister(req: Request, res: Response): Promise<void> {
  const parsed = staffRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const { email, password, name, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ success: false, error: 'Email already registered' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name, role: role || 'STAFF' },
    select: { id: true, email: true, name: true, role: true },
  });

  const token = generateToken({
    id: user.id,
    email: user.email,
    type: 'staff',
    role: user.role,
  });

  res.status(201).json({ success: true, data: { token, user } });
}

// ============================================================
// CUSTOMER AUTH
// ============================================================

const customerRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  phone: z.string().optional(),
});

export async function customerRegister(req: Request, res: Response): Promise<void> {
  const parsed = customerRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const { email, password, name, phone } = parsed.data;

  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ success: false, error: 'Email already registered' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const customer = await prisma.customer.create({
    data: { email, password: hashedPassword, name, phone },
    select: { id: true, email: true, name: true, phone: true },
  });

  const token = generateToken({
    id: customer.id,
    email: customer.email,
    type: 'customer',
  });

  res.status(201).json({ success: true, data: { token, customer } });
}

const customerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function customerLogin(req: Request, res: Response): Promise<void> {
  const parsed = customerLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid email or password format' });
    return;
  }

  const { email, password } = parsed.data;
  const ip = getClientIp(req);

  // Adaptive CAPTCHA gate (fail-closed when active)
  const level = getRiskLevel(email, ip);
  const gateError = await enforceCaptcha(req, email, level);
  if (gateError) {
    res.status(401).json({ success: false, error: gateError });
    return;
  }

  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer || !customer.password) {
    recordAuthFailure(email, ip);
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, customer.password);
  if (!valid) {
    recordAuthFailure(email, ip);
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  recordAuthSuccess(email, ip);

  const token = generateToken({
    id: customer.id,
    email: customer.email,
    type: 'customer',
  });

  res.json({
    success: true,
    data: {
      token,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
      },
    },
  });
}

// ============================================================
// SHARED
// ============================================================

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  if (req.user.type === 'staff') {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, phone: true, avatar: true },
    });
    res.json({ success: true, data: { type: 'staff', user } });
  } else {
    const customer = await prisma.customer.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, phone: true },
    });
    res.json({ success: true, data: { type: 'customer', customer } });
  }
}


export async function getCaptchaStatus(req: Request, res: Response): Promise<void> {
  const email = (req.query.email as string) || '';
  const ip = getClientIp(req);
  const level = email ? getRiskLevel(email, ip) : 0;
  res.json({
    success: true,
    data: {
      enabled: isCaptchaEnabled(),
      siteKey: isCaptchaEnabled() ? getCaptchaSiteKey() : null,
      required: isCaptchaEnabled() && captchaPolicy(level).required,
      lockedOut: isCaptchaEnabled() && captchaPolicy(level).lockedOut,
    },
  });
}
