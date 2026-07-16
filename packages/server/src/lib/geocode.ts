import logger from './logger.js';

/**
 * Server-side proxy for OSM Nominatim so clients (storefront, mobile app)
 * never call the public endpoint directly. Nominatim's usage policy
 * demands an identifying User-Agent and max 1 request/second per app —
 * both enforced here, plus a TTL cache since address lookups repeat
 * heavily (same office buildings, same zone checks).
 *
 * Responses are passed through verbatim (Nominatim JSON), so clients that
 * previously called Nominatim directly only swap the base URL.
 */

const NOMINATIM_BASE = process.env.GEOCODE_UPSTREAM || 'https://nominatim.openstreetmap.org';
const USER_AGENT = process.env.GEOCODE_USER_AGENT || 'kitchenasty-inka/1.0 (+https://inka.kitchenasty.com)';

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h — addresses don't move
const CACHE_MAX = 5000;
const cache = new Map<string, { at: number; data: unknown }>();

// 1 req/s upstream throttle. Each caller reserves the next free slot
// before sleeping, so concurrent requests queue instead of stampeding.
const MIN_INTERVAL = 1100;
let nextSlot = 0;
async function throttle(): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, nextSlot);
  nextSlot = slot + MIN_INTERVAL;
  if (slot > now) {
    await new Promise((resolve) => setTimeout(resolve, slot - now));
  }
}

async function upstream(path: string): Promise<unknown> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data;

  await throttle();
  const res = await fetch(`${NOMINATIM_BASE}${path}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) {
    logger.warn({ path, status: res.status }, 'Nominatim upstream error');
    throw new Error(`Geocoding upstream returned ${res.status}`);
  }
  const data = await res.json();

  if (cache.size >= CACHE_MAX) {
    // Drop the oldest entry — Map iterates in insertion order.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(path, { at: Date.now(), data });
  return data;
}

/** Forward geocode: free-text query → Nominatim search results array. */
export async function geocodeSearch(query: string, limit = 1): Promise<unknown> {
  const params = new URLSearchParams({
    format: 'json',
    limit: String(Math.min(Math.max(limit, 1), 5)),
    q: query,
  });
  return upstream(`/search?${params}`);
}

/** Reverse geocode: lat/lng → Nominatim place object. */
export async function geocodeReverse(lat: number, lng: number): Promise<unknown> {
  const params = new URLSearchParams({
    format: 'json',
    lat: lat.toFixed(6),
    lon: lng.toFixed(6),
  });
  return upstream(`/reverse?${params}`);
}

/** Test hook. */
export function clearGeocodeCache(): void {
  cache.clear();
  nextSlot = 0;
}
