import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrintAgent } from '../../polling.js';
import { ApiClient } from '../../api-client.js';
import type { PrinterDriver, PrintResult } from '../../driver-adapter.js';

class MockDriver implements PrinterDriver {
  readonly kind = 'OS_PRINTER' as const;
  connected = false;
  printed: Buffer[] = [];
  failNext = false;
  constructor(public name = 'RONGTA 80mm Series Printer') {}

  async connect(): Promise<void> { this.connected = true; }
  async disconnect(): Promise<void> { this.connected = false; }
  async print(data: Buffer): Promise<PrintResult> {
    if (this.failNext) { this.failNext = false; return { ok: false, bytes: 0, error: 'printer offline' }; }
    this.printed.push(data);
    return { ok: true, bytes: data.length };
  }
  async testPrint(): Promise<PrintResult> { return { ok: true, bytes: 10 }; }
}

function makeApi(overrides: Partial<ApiClient> = {}): ApiClient {
  const api = new ApiClient({ baseUrl: 'http://localhost:9999', deviceToken: 'dev-token' });
  return Object.assign(api, {
    fetchJobs: vi.fn(async () => ({ printer: { id: 'p1' }, jobs: [] })),
    fetchTicket: vi.fn(async (jobId: string) => ({ ticket: {}, text: `KING FOOD\nOrder #${jobId}\n` })),
    reportStatus: vi.fn(async () => ({})),
    heartbeat: vi.fn(async () => {}),
    ...overrides,
  }) as any;
}

const cfg = {
  apiBaseUrl: 'http://localhost:9999', deviceId: 'd1', deviceToken: 't1', printerId: 'p1',
  printerName: 'RONGTA 80mm Series Printer', printerPort: 9100, printerType: 'OS_PRINTER',
  paperWidth: 80, pollIntervalMs: 1000, heartbeatIntervalMs: 5000,
  retryBaseMs: 100, retryMaxMs: 500, maxAttempts: 3, logLevel: 'error',
} as any;

describe('PrintAgent integration (mocked API + driver)', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('full flow: QUEUED → PRINTING → PRINTED with physical bytes', async () => {
    const api = makeApi({
      fetchJobs: vi.fn(async () => ({ printer: { id: 'p1' }, jobs: [{ id: 'job-1', orderId: 'order-1', printerId: 'p1', type: 'AUTO' }] })),
    });
    const driver = new MockDriver();
    const agent = new PrintAgent(cfg, api, driver);
    const stats = await agent.pollOnce();

    expect(stats.fetched).toBe(1);
    expect(stats.printed).toBe(1);
    expect(stats.failed).toBe(0);
    // server saw PRINTING then PRINTED
    const statusCalls = (api.reportStatus as any).mock.calls.map((c: any[]) => c[1]);
    expect(statusCalls).toContain('PRINTING');
    expect(statusCalls).toContain('PRINTED');
    // driver received ESC/POS bytes (starts with ESC @)
    expect(driver.printed.length).toBe(1);
    expect(driver.printed[0][0]).toBe(0x1b);
    expect(driver.printed[0][1]).toBe(0x40);
    // local queue terminal
    expect(agent.queue.get('job-1')?.status).toBe('PRINTED');
  });

  it('idempotency: same job fetched twice → printed once', async () => {
    const api = makeApi({
      fetchJobs: vi.fn(async () => ({ printer: { id: 'p1' }, jobs: [{ id: 'job-1', orderId: 'order-1', printerId: 'p1', type: 'AUTO' }] })),
    });
    const driver = new MockDriver();
    const agent = new PrintAgent(cfg, api, driver);
    await agent.pollOnce();
    await agent.pollOnce(); // same job again

    expect(driver.printed.length).toBe(1); // never reprinted
    expect(agent.queue.totalSeen).toBe(1);
    expect(agent.queue.get('job-1')?.status).toBe('PRINTED');
  });

  it('failure: printer unavailable → job FAILED, retry works when printer returns', async () => {
    const api = makeApi({
      fetchJobs: vi.fn(async () => ({ printer: { id: 'p1' }, jobs: [{ id: 'job-1', orderId: 'order-1', printerId: 'p1', type: 'AUTO' }] })),
    });
    const driver = new MockDriver();
    driver.failNext = true;
    const agent = new PrintAgent(cfg, api, driver);

    const stats1 = await agent.pollOnce();
    expect(stats1.failed).toBe(1);
    expect(agent.queue.get('job-1')?.status).toBe('FAILED');
    const statusCalls = (api.reportStatus as any).mock.calls.map((c: any[]) => c[1]);
    expect(statusCalls).toContain('FAILED');

    // printer returns → retry (server would re-queue FAILED → QUEUED)
    const stats2 = await agent.pollOnce();
    expect(stats2.printed).toBe(1);
    expect(agent.queue.get('job-1')?.status).toBe('PRINTED');
    expect(driver.printed.length).toBe(1);
  });

  it('server down → poll fails gracefully, no crash', async () => {
    const api = makeApi({
      fetchJobs: vi.fn(async () => { throw new Error('ECONNREFUSED'); }),
    });
    const driver = new MockDriver();
    const agent = new PrintAgent(cfg, api, driver);
    const stats = await agent.pollOnce();
    expect(stats.fetched).toBe(0);
    expect(agent.lastErrorInfo?.message).toContain('poll');
  });

  it('cancelled/disabled jobs are never printed (server filters them)', async () => {
    const api = makeApi({
      fetchJobs: vi.fn(async () => ({ printer: { id: 'p1' }, jobs: [] })),
    });
    const driver = new MockDriver();
    const agent = new PrintAgent(cfg, api, driver);
    const stats = await agent.pollOnce();
    expect(stats.fetched).toBe(0);
    expect(driver.printed.length).toBe(0);
  });
});
