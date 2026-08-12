import { describe, it, expect } from 'vitest';
import { PrintQueue } from '../../queue.js';

function job(id: string, createdAt = Date.now()) {
  return { jobId: id, orderId: 'o-' + id, printerId: 'p1', type: 'AUTO', status: 'QUEUED' as const, attempts: 0, text: '', createdAt };
}

describe('PrintQueue', () => {
  it('add is idempotent — same jobId returns existing, no duplicate', () => {
    const q = new PrintQueue();
    const a = q.add(job('j1'));
    const b = q.add(job('j1'));
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(q.totalSeen).toBe(1);
  });

  it('next returns FIFO QUEUED jobs', () => {
    const q = new PrintQueue();
    q.add(job('j1', 100));
    q.add(job('j2', 200));
    q.add(job('j3', 300));
    q.transition('j2', 'PRINTING');
    const next = q.next();
    expect(next?.jobId).toBe('j1');
  });

  it('PRINTED is terminal — no transition out', () => {
    const q = new PrintQueue();
    q.add(job('j1'));
    q.transition('j1', 'PRINTING');
    q.transition('j1', 'PRINTED');
    expect(() => q.transition('j1', 'QUEUED')).toThrow();
    expect(q.get('j1')?.status).toBe('PRINTED');
  });

  it('FAILED can retry to QUEUED', () => {
    const q = new PrintQueue();
    q.add(job('j1'));
    q.transition('j1', 'PRINTING');
    q.transition('j1', 'FAILED', { error: 'boom' });
    expect(q.get('j1')?.status).toBe('FAILED');
    q.transition('j1', 'QUEUED');
    expect(q.get('j1')?.status).toBe('QUEUED');
    expect(q.get('j1')?.error).toBeUndefined();
  });

  it('count and lastPrinted', () => {
    const q = new PrintQueue();
    q.add(job('j1', 100));
    q.add(job('j2', 200));
    q.transition('j1', 'PRINTING');
    q.transition('j1', 'PRINTED');
    expect(q.count('PRINTED')).toBe(1);
    expect(q.count('QUEUED')).toBe(1);
    expect(q.lastPrinted()?.jobId).toBe('j1');
  });
});
