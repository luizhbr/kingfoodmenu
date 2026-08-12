import { describe, it, expect, vi } from 'vitest';
import { AutoPrintListener, isConfirmedEvent } from '../../auto-print.js';
import { ApiClient } from '../../api-client.js';

describe('auto-print', () => {
  it('isConfirmedEvent only for CONFIRMED', () => {
    expect(isConfirmedEvent({ order: { id: 'o1', status: 'CONFIRMED' } })).toBe(true);
    expect(isConfirmedEvent({ order: { id: 'o1', status: 'PENDING' } })).toBe(false);
    expect(isConfirmedEvent({ order: { id: 'o1', status: 'DELIVERED' } })).toBe(false);
    expect(isConfirmedEvent({})).toBe(false);
  });

  it('handleEvent creates one job for CONFIRMED', async () => {
    const api = new ApiClient({ baseUrl: 'http://x', deviceToken: 't' });
    const spy = vi.spyOn(api, 'createJob').mockResolvedValue({ job: { id: 'j1' }, created: true });
    const listener = new AutoPrintListener({ printerId: 'p1' } as any, api);
    const result = await listener.handleEvent({ order: { id: 'o1', status: 'CONFIRMED' } });
    expect(result?.created).toBe(true);
    expect(spy).toHaveBeenCalledWith('o1', 'p1', 'AUTO');
  });

  it('handleEvent ignores non-CONFIRMED', async () => {
    const api = new ApiClient({ baseUrl: 'http://x', deviceToken: 't' });
    const spy = vi.spyOn(api, 'createJob');
    const listener = new AutoPrintListener({ printerId: 'p1' } as any, api);
    const result = await listener.handleEvent({ order: { id: 'o1', status: 'PENDING' } });
    expect(result).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('handleEvent returns null on API failure', async () => {
    const api = new ApiClient({ baseUrl: 'http://x', deviceToken: 't' });
    vi.spyOn(api, 'createJob').mockRejectedValue(new Error('down'));
    const listener = new AutoPrintListener({ printerId: 'p1' } as any, api);
    const result = await listener.handleEvent({ order: { id: 'o1', status: 'CONFIRMED' } });
    expect(result).toBeNull();
  });
});
