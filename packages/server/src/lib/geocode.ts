import logger from './logger.js';

/**
 * Server-side geocoding proxy. Clients (storefront, mobile app) call
 * /api/geocode and never talk to a provider directly, so the provider is
 * swappable without an app release.
 *
 * Providers:
 *  - google    — Google Geocoding API; used when GOOGLE_MAPS_API_KEY is
 *                set (the production choice; needs billing enabled).
 *  - nominatim — keyless OSM fallback for dev; identifying User-Agent +
 *                1 req/s throttle per the OSM usage policy.
 *
 * Responses are normalised to a Nominatim-compatible shape so existing
 * clients parse either provider unchanged:
 *   search  → [{ lat, lon, lng, display_name }]
 *   reverse → { display_name, address: { road, house_number, city, postcode, state } }
 */

export interface GeoHit {
  lat: number;
  lon: number;
  lng: number;
  display_name: string;
}

export interface GeoPlace {
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    postcode?: string;
    state?: string;
  };
}

const GOOGLE_KEY = () => process.env.GOOGLE_MAPS_API_KEY;
const NOMINATIM_BASE = process.env.GEOCODE_UPSTREAM || 'https://nominatim.openstreetmap.org';
const USER_AGENT = process.env.GEOCODE_USER_AGENT || 'kitchenasty-inka/1.0 (+https://inka.kitchenasty.com)';
// Bias results to Germany — single-market product for now.
const REGION = process.env.GEOCODE_REGION || 'de';

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h — addresses don't move
const CACHE_MAX = 5000;
const cache = new Map<string, { at: number; data: unknown }>();

// Nominatim only: 1 req/s upstream throttle. Each caller reserves the
// next free slot before sleeping, so concurrent requests queue instead
// of stampeding. Google has no such policy — no throttle there.
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

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data as T;

  const data = await load();

  if (cache.size >= CACHE_MAX) {
    // Drop the oldest entry — Map iterates in insertion order.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), data });
  return data;
}

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  const res = await fetch(url, { headers: { Accept: 'application/json', ...headers } });
  if (!res.ok) {
    logger.warn({ status: res.status }, 'Geocode upstream HTTP error');
    throw new Error(`Geocoding upstream returned ${res.status}`);
  }
  return res.json();
}

// ---------- Google provider ----------

function googleComponents(result: any): GeoPlace['address'] {
  const get = (type: string) =>
    result.address_components?.find((c: any) => c.types?.includes(type))?.long_name as string | undefined;
  return {
    road: get('route'),
    house_number: get('street_number'),
    city: get('locality') ?? get('postal_town') ?? get('administrative_area_level_3'),
    postcode: get('postal_code'),
    state: get('administrative_area_level_1'),
  };
}

async function googleGeocode(params: URLSearchParams): Promise<any[]> {
  params.set('key', GOOGLE_KEY()!);
  params.set('region', REGION);
  const data = await fetchJson(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
  if (data.status === 'ZERO_RESULTS') return [];
  if (data.status !== 'OK') {
    logger.warn({ status: data.status, error: data.error_message }, 'Google Geocoding error');
    throw new Error(`Google Geocoding returned ${data.status}`);
  }
  return data.results as any[];
}

// ---------- Nominatim provider (dev fallback) ----------

async function nominatim(path: string): Promise<any> {
  await throttle();
  return fetchJson(`${NOMINATIM_BASE}${path}`, { 'User-Agent': USER_AGENT });
}

// ---------- public API ----------

/** Forward geocode: free-text query → normalised hits. */
export async function geocodeSearch(query: string, limit = 1): Promise<GeoHit[]> {
  const capped = Math.min(Math.max(limit, 1), 5);
  return cached(`s:${capped}:${query}`, async () => {
    if (GOOGLE_KEY()) {
      const results = await googleGeocode(new URLSearchParams({ address: query }));
      return results.slice(0, capped).map((r) => ({
        lat: r.geometry.location.lat as number,
        lon: r.geometry.location.lng as number,
        lng: r.geometry.location.lng as number,
        display_name: r.formatted_address as string,
      }));
    }
    const params = new URLSearchParams({ format: 'json', limit: String(capped), q: query });
    const results = (await nominatim(`/search?${params}`)) as any[];
    return results.map((r) => ({
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      lng: parseFloat(r.lon),
      display_name: r.display_name as string,
    }));
  });
}

/** Reverse geocode: lat/lng → normalised place (null when nothing found). */
export async function geocodeReverse(lat: number, lng: number): Promise<GeoPlace | null> {
  const key = `r:${lat.toFixed(6)},${lng.toFixed(6)}`;
  return cached(key, async () => {
    if (GOOGLE_KEY()) {
      const results = await googleGeocode(new URLSearchParams({ latlng: `${lat},${lng}` }));
      const best = results.find((r) => r.types?.includes('street_address')) ?? results[0];
      if (!best) return null;
      return { display_name: best.formatted_address as string, address: googleComponents(best) };
    }
    const params = new URLSearchParams({
      format: 'json',
      lat: lat.toFixed(6),
      lon: lng.toFixed(6),
      zoom: '18',
      addressdetails: '1',
    });
    const r = (await nominatim(`/reverse?${params}`)) as any;
    if (!r || r.error) return null;
    const a = r.address ?? {};
    return {
      display_name: r.display_name as string,
      address: {
        road: a.road,
        house_number: a.house_number,
        city: a.city ?? a.town ?? a.village ?? a.suburb,
        postcode: a.postcode,
        state: a.state ?? a.county,
      },
    };
  });
}

/** Test hook. */
export function clearGeocodeCache(): void {
  cache.clear();
  nextSlot = 0;
}
