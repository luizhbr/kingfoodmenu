import { Router, Request, Response } from 'express';
import { geocodeSearch, geocodeReverse } from '../lib/geocode.js';

const router = Router();

// Public (no auth): the storefront zone preview runs pre-login. Abuse is
// bounded by the global rate limiter + the 1 req/s upstream throttle.

router.get('/search', async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 3) {
    res.status(400).json({ success: false, error: 'Query parameter "q" (min 3 chars) is required' });
    return;
  }
  const limit = Number(req.query.limit) || 1;
  try {
    const data = await geocodeSearch(q, limit);
    res.json(data);
  } catch {
    res.status(502).json({ success: false, error: 'Geocoding service unavailable' });
  }
});

router.get('/reverse', async (req: Request, res: Response) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng ?? req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ success: false, error: 'Query parameters "lat" and "lng" are required' });
    return;
  }
  try {
    const data = await geocodeReverse(lat, lng);
    res.json(data);
  } catch {
    res.status(502).json({ success: false, error: 'Geocoding service unavailable' });
  }
});

export default router;
