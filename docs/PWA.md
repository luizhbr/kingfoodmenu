# PWA — King Food Foundation

> **Status:** VERIFIED (P7, 2026-08-12)

## Existente

- `packages/storefront/public/manifest.json` — name "King Food", display standalone, 3 icons
- `packages/storefront/public/sw.js` — service worker
- HTTPS via Vercel
- Instalável (verificado em produção: manifest 200, sw.js 200)

## Driver App

- Rotas `/driver/*` fora do Layout (app independente, mobile-first)
- Token do driver em `localStorage.driver_token` (separado do customer)
- Polling 15s (mesmo padrão do kitchen display)
- Sem dados sensíveis do cliente no cache

## Próximas melhorias (não bloqueiam P7)

- Push notifications (infra não existe — registrar como próxima etapa)
- Offline fallback avançado
- Cache strategy refinada
