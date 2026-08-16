# King Food Dependency Security Audit

**Project:** King Food  
**Package Manager:** npm (workspaces)  
**Lockfile:** package-lock.json (root + per-package)

---

## Root Dependencies

```json
{
  "devDependencies": {
    "@playwright/test": "^1.58.2",
    "@types/node": "^22.0.0",
    "playwright": "^1.58.2",
    "prisma": "^5.22.0",
    "typescript": "^5.7.0"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0"
  }
}
```

### Root Audit

| Package | Version | Latest | Status | Risk |
|---------|---------|--------|--------|------|
| @playwright/test | 1.58.2 | Check | 🟡 | Testing only |
| @types/node | 22.0.0 | Check | 🟡 | Types only |
| playwright | 1.58.2 | Check | 🟡 | Testing only |
| prisma | 5.22.0 | 5.22.0+ | ✅ | Current |
| typescript | 5.7.0 | 5.7.0+ | ✅ | Current |
| @prisma/client | 5.22.0 | 5.22.0+ | ✅ | Current |

---

## Server Dependencies (packages/server/package.json)

### Production Dependencies

| Package | Version | Purpose | Known CVEs | Status |
|---------|---------|---------|------------|--------|
| @kitchenasty/shared | * | Workspace | — | ✅ Internal |
| @prisma/client | ^5.22.0 | ORM | Check advisories | 🟡 |
| bcryptjs | ^3.0.3 | Password hashing | None known | ✅ |
| cookie-parser | ^1.4.7 | Cookie parsing | None known | ✅ |
| cors | ^2.8.5 | CORS | None known | ✅ |
| dotenv | ^16.4.0 | Env loading | None known | ✅ |
| exceljs | ^4.4.0 | Excel export | Check | 🟡 |
| expo-server-sdk | ^3.13.0 | Push notifications | Check | 🟡 |
| express | ^4.21.0 | Web framework | CVE-2024-... | 🟡 CHECK |
| express-rate-limit | ^8.2.1 | Rate limiting | None known | ✅ |
| helmet | ^8.0.0 | Security headers | None known | ✅ |
| jsonwebtoken | ^9.0.3 | JWT | CVE-2022-... | 🟡 CHECK |
| multer | ^2.0.2 | File upload | None known | ✅ |
| nodemailer | ^8.0.1 | Email | Check | 🟡 |
| passport | ^0.7.0 | Auth | None known | ✅ |
| passport-facebook | ^3.0.0 | FB OAuth | Check | 🟡 |
| passport-google-oauth20 | ^2.0.0 | Google OAuth | Check | 🟡 |
| pino | ^10.3.1 | Logging | None known | ✅ |
| pino-http | ^11.0.0 | HTTP logging | None known | ✅ |
| socket.io | ^4.8.3 | WebSockets | Check | 🟡 |
| stripe | ^20.3.1 | Payments | Check | 🟡 |
| swagger-ui-express | ^5.0.1 | API docs | Check | 🟡 |
| zod | ^3.24.0 | Validation | None known | ✅ |

### Dev Dependencies

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| @types/bcryptjs | ^2.4.6 | Types | ✅ |
| @types/cookie-parser | ^1.4.8 | Types | ✅ |
| @types/cors | ^2.8.17 | Types | ✅ |
| @types/express | ^5.0.0 | Types | ✅ |
| @types/jsonwebtoken | ^9.0.10 | Types | ✅ |
| @types/multer | ^2.0.0 | Types | ✅ |
| @types/nodemailer | ^7.0.10 | Types | ✅ |
| @types/passport | ^1.0.17 | Types | ✅ |
| @types/passport-facebook | ^3.0.4 | Types | ✅ |
| @types/passport-google-oauth20 | ^2.0.17 | Types | ✅ |
| @types/supertest | ^6.0.3 | Types | ✅ |
| @types/swagger-ui-express | ^4.1.8 | Types | ✅ |
| pino-pretty | ^13.1.3 | Dev logging | ✅ |
| prisma | ^5.22.0 | CLI | ✅ |
| supertest | ^7.2.2 | Testing | ✅ |
| tsx | ^4.19.0 | Dev runner | ✅ |
| vitest | ^4.0.18 | Testing | ✅ |

---

## Storefront Dependencies (packages/storefront/package.json)

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| @kitchenasty/shared | * | Workspace | ✅ |
| i18next | ^25.8.10 | i18n | 🟡 |
| react | ^18.3.0 | UI | ✅ |
| react-dom | ^18.3.0 | UI | ✅ |
| react-i18next | ^16.5.4 | i18n | 🟡 |
| react-router-dom | ^6.28.0 | Routing | ✅ |
| socket.io-client | ^4.8.3 | WebSockets | 🟡 |
| @types/react | ^18.3.0 | Types | ✅ |
| @types/react-dom | ^18.3.0 | Types | ✅ |
| @vitejs/plugin-react | ^4.3.0 | Build | ✅ |
| autoprefixer | ^10.4.0 | CSS | ✅ |
| intlayer | ^8.1.2 | i18n | 🟡 |
| postcss | ^8.4.0 | CSS | ✅ |
| tailwindcss | ^3.4.0 | CSS | ✅ |
| vite | ^6.0.0 | Build | ✅ |

---

## Admin Dependencies (packages/admin/package.json)

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| @kitchenasty/shared | * | Workspace | ✅ |
| react | ^18.3.0 | UI | ✅ |
| react-dom | ^18.3.0 | UI | ✅ |
| react-router-dom | ^6.28.0 | Routing | ✅ |
| recharts | ^3.7.0 | Charts | 🟡 |
| socket.io-client | ^4.8.3 | WebSockets | 🟡 |
| @types/react | ^18.3.0 | Types | ✅ |
| @types/react-dom | ^18.3.0 | Types | ✅ |
| @vitejs/plugin-react | ^4.3.0 | Build | ✅ |
| autoprefixer | ^10.4.0 | CSS | ✅ |
| postcss | ^8.4.0 | CSS | ✅ |
| tailwindcss | ^3.4.0 | CSS | ✅ |
| vite | ^6.0.0 | Build | ✅ |

---

## Print Agent Dependencies (packages/print-agent/package.json)

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| iconv-lite | (dep) | Encoding | 🟡 Native |
| usb | (dep) | USB printing | 🟡 Native |
| Other deps... | | | |

---

## Known Vulnerability Sources to Check

1. **npm audit** — Run `npm audit --json` in each package
2. **GitHub Dependabot** — Check PRs
3. **Snyk** — `snyk test`
4. **OWASP Dependency Check** — `dependency-check`
5. **CVE Databases** — NVD, GitHub Security Advisories

---

## Critical Packages to Monitor

### express ^4.21.0
- **Risk:** Core framework, high impact if vulnerable
- **Check:** CVE-2024-XXXXX (prototype pollution, regex DoS)
- **Action:** Pin to latest 4.x, monitor 5.x migration

### jsonwebtoken ^9.0.3
- **Risk:** JWT implementation flaws (algorithm confusion, key confusion)
- **Check:** CVE-2022-23529, CVE-2024-XXXXX
- **Mitigation:** HS256 only, secret validation, fail-fast ✅

### stripe ^20.3.1
- **Risk:** Payment processing, financial impact
- **Check:** Stripe security advisories
- **Action:** Update with Stripe API version changes

### socket.io ^4.8.3
- **Risk:** WebSocket hijacking, DoS
- **Check:** CVE-2023-XXXXX, CVE-2024-XXXXX

### exceljs ^4.4.0
- **Risk:** XXE, prototype pollution in parsing
- **Check:** Only processes trusted server-generated data ✅

### passport-google-oauth20 ^2.0.0 / passport-facebook ^3.0.0
- **Risk:** OAuth flow vulnerabilities
- **Check:** State parameter validation, PKCE

---

## Maintenance Concerns (Not Vulnerabilities)

| Package | Concern | Impact |
|---------|---------|--------|
| bcryptjs | v3.x major, v2.x unmaintained | Migration needed |
| passport | v0.7.0, v1.0 in beta | Breaking changes likely |
| socket.io | v4.x, v5.x in development | Migration planning |
| vitest | v4.x, v5.x released | Update test config |
| vite | v6.x major | Check plugin compatibility |
| typescript | v5.7, v5.8+ | Minor updates safe |

---

## Supply Chain Security

### Post-Install Scripts
```bash
# Check for dangerous scripts
npm ls --depth=0 --json | jq -r '.dependencies[] | select(.scripts.postinstall) | .name'
```

### Typosquatting Check
- Verify package names match official registry
- No lookalike packages in lockfile

### Integrity Verification
- package-lock.json has integrity hashes ✅
- `npm ci` enforces lockfile ✅

---

## Recommended Actions

### Immediate (P0)
1. Run `npm audit --audit-level=high` in each workspace
2. Fix any CRITICAL/HIGH findings
3. Verify express, jsonwebtoken, socket.io versions

### Short-term (P1)
1. Enable Dependabot alerts on GitHub
2. Add `npm audit` to CI pipeline
3. Document update procedure for major versions

### Ongoing (P2)
1. Monthly dependency review
2. Subscribe to security advisories for critical packages
3. Maintain SBOM (Software Bill of Materials)

---

## Audit Commands

```bash
# Root
cd /path/to/king-food-foundation-ui
npm audit --json --audit-level=high

# Server
cd packages/server
npm audit --json --audit-level=high

# Storefront
cd packages/storefront
npm audit --json --audit-level=high

# Admin
cd packages/admin
npm audit --json --audit-level=high

# Full tree with details
npm audit --json | jq '.vulnerabilities[] | select(.severity=="critical" or .severity=="high")'
```
