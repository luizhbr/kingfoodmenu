// Pages Function — proxy /api/* → Render backend
// Fase 4: migração Vercel → Render. Intercepta todas as rotas /api/*
// e repassa para https://king-food-api.onrender.com, preservando
// headers, body e reescrevendo Set-Cookie para o domínio do Pages
// (necessário para o CSRF double-submit funcionar cross-origin).

const TARGET = 'https://king-food-api.onrender.com';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const targetUrl = TARGET + url.pathname + url.search;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('origin');

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  const resp = await fetch(targetUrl, init);

  // Reescrever Set-Cookie: remover Domain/Secure para o cookie valer no domínio do Pages
  const respHeaders = new Headers(resp.headers);
  const setCookies = respHeaders.getSetCookie ? respHeaders.getSetCookie() : [];
  if (setCookies.length > 0) {
    respHeaders.delete('set-cookie');
    for (const cookie of setCookies) {
      const rewritten = cookie
        .replace(/;\s*Domain=[^;]+/gi, '')
        .replace(/;\s*Secure/gi, '')
        .replace(/;\s*SameSite=None/gi, '; SameSite=Lax');
      respHeaders.append('set-cookie', rewritten);
    }
  }

  return new Response(resp.body, {
    status: resp.status,
    headers: respHeaders,
  });
}
