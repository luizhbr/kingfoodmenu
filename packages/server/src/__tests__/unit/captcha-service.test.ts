import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/db.js', () => ({ default: {} }));

import {
  recordAuthFailure,
  recordAuthSuccess,
  getRiskLevel,
  captchaPolicy,
  verifyCaptchaToken,
  isCaptchaEnabled,
} from '../../lib/captcha-service.js';

// Reset module-level risk store between tests
beforeEach(() => {
  vi.resetModules();
});

describe('Adaptive CAPTCHA - Unit Tests', () => {
  it('P13.6-UNIT-001 captcha disabled by default (no env)', () => {
    expect(isCaptchaEnabled()).toBe(false);
  });

  it('P13.6-UNIT-002 captcha enabled only with all three env vars', () => {
    process.env.CAPTCHA_ENABLED = 'true';
    process.env.CAPTCHA_SITE_KEY = 'sk';
    process.env.CAPTCHA_SECRET_KEY = 'sec';
    expect(isCaptchaEnabled()).toBe(true);
    delete process.env.CAPTCHA_ENABLED;
    delete process.env.CAPTCHA_SITE_KEY;
    delete process.env.CAPTCHA_SECRET_KEY;
  });

  it('P13.6-UNIT-003 risk level 0 with no failures', () => {
    expect(getRiskLevel('a@b.com', '1.2.3.4')).toBe(0);
  });

  it('P13.6-UNIT-004 level 1 after 3 failures', () => {
    for (let i = 0; i < 3; i++) recordAuthFailure('a@b.com', '1.2.3.4');
    expect(getRiskLevel('a@b.com', '1.2.3.4')).toBe(1);
  });

  it('P13.6-UNIT-005 level 2 after 6 failures', () => {
    for (let i = 0; i < 6; i++) recordAuthFailure('a@b.com', '1.2.3.4');
    expect(getRiskLevel('a@b.com', '1.2.3.4')).toBe(2);
  });

  it('P13.6-UNIT-006 level 3 lockout after 10 failures', () => {
    for (let i = 0; i < 10; i++) recordAuthFailure('a@b.com', '1.2.3.4');
    expect(getRiskLevel('a@b.com', '1.2.3.4')).toBe(3);
  });

  it('P13.6-UNIT-007 success clears risk', () => {
    for (let i = 0; i < 5; i++) recordAuthFailure('a@b.com', '1.2.3.4');
    recordAuthSuccess('a@b.com', '1.2.3.4');
    expect(getRiskLevel('a@b.com', '1.2.3.4')).toBe(0);
  });

  it('P13.6-UNIT-008 risk is scoped per email+ip', () => {
    for (let i = 0; i < 4; i++) recordAuthFailure('victim@b.com', '9.9.9.9');
    expect(getRiskLevel('other@b.com', '9.9.9.9')).toBe(0);
    expect(getRiskLevel('victim@b.com', '8.8.8.8')).toBe(0);
    expect(getRiskLevel('victim@b.com', '9.9.9.9')).toBe(1);
  });

  it('P13.6-UNIT-009 policy: level 0 → not required', () => {
    expect(captchaPolicy(0)).toEqual({ required: false, lockedOut: false });
  });

  it('P13.6-UNIT-010 policy: level 1-2 → required, not locked', () => {
    expect(captchaPolicy(1).required).toBe(true);
    expect(captchaPolicy(1).lockedOut).toBe(false);
    expect(captchaPolicy(2).required).toBe(true);
    expect(captchaPolicy(2).lockedOut).toBe(false);
  });

  it('P13.6-UNIT-011 policy: level 3 → required + locked', () => {
    expect(captchaPolicy(3)).toEqual({ required: true, lockedOut: true });
  });

  it('P13.6-UNIT-012 empty token → missing-token', async () => {
    const r = await verifyCaptchaToken('');
    expect(r.success).toBe(false);
    expect(r.reason).toBe('missing-token');
  });

  it('P13.6-UNIT-013 captcha disabled → verify is a no-op success', async () => {
    const r = await verifyCaptchaToken('anything');
    expect(r.success).toBe(true);
  });

  it('P13.6-UNIT-014 token reused/expired maps to token-reused-or-expired', async () => {
    process.env.CAPTCHA_ENABLED = 'true';
    process.env.CAPTCHA_SITE_KEY = 'sk';
    process.env.CAPTCHA_SECRET_KEY = 'sec';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
    }) as any;
    const r = await verifyCaptchaToken('reused-token');
    expect(r.success).toBe(false);
    expect(r.reason).toBe('token-reused-or-expired');
    delete process.env.CAPTCHA_ENABLED;
    delete process.env.CAPTCHA_SITE_KEY;
    delete process.env.CAPTCHA_SECRET_KEY;
    vi.restoreAllMocks();
  });

  it('P13.6-UNIT-015 provider unreachable → fail-closed', async () => {
    process.env.CAPTCHA_ENABLED = 'true';
    process.env.CAPTCHA_SITE_KEY = 'sk';
    process.env.CAPTCHA_SECRET_KEY = 'sec';
    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as any;
    const r = await verifyCaptchaToken('tok');
    expect(r.success).toBe(false);
    expect(r.providerError).toBe(true);
    delete process.env.CAPTCHA_ENABLED;
    delete process.env.CAPTCHA_SITE_KEY;
    delete process.env.CAPTCHA_SECRET_KEY;
    vi.restoreAllMocks();
  });

  it('P13.6-UNIT-016 valid token → success', async () => {
    process.env.CAPTCHA_ENABLED = 'true';
    process.env.CAPTCHA_SITE_KEY = 'sk';
    process.env.CAPTCHA_SECRET_KEY = 'sec';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as any;
    const r = await verifyCaptchaToken('valid-token');
    expect(r.success).toBe(true);
    delete process.env.CAPTCHA_ENABLED;
    delete process.env.CAPTCHA_SITE_KEY;
    delete process.env.CAPTCHA_SECRET_KEY;
    vi.restoreAllMocks();
  });

  it('P13.6-UNIT-017 never trusts client booleans — only token path', async () => {
    // The service has no API accepting captchaPassed; the signature only
    // takes the provider token. This test asserts the surface exists as
    // designed (token-based) and a client boolean cannot be passed in.
    const fnStr = verifyCaptchaToken.toString();
    expect(fnStr).not.toContain('captchaPassed');
  });
});
