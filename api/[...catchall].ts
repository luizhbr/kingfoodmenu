/**
 * Vercel Serverless catch-all for /api/*
 *
 * Backend de produção ainda não está deployado (Railway/Render pendente).
 * Em vez de devolver o 404 text/plain padrão do Vercel (que quebra
 * res.json() no frontend), responde com JSON estruturado de erro.
 *
 * Quando o backend real for deployado, defina VITE_API_URL e estas
 * rotas nunca serão chamadas.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(503).json({
    error: 'API indisponível',
    message: 'O backend ainda não está deployado. Configure VITE_API_URL apontando para o servidor Express.',
    code: 'BACKEND_NOT_DEPLOYED',
    path: req.url,
  });
}
