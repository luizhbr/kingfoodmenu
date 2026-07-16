import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { clearGeocodeCache } from '../../lib/geocode.js';

vi.mock('../../lib/db.js', () => {
  const mockPrisma = {
    customer: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

const app = createApp();

const nominatimHit = [{ lat: '48.0576', lon: '8.4638', display_name: 'Kronenstraße 24, Villingen-Schwenningen' }];

const fetchMock = vi.fn();

beforeEach(() => {
  clearGeocodeCache();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => nominatimHit });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GET /api/geocode/search', () => {
  it('rejects queries shorter than 3 chars', async () => {
    const res = await request(app).get('/api/geocode/search?q=ab');
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('proxies Nominatim verbatim with an identifying User-Agent', async () => {
    const res = await request(app).get('/api/geocode/search?q=Kronenstra%C3%9Fe%2024');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(nominatimHit);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('nominatim.openstreetmap.org/search');
    expect(String(url)).toContain('q=Kronenstra');
    expect(init.headers['User-Agent']).toBeTruthy();
  });

  it('serves repeat queries from cache without a second upstream call', async () => {
    await request(app).get('/api/geocode/search?q=Kronenstrasse');
    await request(app).get('/api/geocode/search?q=Kronenstrasse');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps upstream failure to 502', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    const res = await request(app).get('/api/geocode/search?q=Kronenstrasse');
    expect(res.status).toBe(502);
  });
});

describe('GET /api/geocode/reverse', () => {
  it('requires numeric lat/lng', async () => {
    const res = await request(app).get('/api/geocode/reverse?lat=abc');
    expect(res.status).toBe(400);
  });

  it('proxies reverse lookups', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ display_name: 'Somewhere' }) });
    const res = await request(app).get('/api/geocode/reverse?lat=48.05&lng=8.46');
    expect(res.status).toBe(200);
    expect(res.body.display_name).toBe('Somewhere');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/reverse');
  });
});
