# LICENSE AUDIT — KitchenAsty

**Repository:** https://github.com/luizhbr/kitchenasty  
**Upstream:** https://github.com/mighty840/kitchenasty  
**Branch:** `research/kitchenasty-audit`  
**Audit Date:** 2026-08-11

---

## 1. Primary License

| Item              | Value                                      |
|-------------------|--------------------------------------------|
| License           | MIT License                                |
| Copyright         | Copyright (c) 2025 KitchenAsty Contributors |
| File              | `/LICENSE`                                 |
| Commercial use    | ✅ Allowed                                 |
| Modification      | ✅ Allowed                                 |
| Distribution      | ✅ Allowed                                 |
| Private use       | ✅ Allowed                                 |
| Sublicense        | ✅ Allowed                                 |
| Warranty          | ❌ None (AS IS)                            |

### Obligations

When using or redistributing KitchenAsty code:

1. The original copyright notice must be preserved.
2. The MIT license text must be included in all copies or substantial portions of the Software.

---

## 2. Compatibility with King Food

King Food intends to build a **private commercial platform** based on this codebase.

**Conclusion:** The MIT license is fully compatible with this goal.

No copyleft restrictions apply. King Food can:

- Keep the platform closed-source
- Rebrand it
- Modify the code extensively
- Sell or use it commercially
- Add proprietary modules (WhatsApp, Hermes, N8N integrations, etc.)

---

## 3. Recommended Attribution Practice

Even though MIT is permissive, good practice for King Food:

- Keep a `THIRD_PARTY_LICENSES.md` file
- Maintain the original LICENSE file (or a clear attribution section)
- Document any significant modifications

---

## 4. Third-Party Dependencies

Major runtime dependencies (to be fully expanded in DEPENDENCY_AUDIT.md):

- React, Express, Prisma, Socket.IO, Tailwind, Zod, jsonwebtoken, bcrypt, Stripe SDK, etc.

Most of these also use permissive licenses (MIT, Apache-2.0, BSD).

A full dependency license scan is recommended before production release, but no immediate blockers are present.

---

## 5. Final License Verdict

| Question                                      | Answer     |
|-----------------------------------------------|------------|
| Can King Food use this commercially?          | Yes        |
| Can King Food keep it private?                | Yes        |
| Can King Food modify it heavily?              | Yes        |
| Is there any copyleft risk (GPL, AGPL, etc.)? | No         |
| Action required before using?                 | Attribution only |

**Status:** ✅ APPROVED for use as foundation of King Food private platform.
