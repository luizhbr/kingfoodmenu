# DELIVERY ZONES & GOOGLE MAPS — Contrato e Integração

> Documento de referência para áreas de entrega (Delivery Zones), validação de polígono
> e integração com Google Maps (autocomplete de endereço + área de entrega visual).

## 1. Contrato de dados — `boundaries`

O campo `boundaries` de uma zona de entrega (`DeliveryZone` no Prisma, `Json?`) é:

**Formato:** array de pares `[lat, lng]` formando um polígono.

```json
[
  [39.95, -83.10],
  [39.95, -82.90],
  [40.05, -82.90],
  [40.05, -83.10]
]
```

Regras:
- Cada par é **`[lat, lng]`** (nesta ordem — ver `packages/server/src/lib/geo.ts`).
- `lat` ∈ [-90, 90]; `lng` ∈ [-180, 180]; números finitos.
- Mínimo **3 vértices** (triângulo).
- O polígono é fechado implicitamente (último ponto conecta ao primeiro).

## 2. Validação

| Camada | Onde | O que faz |
|---|---|---|
| Server (zod) | `delivery-zone.controller.ts` | `boundariesSchema` — rejeita payloads inválidos (400) antes do Prisma |
| Client (admin) | `DeliveryZoneList.tsx` | `parseBoundaries` espelha o contrato, erro inline no form |
| Unit test | `__tests__/unit/geo.test.ts` | Fixa o contrato `[lat,lng]` e o ray-casting (11 casos) |

## 3. Teste de ponto na zona (ray-casting)

`isPointInPolygon(lat, lng, polygon)` em `packages/server/src/lib/geo.ts`:
- Algoritmo: ray-casting standard.
- Consumidores: `delivery-zone.controller.ts` (check via query), `order.controller.ts` (validação na criação do pedido e minOrder por zona).
- **Pitfall histórico (corrigido):** a implementação original interpretava os pares como `[lng, lat]` — pedidos dentro da zona eram rejeitados. O teste `geo.test.ts` com retângulo assimétrico (lat 0–1, lng 10–11) previne regressão.

## 4. Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/locations/:locationId/delivery-zones` | Listar zonas |
| POST | `/api/locations/:locationId/delivery-zones` | Criar zona (auth, SUPER_ADMIN/MANAGER) |
| PATCH | `/api/locations/:locationId/delivery-zones/:zoneId` | Editar zona (auth, SUPER_ADMIN/MANAGER) |
| DELETE | `/api/locations/:locationId/delivery-zones/:zoneId` | Excluir zona (auth, SUPER_ADMIN) |
| POST | `/api/delivery/zones/check` | Check público de endereço → { fee, inZone } |
| GET | `/api/locations/:id/delivery-zones/check?lat&lng` | Check por coordenadas |

## 5. Google Maps — integração

### 5.1 Storefront (checkout) — autocomplete
- `packages/storefront/src/pages/Checkout.tsx` usa `@googlemaps/js-api-loader` + `AutocompleteService` + Places (getDetails).
- **Ativação:** definir `VITE_GOOGLE_MAPS_API_KEY` no `.env` do storefront. Sem a key, o campo de endereço é texto livre (fallback seguro — nunca bloqueia o checkout).
- Erros TS pré-existentes (tipos do Loader/`window.google`): precisam de `@types/google.maps` (dependência de dev) — **DEFERRED** (área protegida Checkout).

### 5.2 Admin — áreas de entrega
- `packages/admin/src/pages/DeliveryZoneList.tsx`: CRUD completo (nome, charge, minOrder, boundaries), validação client+server, responsivo.
- **Sem key** → editor JSON de coordenadas + validação. **Com key** (futuro) → mapa interativo com desenho de polígono.
- A key do admin fica em `SiteSettings.generalSettings.googleMapsApiKey` (API autenticada, nunca pública).

### 5.3 Segurança da API key
- NUNCA hardcode em código-fonte.
- Storefront: `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` (não commitada).
- Admin: `generalSettings.googleMapsApiKey` via settings API (só admin autenticado).
- Key do Maps é pública por natureza no frontend; proteger via restrição de domínio no console do Google Cloud.

## 6. Fluxo do checkout com zona

1. Usuário preenche endereço (autocomplete se key presente).
2. Frontend chama `POST /api/delivery/zones/check` (debounce 600ms) com `{ locationId, line1, city, state, zip }`.
3. Server geocodifica (se houver key/config) ou usa coords manuais; testa `isPointInPolygon`.
4. Retorna `fee` e `inZone`; frontend exibe taxa ou erro "fora da área de entrega".
5. `order.controller.ts` re-valida a zona na criação do pedido (segurança: nunca confiar só no client).
