/**
 * TEMPORARY SERVERLESS BACKEND — Vercel
 * Single function handling ALL /api/* routes.
 * Vercel's catch-all [[...path]] doesn't route nested paths correctly.
 * Instead, we rewrite /api/* to /api (this function).
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
