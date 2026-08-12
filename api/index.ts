/**
 * TEMPORARY SERVERLESS BACKEND — Vercel
 * =====================================
 * Single function handling ALL /api/* routes.
 *
 * Vercel rewrites /api/* → /api (this function) via vercel.json.
 *
 * RUNTIME: imports the COMPILED Express artifact (packages/server/dist/app.js),
 * NOT TypeScript sources. The dist/ is produced by `npm run build -w packages/server`
 * in the Vercel buildCommand (tsc → CommonJS). Importing src/*.ts directly
 * breaks in the serverless runtime (MODULE_NOT_FOUND → FUNCTION_INVOCATION_FAILED).
 *
 * LIMITATIONS (documented, NOT hidden):
 *   - Socket.IO: no real-time (Railway later)
 *   - File uploads: ephemeral disk
 *   - Cron: no background timers in serverless
 */
import { createApp } from '../packages/server/dist/app.js';

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
