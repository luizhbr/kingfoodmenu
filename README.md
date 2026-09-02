# King Food Foundation

Sistema de pedidos online, reservas e gestão para restaurante — monorepo
com storefront público, painel admin/POS e API serverless.

**Domínio:** https://king-food-foundation-ui.vercel.app
**Admin:** https://king-food-foundation-ui.vercel.app/admin/

## Features

- 🛒 Storefront (menu, carrinho, checkout, pedidos)
- 🏪 Admin/POS (dashboard, pedidos, menu, staff, settings)
- 🍳 Kitchen Display (polling 15s)
- 📊 Sales Attribution (first/last touch)
- 🎯 Customer Journey Tracking (UTM, sessions)
- 🎟️ Cupons, reservas, reviews, loyalty
- 🔒 CSRF + JWT + RBAC + IDOR protection

## Architecture

```
Storefront/Admin (React/Vite)
   → Vercel (rewrites)
   → api/index.ts (serverless)
   → Express (packages/server/dist)
   → Controllers
   → Prisma
   → Supabase PostgreSQL
   ```

Ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Express + TypeScript |
| Frontend | React + Vite |
| ORM | Prisma 5.22 |
| Banco | Supabase PostgreSQL |
| Deploy | Vercel serverless |

## Development

```bash
npm install
cp .env.deploy .env
npx prisma generate
npm run dev:server    # API :3000
npm run dev:storefront  # :5173
npm run dev:admin     # :5174
```

## Environment

Ver [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) — apenas nomes, nunca valores.

## Testing

```bash
npm run test:unit -w packages/server   # 29/29
npm run build                          # typecheck + build
```

Ver [docs/TESTING.md](docs/TESTING.md)

## Deployment

```bash
vercel --prod --yes
```

Ver [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Admin

Ver [docs/ADMIN_POS.md](docs/ADMIN_POS.md)

## Kitchen

Ver [docs/KITCHEN.md](docs/KITCHEN.md)

## Tracking

Ver [docs/TRACKING.md](docs/TRACKING.md)

## Security

Ver [docs/SECURITY.md](docs/SECURITY.md)

## Documentation

| Documento | Conteúdo |
|-----------|----------|
| [PROJECT_SNAPSHOT.md](docs/PROJECT_SNAPSHOT.md) | Estado atual do projeto |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitetura |
| [API.md](docs/API.md) | Mapa de rotas |
| [DATABASE.md](docs/DATABASE.md) | Banco de dados |
| [ORDER_FLOW.md](docs/ORDER_FLOW.md) | Ciclo do pedido |
| [ADMIN_POS.md](docs/ADMIN_POS.md) | Admin/POS |
| [KITCHEN.md](docs/KITCHEN.md) | Kitchen display |
| [TRACKING.md](docs/TRACKING.md) | Customer journey |
| [SALES_ATTRIBUTION.md](docs/SALES_ATTRIBUTION.md) | Atribuição de vendas |
| [SECURITY.md](docs/SECURITY.md) | Segurança |
| [ENVIRONMENT.md](docs/ENVIRONMENT.md) | Variáveis de ambiente |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploy |
| [TESTING.md](docs/TESTING.md) | Testes |
| [KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) | Problemas conhecidos |
| [ROADMAP.md](docs/ROADMAP.md) | Roadmap |
| [ORPHAN_ROUTES.md](docs/ORPHAN_ROUTES.md) | Rotas órfãs |

Obsidian: [docs/obsidian/](docs/obsidian/) — abrir como vault.

## Roadmap

Ver [docs/ROADMAP.md](docs/ROADMAP.md)

## Contributing

Ver [CONTRIBUTING.md](CONTRIBUTING.md) e [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md)

## License

Baseado em **KitchenAsty** (MIT) — ver [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md),
[docs/LICENSE_AUDIT.md](docs/LICENSE_AUDIT.md) e
[docs/CODE_PROVENANCE.md](docs/CODE_PROVENANCE.md).
