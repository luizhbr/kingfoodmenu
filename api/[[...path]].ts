/**
 * TEMPORARY SERVERLESS BACKEND — Vercel
 * =====================================
 * Reuses 100% of Express business logic via createApp().
 * Vercel bundles this with esbuild — no tsc needed for the server.
 *
 * LIMITATIONS (documented, NOT hidden):
 *   - Socket.IO: no real-time (polling/SSE possible; Railway later)
 *   - File uploads: ephemeral disk
 *   - Cron: no background timers in serverless
 */
import { createApp } from '../packages/server/src/app.ts';

let app: ReturnType<typeof createApp> | null = null;

function getApp() {
  if (!app) {
    app = createApp();
  }
  return app;
}

export default async function handler(req: any, res: any) {
  const expressApp = getApp();
  expressApp(req, res);
}
