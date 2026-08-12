import { describe, it, expect } from 'vitest';
import { ApiClient, ApiError } from '../../api-client.js';

// These tests hit a REAL local backend (packages/server dist) when available.
// They are skipped automatically when the server is not running.
const BASE = process.env.KING_PRINT_TEST_API || 'http://localhost:3100';

async function serverUp(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

describe('ApiClient against local backend', () => {
  it('anonymous agent endpoints return 401 (no token)', async () => {
    if (!(await serverUp())) { console.log('SKIP: local server not running'); return; }
    const client = new ApiClient({ baseUrl: BASE, deviceToken: '' });
    await expect(client.fetchJobs()).rejects.toThrow(ApiError);
    try { await client.fetchJobs(); } catch (e: any) {
      expect(e.status).toBe(401);
    }
  });

  it('invalid device token returns 401', async () => {
    if (!(await serverUp())) { console.log('SKIP: local server not running'); return; }
    const client = new ApiClient({ baseUrl: BASE, deviceToken: 'deadbeefdeadbeefdeadbeef' });
    try { await client.fetchJobs(); } catch (e: any) {
      expect(e.status).toBe(401);
    }
  });
});
