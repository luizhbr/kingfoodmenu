import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { SuperAgentTest } from 'supertest';
import { createApp } from '../../app.js';

vi.mock('../../lib/db.js', () => {
  const mockPrisma = {
    location: { findFirst: vi.fn() },
    deliveryZone: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    customer: { findUnique: vi.fn() },
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

import prisma from '../../lib/db.js';
const mockedPrisma = vi.mocked(prisma);
const app = createApp();

async function csrfAgent(): Promise<{ agent: SuperAgentTest; token: string }> {
  const agent = request.agent(app);
  const tokenRes = await agent.get('/api/csrf-token');
  return { agent: agent as unknown as SuperAgentTest, token: tokenRes.body.data.csrfToken };
}

const location = { id: 'loc-1', isActive: true, deliveryEnabled: true };
const zone = {
  id: 'zone-1', locationId: 'loc-1', name: 'Zone 1', charge: 3.99,
  minOrder: 15, boundaries: null, isActive: true,
};

describe('POST /api/delivery/zones/check contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.location.findFirst.mockResolvedValue(location as any);
    mockedPrisma.deliveryZone.findMany.mockResolvedValue([zone] as any);
  });

  it('accepts the checkout address payload and returns the server fee contract', async () => {
    const { agent, token } = await csrfAgent();
    const res = await agent
      .post('/api/delivery/zones/check')
      .set('X-CSRF-Token', token)
      .send({ line1: '123 Main St', city: 'Columbus', state: 'OH', zip: '43229' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        eligible: true, fee: 3.99, minOrder: 15,
        zoneId: 'zone-1', zoneName: 'Zone 1', locationId: 'loc-1',
      },
    });
  });

  it('rejects an incomplete address payload', async () => {
    const { agent, token } = await csrfAgent();
    const res = await agent
      .post('/api/delivery/zones/check')
      .set('X-CSRF-Token', token)
      .send({ line1: '123 Main St', city: 'Columbus' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockedPrisma.location.findFirst).not.toHaveBeenCalled();
  });

  it('returns 404 when no active delivery location is available', async () => {
    mockedPrisma.location.findFirst.mockResolvedValue(null);
    const { agent, token } = await csrfAgent();
    const res = await agent
      .post('/api/delivery/zones/check')
      .set('X-CSRF-Token', token)
      .send({ line1: '123 Main St', city: 'Columbus', state: 'OH', zip: '43229' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'No active delivery location found' });
  });
});
