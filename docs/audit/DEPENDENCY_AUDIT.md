# DEPENDENCY AUDIT — KitchenAsty

**Repository:** https://github.com/luizhbr/kitchenasty  
**Branch:** `research/kitchenasty-audit`  
**Audit Date:** 2026-08-11

---

## 1. Package Manager & Workspace

- **Package Manager:** npm
- **Workspaces:** Yes (`packages/*`)
- **Root version:** 0.3.0
- **Node requirement:** 22+

---

## 2. Core Runtime Stack

| Technology       | Purpose                     | Notes                    |
|------------------|-----------------------------|--------------------------|
| Node.js 22       | Runtime                     | Required                 |
| TypeScript 5.7   | Language                    | Strict mode              |
| Express          | HTTP API                    | Backend                  |
| Prisma 5         | ORM                         | PostgreSQL               |
| React 18         | UI                          | Admin + Storefront       |
| Vite 5           | Build tool                  | Frontend                 |
| Tailwind CSS 3   | Styling                     |                          |
| Socket.IO 4      | Realtime                    | Orders / Kitchen         |
| Zod              | Validation                  |                          |
| jsonwebtoken     | Auth                        |                          |
| bcrypt           | Password hashing            |                          |
| Multer           | File uploads                |                          |
| Pino             | Logging                     |                          |
| Stripe / PayPal  | Payments                    |                          |

---

## 3. Testing Stack

| Tool            | Purpose                |
|-----------------|------------------------|
| Vitest          | Unit + Integration     |
| Supertest       | API testing            |
| Playwright      | E2E                    |

---

## 4. Key Observations

- The project uses modern, well-maintained libraries.
- Prisma + Zod combination is solid for type safety and validation.
- React 18 + Vite is a good choice for both admin and storefront.
- Mobile package uses Expo (separate concern for later).

---

## 5. Risks

1. **Dependency freshness** — A full `npm audit` and outdated check should be run after cloning and installing.
2. **Transitive dependencies** — Large monorepos accumulate many transitive packages. Regular audits required.
3. **Payment SDKs** — Must stay up to date for security patches.

---

## 6. Recommendations for King Food

- After forking, run:
  ```bash
  npm install
  npm audit
  npx npm-check-updates
  ```
- Pin critical dependencies in production.
- Add Dependabot or Renovate later.
- Keep a `THIRD_PARTY_LICENSES.md` updated.

---

## 7. Verdict

**No blocking dependency issues identified at architecture level.**  
Ready to proceed to local bootstrap and deeper dependency scanning in the next step of Milestone 0.
