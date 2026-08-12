// ── King Print Agent — API client ────────────────────────────────────────────
// Thin HTTPS client for the King Food print API. Device token is sent via
// `Authorization: Device <token>` header (same scheme as the backend middleware).

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  deviceToken: string;
  timeoutMs?: number;
}

export class ApiClient {
  private baseUrl: string;
  private token: string;
  private timeoutMs: number;

  constructor(opts: ApiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.token = opts.deviceToken;
    this.timeoutMs = opts.timeoutMs ?? 15000;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Device ${this.token}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      const text = await res.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
      if (!res.ok) {
        const msg = json?.error || json?.message || `HTTP ${res.status}`;
        throw new ApiError(msg, res.status);
      }
      return (json?.data ?? json) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  /** POST /api/print/agent/pair — exchange pairing code for a device token. */
  async pair(printerId: string, code: string, deviceId: string): Promise<{ paired: boolean }> {
    const res = await fetch(`${this.baseUrl}/api/print/agent/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printerId, code, deviceId }),
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
    if (!res.ok) {
      throw new ApiError(json?.error || `HTTP ${res.status}`, res.status);
    }
    return json?.data ?? { paired: true };
  }

  /** POST /api/print/agent/heartbeat — keep printer ONLINE. */
  async heartbeat(): Promise<void> {
    await this.request('POST', '/api/print/agent/heartbeat');
  }

  /** GET /api/print/agent/jobs — fetch QUEUED/FAILED jobs for this printer. */
  async fetchJobs(): Promise<{ printer: any; jobs: any[] }> {
    return this.request('GET', '/api/print/agent/jobs');
  }

  /** GET /api/print/agent/jobs/:jobId/ticket — download the kitchen ticket. */
  async fetchTicket(jobId: string): Promise<{ ticket: any; text: string }> {
    return this.request('GET', `/api/print/agent/jobs/${jobId}/ticket`);
  }

  /** POST /api/print/agent/status — report PRINTED / FAILED. */
  async reportStatus(jobId: string, status: 'PRINTING' | 'PRINTED' | 'FAILED', errorCode?: string, errorMessage?: string): Promise<any> {
    return this.request('POST', '/api/print/agent/status', { jobId, status, errorCode, errorMessage });
  }

  /** POST /api/print/jobs — create a print job (STAFF+; used by AUTO PRINT). */
  async createJob(orderId: string, printerId: string, type: 'AUTO' | 'REPRINT' = 'AUTO'): Promise<{ job: any; created: boolean }> {
    return this.request('POST', '/api/print/jobs', { orderId, printerId, type });
  }
}
