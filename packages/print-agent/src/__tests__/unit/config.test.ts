import { describe, it, expect } from 'vitest';
import { validateConfig } from '../../config.js';

describe('config', () => {
  it('validates required fields', () => {
    const errors = validateConfig({} as any);
    expect(errors.length).toBeGreaterThanOrEqual(3);
    expect(errors.join(' ')).toContain('KING_PRINT_API_URL');
    expect(errors.join(' ')).toContain('KING_PRINT_DEVICE_ID');
    expect(errors.join(' ')).toContain('KING_PRINT_DEVICE_TOKEN');
  });

  it('accepts a full valid config', () => {
    const errors = validateConfig({
      apiBaseUrl: 'https://x', deviceId: 'd', deviceToken: 't', printerId: 'p',
      printerName: 'RONGTA 80mm Series Printer', printerType: 'OS_PRINTER',
      paperWidth: 80, printerPort: 9100, pollIntervalMs: 3000, heartbeatIntervalMs: 15000,
      retryBaseMs: 2000, retryMaxMs: 60000, maxAttempts: 5, logLevel: 'info',
    } as any);
    expect(errors).toEqual([]);
  });

  it('rejects invalid paper width', () => {
    const errors = validateConfig({
      apiBaseUrl: 'https://x', deviceId: 'd', deviceToken: 't', printerId: 'p',
      printerName: 'RONGTA', printerType: 'OS_PRINTER', paperWidth: 100,
    } as any);
    expect(errors.join(' ')).toContain('KING_PRINT_PAPER_WIDTH');
  });
});
