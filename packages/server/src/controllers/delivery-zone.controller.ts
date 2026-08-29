import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { haversineMiles, deliveryFeeForDistance, DELIVERY_MAX_MILES } from '../lib/geo.js';
import { isPointInPolygon } from '../lib/geo.js';

/**
 * Contrato do sistema: boundaries é um polígono como array de pares [lat, lng]
 * (ver lib/geo.ts e isPointInPolygon). Validamos estrutura e faixas para
 * rejeitar payloads inválidos antes de chegar ao Prisma.
 */
const boundaryPair = z.tuple([
  z.number().finite().min(-90).max(90),
  z.number().finite().min(-180).max(180),
]);

/**
 * Polígono: >= 3 pares [lat, lng] DISTINTOS e fechado (1o vertice == ultimo,
 * como GeoJSON). Rejeita anéis abertos e duplicatas que quebrariam o ray-casting.
 */
const boundariesSchema = z
  .array(boundaryPair)
  .min(3)
  .refine(
    (pts) => {
      const seen = new Set(pts.map((p) => `${p[0]},${p[1]}`));
      return seen.size >= 3;
    },
    { message: 'boundaries deve ter pelo menos 3 vertices distintos' }
  )
  .refine(
    (pts) => {
      const first = pts[0];
      const last = pts[pts.length - 1];
      return first[0] === last[0] && first[1] === last[1];
    },
    { message: 'boundaries deve ser um poligono fechado (1o vertice == ultimo)' }
  );

const createZoneSchema = z.object({
  name: z.string().min(1),
  charge: z.number().min(0).default(0),
  minOrder: z.number().min(0).default(0),
  boundaries: boundariesSchema.optional(),
  isActive: z.boolean().default(true),
});

const updateZoneSchema = createZoneSchema.partial();

export async function listDeliveryZones(req: Request<{ locationId: string }>, res: Response): Promise<void> {
  const { locationId } = req.params;

  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) {
    res.status(404).json({ success: false, error: 'Location not found' });
    return;
  }

  const zones = await prisma.deliveryZone.findMany({
    where: { locationId },
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, data: zones });
}

export async function createDeliveryZone(req: Request<{ locationId: string }>, res: Response): Promise<void> {
  const { locationId } = req.params;
  const parsed = createZoneSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) {
    res.status(404).json({ success: false, error: 'Location not found' });
    return;
  }

  const zone = await prisma.deliveryZone.create({
    data: { locationId, ...parsed.data },
  });

  res.status(201).json({ success: true, data: zone });
}

export async function updateDeliveryZone(req: Request<{ locationId: string; zoneId: string }>, res: Response): Promise<void> {
  const { locationId, zoneId } = req.params;
  const parsed = updateZoneSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const zone = await prisma.deliveryZone.findFirst({
    where: { id: zoneId, locationId },
  });
  if (!zone) {
    res.status(404).json({ success: false, error: 'Delivery zone not found' });
    return;
  }

  const updated = await prisma.deliveryZone.update({
    where: { id: zoneId },
    data: parsed.data,
  });

  res.json({ success: true, data: updated });
}

export async function deleteDeliveryZone(req: Request<{ locationId: string; zoneId: string }>, res: Response): Promise<void> {
  const { locationId, zoneId } = req.params;

  const zone = await prisma.deliveryZone.findFirst({
    where: { id: zoneId, locationId },
  });
  if (!zone) {
    res.status(404).json({ success: false, error: 'Delivery zone not found' });
    return;
  }

  await prisma.deliveryZone.delete({ where: { id: zoneId } });
  res.json({ success: true, message: 'Delivery zone deleted' });
}

export async function checkDeliveryZone(req: Request<{ locationId: string }>, res: Response): Promise<void> {
  const { locationId } = req.params;
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ success: false, error: 'lat and lng query parameters are required' });
    return;
  }

  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) {
    res.status(404).json({ success: false, error: 'Location not found' });
    return;
  }

  const zones = await prisma.deliveryZone.findMany({
    where: { locationId, isActive: true },
  });

  for (const zone of zones) {
    if (zone.boundaries && Array.isArray(zone.boundaries)) {
      if (isPointInPolygon(lat, lng, zone.boundaries as [number, number][])) {
        res.json({ success: true, data: zone });
        return;
      }
    }
  }

  res.status(404).json({ success: false, error: 'Address is outside delivery zones' });
}

const checkDeliveryAddressSchema = z.object({
  locationId: z.string().min(1).optional(),
  line1: z.string().trim().min(1),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  zip: z.string().trim().min(1),
  lat: z.number().finite().optional(),
  lng: z.number().finite().optional(),
}).refine((value) => (value.lat == null) === (value.lng == null), {
  message: 'lat and lng must be provided together',
  path: ['lat'],
});

/**
 * Storefront delivery pre-check. The address fields are the public contract;
 * coordinates are optional until a geocoder is configured. Without coordinates,
 * this mirrors createOrder by selecting the lowest-charge active zone. The final
 * order endpoint remains authoritative and recalculates fee/minimum server-side.
 */
export async function checkDeliveryAddress(req: Request, res: Response): Promise<void> {
  const parsed = checkDeliveryAddressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const { locationId, lat, lng } = parsed.data;
  const location = await prisma.location.findFirst({
    where: {
      ...(locationId ? { id: locationId } : {}),
      isActive: true,
      deliveryEnabled: true,
    },
    orderBy: { name: 'asc' },
  });

  if (!location) {
    res.status(404).json({ success: false, error: 'No active delivery location found' });
    return;
  }

  const zones = await prisma.deliveryZone.findMany({
    where: { locationId: location.id, isActive: true },
    orderBy: { charge: 'asc' },
  });

  if (zones.length === 0) {
    res.status(404).json({ success: false, error: 'Delivery is unavailable for this location' });
    return;
  }

  let matchedZone = zones[0];
  let distanceMiles: number | null = null;
  let fee: number | null = matchedZone.charge;

  if (lat != null && lng != null && location.lat != null && location.lng != null) {
    // Distance-based pricing (authoritative): Haversine from the store.
    distanceMiles = Math.round(haversineMiles(location.lat, location.lng, lat, lng) * 100) / 100;
    fee = deliveryFeeForDistance(distanceMiles);
    if (fee == null) {
      res.status(404).json({
        success: false,
        error: `Seu endereço está fora da nossa área de entrega (até ${DELIVERY_MAX_MILES} milhas). Considere a opção de retirada.`,
        data: { distanceMiles, maxMiles: DELIVERY_MAX_MILES },
      });
      return;
    }
  } else if (lat != null && lng != null) {
    // Coordinates present but the store has no origin — fall back to polygon zones.
    const polygonZones = zones.filter((zone) => zone.boundaries && Array.isArray(zone.boundaries));
    if (polygonZones.length > 0) {
      const polygonMatch = polygonZones.find((zone) =>
        isPointInPolygon(lat, lng, zone.boundaries as [number, number][])
      );
      if (!polygonMatch) {
        res.status(404).json({ success: false, error: 'Address is outside delivery zones' });
        return;
      }
      matchedZone = polygonMatch;
      fee = matchedZone.charge;
    }
  }

  res.json({
    success: true,
    data: {
      eligible: true,
      fee,
      minOrder: matchedZone.minOrder,
      zoneId: matchedZone.id,
      zoneName: matchedZone.name,
      locationId: location.id,
      ...(distanceMiles != null ? { distanceMiles } : {}),
    },
  });
}
