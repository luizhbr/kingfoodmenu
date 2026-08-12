/**
 * TEMPORARY SERVERLESS BACKEND — Vercel
 * =====================================
 * Solução TEMPORÁRIA: roda o Express completo como função serverless.
 * Reutiliza 100% da lógica de negócio existente (createApp do Express).
 *
 * FUTURE ARCHITECTURE (alvo):
 *   Vercel   → Frontend (React SPA)
 *   Railway  → Express + Socket.IO (tempo real)
 *   Neon     → PostgreSQL
 *
 * LIMITAÇÕES (documentadas, NÃO fingir que funcionam):
 *   - Socket.IO: não roda em serverless. Kitchen Display NÃO tem
 *     tempo real nesta arquitetura. (Polling/SSE são possíveis;
 *     Socket.IO virá com Railway.)
 *   - Upload de arquivos (multer): storage em disco efêmero —
 *     arquivos somem entre invocations.
 *   - Cron (metricCleanup): não roda — o import não inicia timers
 *     no runtime serverless.
 *
 * Para voltar ao Railway: basta rodar `npm run build -w packages/server
 * && npm start` — nada nesta arquitetura altera o servidor Express.
 */
import { createApp } from '../packages/server/dist/app.js';

// Reuse the Express app across warm invocations
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
