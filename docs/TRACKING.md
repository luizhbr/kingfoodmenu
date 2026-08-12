# Tracking / Customer Journey — King Food Foundation

> **Status:** P13 = PASS (2026-08-12)
> **Endpoint:** POST /api/tracking/events (público, CSRF obrigatório)

## O que é rastreado

| Campo | Origem | Exemplo |
|-------|--------|---------|
| eventType | Frontend (enum) | PAGE_VIEW, SESSION_STARTED, CHECKOUT_STARTED |
| sessionId | sessionStorage (kf_session_id) | sess_1234_abcd |
| source | utm_source / source | instagram, google, direct |
| medium | utm_medium | social, cpc, organic |
| campaign | utm_campaign | campanha-verao-2026 |
| content | utm_content | video-1 |
| term | utm_term | pizza |
| page | window.location.pathname | /menu |
| referrer | document.referrer | https://instagram.com/... |
| landingPage | primeira página da sessão | / |
| customerId | metadata (opcional) | cm_... |
| orderId | metadata (opcional) | ord_... |
| productId | metadata (opcional) | item_... |
| couponCode | metadata (opcional) | KING10 |
| userAgent | header HTTP | — |
| ipAddress | req.ip | — |
| metadata | JSON extra | — |

## Normalização (P13 fix — commit 86a0570)

O frontend envia valores crus de UTM (minúsculos). O Prisma exige enums
UPPERCASE. O controller normaliza:

- `instagram` → `INSTAGRAM`
- `google_ads` → `GOOGLE_ADS`
- `tiktok` → `TIKTOK`
- `page_view` → `PAGE_VIEW`
- desconhecido → `UNKNOWN` (source) / `PAGE_VIEW` (eventType)

**Bug corrigido:** antes, `utm_source=instagram` causava 500
(`Invalid value for argument`). Agora normaliza e persiste.

## Validação de customerId (P13 fix)

- Se `customerId` não existir no banco → evento persistido como anônimo (201)
- Antes: FK violation → 500

## First-touch / Last-touch

- **First touch:** criado na primeira sessão com atribuição (nunca sobrescrito)
- **Last touch:** atualizado a cada nova sessão com atribuição
- Modelo: `Attribution` (por customerId)

## Fluxo

```
VISIT (utm_source=instagram)
   │
   ▼
TRACKING EVENT (POST /api/tracking/events)
   │
   ├── TrackingEvent (persistido)
   ├── Attribution.firstSource (se novo)
   └── Attribution.lastSource (se existente)
   │
   ▼
SESSION (sessionId no sessionStorage)
   │
   ▼
ORDER (createOrder)
   │
   ▼
OrderAttribution (first/last touch no pedido)
```

## Evidências de teste (P13)

| Teste | Local | Produção |
|-------|-------|----------|
| campaignSlug válido | 201 | 201 |
| campaignSlug inexistente | 201 | 201 |
| sem campaignSlug | 201 | 201 |
| customerId inexistente | 201 (anônimo) | 201 (anônimo) |
| eventType minúsculo | 201 (normalizado) | 201 (normalizado) |
| source minúsculo (instagram) | 201 (INSTAGRAM) | 201 (INSTAGRAM) |
| google_ads | — | 201 (GOOGLE_ADS) |
| tiktok | — | 201 (TIKTOK) |
| email | — | 201 (EMAIL) |
| payload repetido 2x | — | 2 eventos distintos (sem duplicação anômala) |

**Neon:** 16 eventos persistidos, zero duplicados (verificado 2026-08-12).

## Models relacionados

- `TrackingEvent` — cada evento
- `Campaign` — campanha (campaignSlug é string livre, não FK obrigatória)
- `OrderAttribution` — atribuição no momento do pedido
