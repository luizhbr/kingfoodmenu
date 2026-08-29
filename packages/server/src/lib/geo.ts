/**
 * Ray-casting algorithm to determine if a point is inside a polygon.
 * @param lat - Latitude of the point
 * @param lng - Longitude of the point
 * @param polygon - Array of [lat, lng] coordinate pairs forming the polygon
 */
export function isPointInPolygon(
  lat: number,
  lng: number,
  polygon: [number, number][]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    // Contrato do sistema: cada par é [lat, lng] (ver JSDoc acima e consumidores).
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}


// ── Distance-based delivery pricing (Haversine, no per-call API cost) ────────

/** Great-circle distance between two points, in miles. */
export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Delivery fee tiers by distance (miles) — converted from the reference
 * configuration (meters → miles) used by the business.
 * The applied fee is the first tier whose maxMiles >= distance.
 */
export const DELIVERY_FEE_TIERS: { maxMiles: number; fee: number }[] = [
  { maxMiles: 2.6, fee: 6 },
  { maxMiles: 4.6, fee: 8 },
  { maxMiles: 5.9, fee: 10 },
  { maxMiles: 7.5, fee: 12 },
  { maxMiles: 9.1, fee: 15 },
  { maxMiles: 10.6, fee: 20 },
];

/** Hard coverage limit (miles) — orders beyond this are refused. */
export const DELIVERY_MAX_MILES = 10.6;

/**
 * Fee for a delivery distance in miles.
 * Returns null when the address is outside the delivery coverage
 * (distance > 10.6 mi) — the caller must refuse the order.
 */
export function deliveryFeeForDistance(miles: number): number | null {
  if (!Number.isFinite(miles) || miles < 0) return null;
  const tier = DELIVERY_FEE_TIERS.find((t) => miles <= t.maxMiles);
  return tier ? tier.fee : null;
}
