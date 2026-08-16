# King Food Authorization Matrix

**Project:** King Food  
**Roles:** GUEST, CUSTOMER, STAFF, DRIVER, MANAGER, SUPER_ADMIN

---

## Permission Matrix

| Operation | GUEST | CUSTOMER | STAFF | DRIVER | MANAGER | SUPER_ADMIN |
|-----------|-------|----------|-------|--------|---------|-------------|
| **Authentication** |
| Register customer | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Login customer | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Login staff | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Register staff | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Social login (Google/FB) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Refresh token | N/A | N/A | N/A | N/A | N/A | N/A |
| Logout / revoke | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Orders** |
| Create order (guest) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create order (customer) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View own orders | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| View all orders | ❌ | ❌ | ✅ | ✅* | ✅ | ✅ |
| View order by ID | ✅** | ✅*** | ✅ | ✅* | ✅ | ✅ |
| Update order status | ❌ | ❌ | ✅ | ✅* | ✅ | ✅ |
| Cancel order | ❌ | ❌**** | ✅ | ❌ | ✅ | ✅ |
| Print order (kitchen) | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Payments** |
| Create Stripe PaymentIntent | ✅** | ✅*** | ✅ | ❌ | ✅ | ✅ |
| Create Checkout Session | ✅** | ✅*** | ✅ | ❌ | ✅ | ✅ |
| Stripe webhook | N/A | N/A | N/A | N/A | N/A | N/A |
| Mark cash payment | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Refund payment | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| PayPal create/capture | ✅** | ✅*** | ✅ | ❌ | ✅ | ✅ |
| **Customer Profile** |
| View own profile | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Update own profile | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View loyalty balance | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Redeem loyalty points | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View cashback wallet | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Use cashback | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Addresses** |
| Create address (checkout) | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| View own addresses | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Update own addresses | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Menu** |
| View menu | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Create category/item | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Update category/item | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Delete category/item | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage options/allergens | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Locations** |
| View locations | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Create location | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Update location | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage delivery zones | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Manage operating hours | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Staff Management** |
| List staff | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Invite staff | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Update staff role | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Deactivate staff | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Reservations** |
| Create reservation | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| View own reservations | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| View all reservations | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Update reservation status | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Tables** |
| View tables | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Manage tables | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Reviews** |
| Submit review | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| View reviews | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Approve/reject review | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Coupons** |
| Validate coupon | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Create coupon | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage coupons | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Settings** |
| View settings | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Update settings | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Payment settings (Stripe keys) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Reports** |
| View reports | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Export reports | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Automation** |
| View rules | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Manage rules | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Print** |
| Manage printers | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Test print | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Manage templates | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Driver Operations** |
| View assigned orders | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Accept/pickup/deliver | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Tracking/Attribution** |
| View tracking events | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Manage campaigns | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Legal/Consent** |
| View legal pages | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Manage legal pages | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Cookie consent | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |

---

## Notes

* **DRIVER** can only view orders assigned to them (controller-enforced)
** **GUEST** order access by UUID only — no authentication required
*** **CUSTOMER** must own the order (IDOR middleware enforced)
**** Customer cancellation not directly exposed — would require staff action

---

## Role Hierarchy

```
SUPER_ADMIN (highest)
    |
    +-- Can do everything
    +-- Manage all staff
    +-- Access payment settings (Stripe keys)
    +-- Manage locations
    |
MANAGER
    |
    +-- All STAFF permissions
    +-- Refund payments
    +-- Manage coupons
    +-- Manage automation rules
    +-- Export reports
    +-- Manage menu (create/update/delete)
    |
STAFF
    |
    +-- View all orders
    +-- Update order status
    +-- Mark cash payments
    +-- Manage printers
    +-- View dashboard/reports
    +-- Manage reservations/tables
    +-- Manage delivery zones
    +-- Create/update menu items
    |
DRIVER (parallel to STAFF)
    |
    +-- View assigned orders only
    +-- Accept/pickup/out-for-delivery/delivered
    +-- View own profile
    |
CUSTOMER
    |
    +-- Own orders only
    +-- Own profile/addresses
    +-- Loyalty/cashback
    +-- Reservations
    +-- Reviews
    |
GUEST (lowest)
    |
    +-- Create order (no account)
    +-- View order by UUID
    +-- Menu browsing
```

---

## Implementation Evidence

### Middleware Stack (from `app.ts` → routes → controllers)

```typescript
// 1. Authentication
authenticate        // Requires Bearer token, sets req.user (staff|customer)
optionalAuth        // Sets req.user if valid Bearer, continues if not

// 2. Authorization
requireStaff        // req.user.type === 'staff'
requireDriver       // req.user.type === 'staff' && role === 'DRIVER'
requireRole(...)    // req.user.role in allowed roles

// 3. Ownership (IDOR protection)
requireOwnership('order')        // Customer owns order, staff bypass
requireOwnership('reservation')  // Customer owns reservation
requireOwnership('review')       // Customer owns review
requireOwnership('loyalty')      // Customer owns loyalty wallet

// 4. Controller-level checks
isOrderOwner(req, order)         // Payment endpoints: customer|staff|guest(email)
```

### Route Mounting (from `app.ts`)

```typescript
app.use('/api/auth', authRoutes);                    // Public + authenticated
app.use('/api/orders', orderRoutes);                 // Mixed auth
app.use('/api/payments', paymentRoutes);             // Mixed auth
app.use('/api/customer', customerRoutes);            // Customer only
app.use('/api/staff', staffRoutes);                  // SUPER_ADMIN/MANAGER
app.use('/api/driver', driverRoutes);                // DRIVER only
app.use('/api/dashboard', dashboardRoutes);          // Staff
app.use('/api/menu', menuRoutes);                    // Staff
app.use('/api/settings', settingsRoutes);            // Staff (SUPER_ADMIN for payments)
app.use('/api/reports', reportsRoutes);              // Staff
app.use('/api/print', printRoutes);                  // Staff + Device
app.use('/api/admin/print/templates', printTemplateRoutes); // Staff
```

---

## IDOR/BOLA Verification

### Tested Scenarios (Code Review)

| Scenario | Endpoint | Protection | Result |
|----------|----------|------------|--------|
| Customer A → Order B | GET `/api/orders/:idB` | `requireOwnership('order')` + controller check | **BLOCKED** (403) |
| Customer A → Order B | GET `/api/orders/my-orders` | Controller filters by `customerId` | **BLOCKED** (scoped) |
| Customer A → Order B | POST `/api/payments/create-intent` | `isOrderOwner()` | **BLOCKED** (403) |
| Guest A → Order B | GET `/api/orders/:idB` | None (UUID only) | **ALLOWED** ⚠️ |
| Staff → Any Order | GET `/api/orders/:id` | `requireStaff` bypass in middleware | **ALLOWED** ✅ |
| Driver → Unassigned Order | GET `/api/driver/orders/:id` | Controller checks assignment | **BLOCKED** (403) |

### Guest Order Access — Risk Assessment

**Current:** `GET /api/orders/:id` with `optionalAuth` allows any UUID holder to view order.

**Risk:** UUID (cuid) = 25 chars, ~128 bits entropy. Brute force infeasible.

**Gap:** No email/phone verification for guest order lookup.

**Recommendation:** Add optional email verification for guest order access (send code to guestEmail).

---

## Privilege Escalation Paths (Analyzed)

| Path | Vector | Mitigation | Status |
|------|--------|------------|--------|
| Customer → Staff | JWT role manipulation | Server validates role from DB on each request (via JWT payload) | **BLOCKED** |
| Staff → MANAGER | Direct API call | `requireRole('MANAGER')` on sensitive endpoints | **BLOCKED** |
| Staff → SUPER_ADMIN | Staff register endpoint | Requires SUPER_ADMIN | **BLOCKED** |
| Driver → Staff | Role confusion | Separate `requireDriver` middleware | **BLOCKED** |
| Guest → Customer | Session fixation | No session — JWT stateless | **N/A** |
| Token replay | Stolen JWT | No revocation list ⚠️ | **PARTIAL** |

---

## Frontend Authorization (NOT Security Controls)

| Page | Customer | Staff | Driver | Admin |
|------|----------|-------|--------|-------|
| `/` | ✅ | ✅ | ❌ | ✅ |
| `/menu` | ✅ | ✅ | ❌ | ✅ |
| `/cart` | ✅ | ✅ | ❌ | ✅ |
| `/checkout` | ✅ | ✅ | ❌ | ✅ |
| `/order/:id` | ✅ (own) | ✅ | ✅ (assigned) | ✅ |
| `/account` | ✅ | ❌ | ❌ | ❌ |
| `/login` | ✅ | ✅ | ✅ | ✅ |
| `/admin/*` | ❌ | ✅ | ❌ | ✅ |
| `/driver/*` | ❌ | ❌ | ✅ | ✅ |

**Note:** Frontend routes are UX only. All API calls enforce authorization server-side.

---

## Audit Trail

| Action | Logged | Fields |
|--------|--------|--------|
| Staff login | ✅ | AuditLog (action=login) |
| Staff register | ✅ | AuditLog (action=create, entity=User) |
| Order create | ✅ | AuditLog (action=create, entity=Order) |
| Order status change | ✅ | AuditLog (action=update, entity=Order, details={status, previousStatus}) |
| Payment create | ⚠️ | Payment record only |
| Payment webhook | ⚠️ | Payment record update |
| Refund | ✅ | AuditLog (action=PAYMENT_REFUNDED) |
| Settings change | ✅ | AuditLog (action=update, entity=SiteSettings) |
| Staff invite | ✅ | AuditLog (action=create, entity=InviteToken) |
| Menu CRUD | ✅ | AuditLog |
| Coupon CRUD | ✅ | AuditLog |

**Gap:** Customer actions not in AuditLog (only staff/admin)
