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

const googleResult = {
  status: 'OK',
  results: [
    {
      formatted_address: 'Kronenstraße 24, 78054 Villingen-Schwenningen, Germany',
      geometry: { location: { lat: 48.0576, lng: 8.4638 } },
      types: ['street_address'],
      address_components: [
        { long_name: 'Kronenstraße', types: ['route'] },
        { long_name: '24', types: ['street_number'] },
        { long_name: 'Villingen-Schwenningen', types: ['locality'] },
        { long_name: '78054', types: ['postal_code'] },
        { long_name: 'Baden-Württemberg', types: ['administrative_area_level_1'] },
      ],
    },
  ],
};

const fetchMock = vi.fn();

beforeEach(() => {
  clearGeocodeCache();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('GOOGLE_MAPS_API_KEY', '');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('GET /api/geocode/search (nominatim fallback)', () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => nominatimHit });
  });

  it('rejects queries shorter than 3 chars', async () => {
    const res = await request(app).get('/api/geocode/search?q=ab');
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalises results and sends an identifying User-Agent', async () => {
    const res = await request(app).get('/api/geocode/search?q=Kronenstra%C3%9Fe%2024');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { lat: 48.0576, lon: 8.4638, lng: 8.4638, display_name: 'Kronenstraße 24, Villingen-Schwenningen' },
    ]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('nominatim.openstreetmap.org/search');
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

describe('GET /api/geocode/search (google provider)', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-key');
    fetchMock.mockResolvedValue({ ok: true, json: async () => googleResult });
  });

  it('calls Google and normalises to the same shape', async () => {
    const res = await request(app).get('/api/geocode/search?q=Kronenstrasse%2024');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        lat: 48.0576,
        lon: 8.4638,
        lng: 8.4638,
        display_name: 'Kronenstraße 24, 78054 Villingen-Schwenningen, Germany',
      },
    ]);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('maps.googleapis.com/maps/api/geocode/json');
    expect(url).toContain('key=test-key');
    expect(url).toContain('region=de');
  });

  it('returns [] on ZERO_RESULTS instead of erroring', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ status: 'ZERO_RESULTS', results: [] }) });
    const res = await request(app).get('/api/geocode/search?q=nowhere-at-all');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /api/geocode/reverse', () => {
  it('requires numeric lat/lng', async () => {
    const res = await request(app).get('/api/geocode/reverse?lat=abc');
    expect(res.status).toBe(400);
  });

  it('normalises a Google reverse result into Nominatim-style address keys', async () => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-key');
    fetchMock.mockResolvedValue({ ok: true, json: async () => googleResult });

    const res = await request(app).get('/api/geocode/reverse?lat=48.0576&lng=8.4638');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      display_name: 'Kronenstraße 24, 78054 Villingen-Schwenningen, Germany',
      address: {
        road: 'Kronenstraße',
        house_number: '24',
        city: 'Villingen-Schwenningen',
        postcode: '78054',
        state: 'Baden-Württemberg',
      },
    });
  });

  it('normalises a Nominatim reverse result identically', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        display_name: 'Kronenstraße 24, Villingen-Schwenningen',
        address: { road: 'Kronenstraße', house_number: '24', town: 'Villingen-Schwenningen', postcode: '78054', state: 'Baden-Württemberg' },
      }),
    });
    const res = await request(app).get('/api/geocode/reverse?lat=48.05&lng=8.46');
    expect(res.status).toBe(200);
    expect(res.body.address).toEqual({
      road: 'Kronenstraße',
      house_number: '24',
      city: 'Villingen-Schwenningen',
      postcode: '78054',
      state: 'Baden-Württemberg',
    });
  });
});
