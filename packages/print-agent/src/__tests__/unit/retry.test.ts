import { describe, it, expect } from 'vitest';
import { backoffDelay, withRetry } from '../../retry.js';

describe('retry', () => {
  it('backoffDelay grows exponentially with cap', () => {
    const opts = { baseMs: 100, maxMs: 1000, maxAttempts: 5, jitter: false };
    expect(backoffDelay(1, opts)).toBe(100);
    expect(backoffDelay(2, opts)).toBe(200);
    expect(backoffDelay(3, opts)).toBe(400);
    expect(backoffDelay(4, opts)).toBe(800);
    expect(backoffDelay(5, opts)).toBe(1000); // capped
  });

  it('withRetry succeeds on first try', async () => {
    let calls = 0;
    const r = await withRetry(async () => { calls += 1; return 'ok'; }, { baseMs: 1, maxMs: 5, maxAttempts: 3 });
    expect(r).toBe('ok');
    expect(calls).toBe(1);
  });

  it('withRetry retries then succeeds', async () => {
    let calls = 0;
    const r = await withRetry(async () => {
      calls += 1;
      if (calls < 3) throw new Error('transient');
      return 'ok';
    }, { baseMs: 1, maxMs: 5, maxAttempts: 5 });
    expect(r).toBe('ok');
    expect(calls).toBe(3);
  });

  it('withRetry gives up after maxAttempts', async () => {
    let calls = 0;
    await expect(withRetry(async () => { calls += 1; throw new Error('always'); }, { baseMs: 1, maxMs: 5, maxAttempts: 3 }))
      .rejects.toThrow('always');
    expect(calls).toBe(3);
  });

  it('shouldRetry false stops retrying', async () => {
    let calls = 0;
    await expect(withRetry(async () => { calls += 1; throw new Error('fatal'); }, { baseMs: 1, maxMs: 5, maxAttempts: 5 }, () => false))
      .rejects.toThrow('fatal');
    expect(calls).toBe(1);
  });
});
