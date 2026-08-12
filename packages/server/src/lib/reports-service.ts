import { Prisma, OrderStatus } from '@prisma/client';
import prisma from './db.js';

// ── Reports service ──────────────────────────────────────────────────────────
// All report metrics are computed SERVER-SIDE from real ledger data via SQL
// aggregation (COUNT/SUM/GROUP BY). No client-supplied totals are ever used.
//
// TIMEZONE: the restaurant operates in America/New_York (Columbus, OH).
// Vercel runs UTC, so "today" computed with server-local time would be wrong.
// Every date range is computed in the target timezone and converted to UTC
// instants before querying.

export const DEFAULT_TZ = 'America/New_York';

export type PeriodKey =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | 'month'
  | 'prevMonth'
  | 'custom';

export interface DateRange {
  start: Date;
  end: Date; // exclusive
  label: string;
}

/** Compute a date range in the given IANA timezone, returned as UTC instants. */
export function computeRange(period: PeriodKey, tz?: string, customStart?: string, customEnd?: string): DateRange {
  const zone = tz || DEFAULT_TZ;

  if (period === 'custom') {
    const start = customStart ? new Date(customStart) : new Date();
    const end = customEnd ? new Date(customEnd) : new Date();
    return {
      start: new Date(start.getTime()),
      end: new Date(end.getTime() + 86400000), // inclusive end → exclusive next day
      label: `${customStart} → ${customEnd}`,
    };
  }

  // Work in the target timezone using Intl parts
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const y = num('year'), mo = num('month'), d = num('day'), h = num('hour'), mi = num('minute');

  // Today's start in the target zone (as if it were UTC — we convert to instant)
  const todayStartUtc = Date.UTC(y, mo - 1, d, 0, 0, 0, 0);
  const todayStart = new Date(todayStartUtc);

  const msDay = 86400000;
  switch (period) {
    case 'today':
      return { start: todayStart, end: new Date(todayStartUtc + msDay), label: 'Today' };
    case 'yesterday':
      return {
        start: new Date(todayStartUtc - msDay),
        end: todayStart,
        label: 'Yesterday',
      };
    case '7d': {
      const start = new Date(todayStartUtc - 6 * msDay);
      return { start, end: new Date(todayStartUtc + msDay), label: 'Last 7 days' };
    }
    case '30d': {
      const start = new Date(todayStartUtc - 29 * msDay);
      return { start, end: new Date(todayStartUtc + msDay), label: 'Last 30 days' };
    }
    case 'month': {
      const start = new Date(Date.UTC(y, mo - 1, 1));
      const end = new Date(Date.UTC(y, mo, 1));
      return { start, end, label: 'This month' };
    }
    case 'prevMonth': {
      const start = new Date(Date.UTC(y, mo - 2, 1));
      const end = new Date(Date.UTC(y, mo - 1, 1));
      return { start, end, label: 'Previous month' };
    }
    default:
      return { start: todayStart, end: new Date(todayStartUtc + msDay), label: 'Today' };
  }
}

/** Round to cents. */
export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ── Overview: headline numbers for the period ────────────────────────────────

export async function getOverview(range: DateRange) {
  const where: Prisma.OrderWhereInput = { createdAt: { gte: range.start, lt: range.end } };
  const whereNotCancelled: Prisma.OrderWhereInput = { ...where, status: { not: OrderStatus.CANCELLED } };

  const [orders, revenueAgg, statusCounts, typeCounts, customersAgg, itemsAgg] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.aggregate({
      where: whereNotCancelled,
      _sum: { total: true, subtotal: true, discount: true, tax: true, deliveryFee: true },
    }),
    prisma.order.groupBy({ by: ['status'], where, _count: true }),
    prisma.order.groupBy({ by: ['orderType'], where, _count: true }),
    prisma.customer.aggregate({
      _count: true,
      _max: { createdAt: true },
    }),
    prisma.orderItem.aggregate({ where: { order: whereNotCancelled }, _sum: { quantity: true } }),
  ]);

  const statusMap: Record<string, number> = {};
  for (const s of statusCounts) statusMap[s.status] = s._count;

  const sum = revenueAgg._sum;
  const total = sum?.total ?? 0;
  const gross = (sum?.subtotal ?? 0) + (sum?.tax ?? 0) + (sum?.deliveryFee ?? 0);
  const discount = sum?.discount ?? 0;
  const nonCancelled = orders - (statusMap.CANCELLED || 0);

  return {
    orders,
    completed: statusMap.DELIVERED || 0,
    cancelled: statusMap.CANCELLED || 0,
    pending: (statusMap.PENDING || 0) + (statusMap.CONFIRMED || 0),
    revenue: round2(total),
    subtotal: round2(sum?.subtotal ?? 0),
    discount: round2(discount),
    tax: round2(sum?.tax ?? 0),
    deliveryFees: round2(sum?.deliveryFee ?? 0),
    grossSales: round2(gross),
    aov: nonCancelled > 0 ? round2(total / nonCancelled) : 0,
    itemsSold: itemsAgg._sum?.quantity ?? 0,
    customers: customersAgg._count,
    orderTypes: Object.fromEntries(typeCounts.map((t) => [t.orderType, t._count])),
  };
}

// ── Customers: new vs repeat ─────────────────────────────────────────────────

export async function getCustomerStats(range: DateRange) {
  // New customers = created within the period
  const newCustomers = await prisma.customer.count({
    where: { createdAt: { gte: range.start, lt: range.end } },
  });

  // Repeat = customers with ≥2 orders, and orders in the period
  const ordersInPeriod = await prisma.order.findMany({
    where: { createdAt: { gte: range.start, lt: range.end }, customerId: { not: null } },
    select: { customerId: true },
  });
  const customerOrderCounts = new Map<string, number>();
  for (const o of ordersInPeriod) {
    if (!o.customerId) continue;
    customerOrderCounts.set(o.customerId, (customerOrderCounts.get(o.customerId) || 0) + 1);
  }

  // Lifetime order count for each active customer (to classify repeat)
  const customerIds = [...customerOrderCounts.keys()];
  let repeat = 0;
  if (customerIds.length > 0) {
    const lifetime = await prisma.order.groupBy({
      by: ['customerId'],
      where: { customerId: { in: customerIds } },
      _count: true,
    });
    const lifetimeMap = new Map(lifetime.map((l) => [l.customerId, l._count]));
    for (const cid of customerIds) {
      if ((lifetimeMap.get(cid) || 0) >= 2) repeat++;
    }
  }

  return {
    totalCustomers: await prisma.customer.count(),
    newCustomers,
    activeInPeriod: customerIds.length,
    repeatCustomers: repeat,
  };
}

// ── Top products & categories ────────────────────────────────────────────────

export async function getTopProducts(range: DateRange, limit = 10) {
  const rows = await prisma.$queryRaw<{ name: string; quantity: bigint; sales: number; orders: bigint }[]>(
    Prisma.sql`
      SELECT
        oi.name,
        SUM(oi.quantity)::bigint AS quantity,
        COALESCE(SUM(oi.subtotal), 0) AS sales,
        COUNT(DISTINCT oi."orderId")::bigint AS orders
      FROM "order_items" oi
      JOIN "orders" o ON oi."orderId" = o.id
      WHERE o."createdAt" >= ${range.start} AND o."createdAt" < ${range.end} AND o.status != 'CANCELLED'
      GROUP BY oi.name
      ORDER BY sales DESC
      LIMIT ${limit}
    `
  );
  return rows.map((r) => ({
    name: r.name,
    quantity: Number(r.quantity),
    sales: round2(Number(r.sales)),
    orders: Number(r.orders),
  }));
}

export async function getTopCategories(range: DateRange, limit = 10) {
  const rows = await prisma.$queryRaw<{ name: string; quantity: bigint; sales: number }[]>(
    Prisma.sql`
      SELECT
        c.name,
        SUM(oi.quantity)::bigint AS quantity,
        COALESCE(SUM(oi.subtotal), 0) AS sales
      FROM "order_items" oi
      JOIN "menu_items" mi ON oi."menuItemId" = mi.id
      JOIN "categories" c ON mi."categoryId" = c.id
      JOIN "orders" o ON oi."orderId" = o.id
      WHERE o."createdAt" >= ${range.start} AND o."createdAt" < ${range.end} AND o.status != 'CANCELLED'
      GROUP BY c.id, c.name
      ORDER BY sales DESC
      LIMIT ${limit}
    `
  );
  return rows.map((r) => ({
    name: r.name,
    quantity: Number(r.quantity),
    sales: round2(Number(r.sales)),
  }));
}

// ── Coupons (from the CouponUsage ledger — authoritative) ────────────────────

export async function getCouponStats(range: DateRange) {
  const usage = await prisma.couponUsage.aggregate({
    where: { order: { createdAt: { gte: range.start, lt: range.end } } },
    _count: true,
    _sum: { discountAmount: true },
  });
  const byCoupon = await prisma.couponUsage.groupBy({
    by: ['code'],
    where: { order: { createdAt: { gte: range.start, lt: range.end } } },
    _count: true,
    _sum: { discountAmount: true },
    orderBy: { _count: { code: 'desc' } },
    take: 10,
  });
  return {
    totalUsage: usage._count,
    discountGenerated: round2(usage._sum.discountAmount ?? 0),
    byCoupon: byCoupon.map((c) => ({
      code: c.code,
      usage: c._count,
      discount: round2(c._sum.discountAmount ?? 0),
    })),
  };
}

// ── Loyalty (from LoyaltyTransaction ledger) ─────────────────────────────────

export async function getLoyaltyStats(range: DateRange) {
  const agg = await prisma.loyaltyTransaction.groupBy({
    by: ['type'],
    where: { createdAt: { gte: range.start, lt: range.end } },
    _sum: { points: true },
    _count: true,
  });
  const map: Record<string, { points: number; count: number }> = {};
  for (const a of agg) {
    map[a.type] = { points: a._sum.points ?? 0, count: a._count };
  }
  return {
    earned: map.EARN?.points ?? 0,
    earnedCount: map.EARN?.count ?? 0,
    redeemed: Math.abs(map.REDEEM?.points ?? 0),
    redeemedCount: map.REDEEM?.count ?? 0,
    adjusted: map.ADJUST?.points ?? 0,
  };
}

// ── Cashback (from CashbackTransaction ledger — audit truth) ────────────────

export async function getCashbackStats(range: DateRange) {
  const agg = await prisma.cashbackTransaction.groupBy({
    by: ['type'],
    where: { createdAt: { gte: range.start, lt: range.end } },
    _sum: { amount: true },
    _count: true,
  });
  const map: Record<string, { amount: number; count: number }> = {};
  for (const a of agg) {
    map[a.type] = { amount: a._sum.amount ?? 0, count: a._count };
  }
  return {
    credited: round2(Math.abs(map.CREDIT?.amount ?? 0)),
    creditedCount: map.CREDIT?.count ?? 0,
    debited: round2(Math.abs(map.DEBIT?.amount ?? 0)),
    debitedCount: map.DEBIT?.count ?? 0,
    reversed: round2(Math.abs(map.REVERSAL?.amount ?? 0)),
    reversedCount: map.REVERSAL?.count ?? 0,
    adjusted: round2(map.ADJUSTMENT?.amount ?? 0),
  };
}

// ── Delivery & driver performance ────────────────────────────────────────────

export async function getDeliveryStats(range: DateRange) {
  const deliveryOrders = await prisma.order.count({
    where: { orderType: 'DELIVERY', createdAt: { gte: range.start, lt: range.end } },
  });
  const delivered = await prisma.order.count({
    where: {
      orderType: 'DELIVERY',
      status: 'DELIVERED',
      createdAt: { gte: range.start, lt: range.end },
    },
  });
  const cancelled = await prisma.order.count({
    where: {
      orderType: 'DELIVERY',
      status: 'CANCELLED',
      createdAt: { gte: range.start, lt: range.end },
    },
  });

  // Driver performance (assigned orders in period)
  const byDriver = await prisma.order.groupBy({
    by: ['assignedToId'],
    where: {
      assignedToId: { not: null },
      createdAt: { gte: range.start, lt: range.end },
    },
    _count: true,
  });
  const driverIds = byDriver.map((d) => d.assignedToId!).filter(Boolean);
  const drivers = driverIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: driverIds } }, select: { id: true, name: true } })
    : [];
  const driverMap = new Map(drivers.map((d) => [d.id, d.name]));

  const driverPerformance = [];
  for (const row of byDriver) {
    if (!row.assignedToId) continue;
    const driverId = row.assignedToId;
    const deliveredCount = await prisma.order.count({
      where: { assignedToId: driverId, status: 'DELIVERED', createdAt: { gte: range.start, lt: range.end } },
    });
    driverPerformance.push({
      driverId,
      driverName: driverMap.get(driverId) || 'Unknown',
      assigned: row._count,
      delivered: deliveredCount,
      completionRate: row._count > 0 ? round2((deliveredCount / row._count) * 100) : 0,
    });
  }
  driverPerformance.sort((a, b) => b.delivered - a.delivered);

  return {
    deliveryOrders,
    delivered,
    cancelled,
    driverPerformance,
  };
}

// ── Attribution by source (reuses the existing attribution system) ──────────

export async function getAttributionStats(range: DateRange) {
  const bySource = await prisma.orderAttribution.groupBy({
    by: ['source'],
    where: { order: { createdAt: { gte: range.start, lt: range.end } } },
    _count: true,
  });
  const total = bySource.reduce((acc, s) => acc + s._count, 0);
  return {
    total,
    bySource: bySource.map((s) => ({
      source: s.source,
      count: s._count,
      pct: total > 0 ? round2((s._count / total) * 100) : 0,
    })),
  };
}

// ── Daily sales trend (for the chart) ────────────────────────────────────────

export async function getDailyTrend(range: DateRange) {
  const rows = await prisma.$queryRaw<{ date: string; orders: bigint; revenue: number }[]>(
    Prisma.sql`
      SELECT
        TO_CHAR("createdAt"::date, 'YYYY-MM-DD') AS date,
        COUNT(*)::bigint AS orders,
        COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total ELSE 0 END), 0) AS revenue
      FROM "orders"
      WHERE "createdAt" >= ${range.start} AND "createdAt" < ${range.end}
      GROUP BY "createdAt"::date
      ORDER BY "createdAt"::date
    `
  );
  return rows.map((r) => ({
    date: r.date,
    orders: Number(r.orders),
    revenue: round2(Number(r.revenue)),
  }));
}

// ── Orders list (raw rows for the Orders sheet) ─────────────────────────────

export async function getOrdersList(range: DateRange, limit = 2000) {
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: range.start, lt: range.end } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      status: true,
      orderType: true,
      subtotal: true,
      discount: true,
      deliveryFee: true,
      tax: true,
      total: true,
      couponId: true,
      guestName: true,
      customer: { select: { name: true, email: true } },
      assignedTo: { select: { name: true } },
      coupon: { select: { code: true } },
      orderAttribution: { select: { source: true } },
    },
  });
  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    status: o.status,
    orderType: o.orderType,
    subtotal: o.subtotal,
    discount: o.discount,
    deliveryFee: o.deliveryFee,
    tax: o.tax,
    total: o.total,
    couponCode: o.coupon?.code ?? null,
    customerName: o.customer?.name ?? o.guestName ?? null,
    customerEmail: o.customer?.email ?? null,
    driverName: o.assignedTo?.name ?? null,
    attributionSource: o.orderAttribution?.source ?? null,
  }));
}
