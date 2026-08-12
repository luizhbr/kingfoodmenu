import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { auditLog } from '../lib/audit.js';
import { emitOrderStatusUpdate } from '../lib/socket.js';

// ── Driver delivery app ──────────────────────────────────────────────────────
// Drivers are Users with role DRIVER. Orders are assigned via the existing
// Order.assignedToId (relation "AssignedStaff"). The state machine reuses the
// existing OrderStatus enum — no second machine, no new statuses.
//
// Valid driver transitions:
//   READY            → PICKED_UP
//   PICKED_UP        → OUT_FOR_DELIVERY
//   OUT_FOR_DELIVERY → DELIVERED
//
// Every transition is validated SERVER-SIDE. The client never sends an
// arbitrary status.

const DRIVER_TRANSITIONS: Record<string, string[]> = {
  READY: ['PICKED_UP'],
  PICKED_UP: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
};

export async function getProfile(req: Request, res: Response): Promise<void> {
  if (!req.user || req.user.type !== 'staff' || req.user.role !== 'DRIVER') {
    res.status(401).json({ success: false, error: 'Driver authentication required' });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, phone: true, role: true, avatar: true },
  });
  res.json({ success: true, data: user });
}

// Assigned + available orders for the driver dashboard
export async function getOrders(req: Request, res: Response): Promise<void> {
  if (!req.user || req.user.type !== 'staff' || req.user.role !== 'DRIVER') {
    res.status(401).json({ success: false, error: 'Driver authentication required' });
    return;
  }

  const [assigned, available] = await Promise.all([
    prisma.order.findMany({
      where: {
        assignedToId: req.user.id,
        status: { in: ['PICKED_UP', 'OUT_FOR_DELIVERY', 'READY'] },
        orderType: 'DELIVERY',
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderType: true,
        createdAt: true,
        scheduledAt: true,
        deliveryLine1: true,
        deliveryCity: true,
        deliveryState: true,
        deliveryFormattedAddress: true,
        guestName: true,
        guestPhone: true,
        customer: { select: { name: true, phone: true } },
        items: { select: { name: true, quantity: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.findMany({
      where: {
        status: 'READY',
        orderType: 'DELIVERY',
        assignedToId: null,
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        createdAt: true,
        deliveryLine1: true,
        deliveryCity: true,
        deliveryState: true,
        deliveryFormattedAddress: true,
        _count: { select: { items: true } },
      },
    }),
  ]);

  res.json({ success: true, data: { assigned, available } });
}

export async function getOrder(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!req.user || req.user.type !== 'staff' || req.user.role !== 'DRIVER') {
    res.status(401).json({ success: false, error: 'Driver authentication required' });
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      orderType: true,
      createdAt: true,
      scheduledAt: true,
      comment: true,
      deliveryLine1: true,
      deliveryLine2: true,
      deliveryCity: true,
      deliveryState: true,
      deliveryPostalCode: true,
      deliveryFormattedAddress: true,
      guestName: true,
      guestPhone: true,
      customer: { select: { name: true, phone: true } },
      items: { select: { name: true, quantity: true, options: { select: { name: true } } } },
      assignedToId: true,
    },
  });

  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  // IDOR: a driver can only see orders assigned to them OR available orders
  if (order.assignedToId !== req.user.id && !(order.status === 'READY' && order.assignedToId === null)) {
    res.status(403).json({ success: false, error: 'Not your order' });
    return;
  }

  res.json({ success: true, data: order });
}

const statusSchema = z.object({
  status: z.enum(['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED']),
});

async function updateStatus(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!req.user || req.user.type !== 'staff' || req.user.role !== 'DRIVER') {
    res.status(401).json({ success: false, error: 'Driver authentication required' });
    return;
  }

  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  // Ownership: driver must be assigned
  if (order.assignedToId !== req.user.id) {
    res.status(403).json({ success: false, error: 'Order not assigned to you' });
    return;
  }

  // State machine: valid transition from current status?
  const allowed = DRIVER_TRANSITIONS[order.status] || [];
  if (!allowed.includes(parsed.data.status)) {
    res.status(400).json({
      success: false,
      error: `Invalid transition from ${order.status} to ${parsed.data.status}`,
    });
    return;
  }

  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: parsed.data.status },
    include: { items: { include: { options: true } } },
  });

  auditLog(req, {
    action: 'update',
    entity: 'Order',
    entityId: req.params.id,
    details: { status: parsed.data.status, previousStatus: order.status, driverId: req.user.id },
  });

  emitOrderStatusUpdate({
    id: updated.id,
    orderNumber: updated.orderNumber,
    status: updated.status,
    orderType: updated.orderType,
    customerId: updated.customerId,
  });

  res.json({ success: true, data: { id: updated.id, status: updated.status } });
}

export async function acceptOrder(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!req.user || req.user.type !== 'staff' || req.user.role !== 'DRIVER') {
    res.status(401).json({ success: false, error: 'Driver authentication required' });
    return;
  }

  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }
  if (order.status !== 'READY') {
    res.status(400).json({ success: false, error: 'Order is not available for pickup' });
    return;
  }
  if (order.assignedToId && order.assignedToId !== req.user.id) {
    res.status(403).json({ success: false, error: 'Order already assigned to another driver' });
    return;
  }

  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { assignedToId: req.user.id },
    select: { id: true, orderNumber: true, status: true, assignedToId: true },
  });

  auditLog(req, {
    action: 'update',
    entity: 'Order',
    entityId: req.params.id,
    details: { assignedDriverId: req.user.id },
  });

  res.json({ success: true, data: updated });
}

// Alias endpoints — each action implies its target status. The status is set
// SERVER-SIDE here, never trusted from the client body.
export function pickupOrder(req: Request<{ id: string }>, res: Response): Promise<void> {
  req.body = { ...req.body, status: 'PICKED_UP' };
  return updateStatus(req, res);
}
export function outForDelivery(req: Request<{ id: string }>, res: Response): Promise<void> {
  req.body = { ...req.body, status: 'OUT_FOR_DELIVERY' };
  return updateStatus(req, res);
}
export function deliveredOrder(req: Request<{ id: string }>, res: Response): Promise<void> {
  req.body = { ...req.body, status: 'DELIVERED' };
  return updateStatus(req, res);
}

// Delivery history — completed/cancelled orders assigned to this driver
export async function getHistory(req: Request, res: Response): Promise<void> {
  if (!req.user || req.user.type !== 'staff' || req.user.role !== 'DRIVER') {
    res.status(401).json({ success: false, error: 'Driver authentication required' });
    return;
  }
  const orders = await prisma.order.findMany({
    where: {
      assignedToId: req.user.id,
      status: { in: ['DELIVERED', 'CANCELLED'] },
    },
    orderBy: { updatedAt: 'desc' },
    take: 30,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      createdAt: true,
      deliveryCity: true,
      deliveryState: true,
      _count: { select: { items: true } },
    },
  });
  res.json({ success: true, data: orders });
}
