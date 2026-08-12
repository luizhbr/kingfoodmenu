"use strict";

import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import prisma from '../lib/db.js';

const router = Router();

// All attribution routes require authentication
router.use(authenticate);

// GET /api/attribution/customer/:id — Get customer attribution
router.get("/customer/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const attribution = await prisma.attribution.findUnique({
      where: { customerId: id },
      include: { campaign: true },
    });
    if (!attribution) {
      return res.status(404).json({ error: "Attribution not found" });
    }
    res.json({ data: attribution });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch attribution" });
  }
});

// GET /api/attribution/order/:orderId — Get order attribution
router.get("/order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const attribution = await prisma.orderAttribution.findUnique({
      where: { orderId },
    });
    if (!attribution) {
      return res.status(404).json({ error: "Order attribution not found" });
    }
    res.json({ data: attribution });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch order attribution" });
  }
});

// GET /api/attribution/summary — Attribution summary (MANAGER+ only)
router.get("/summary", requireRole("MANAGER"), async (req, res) => {
  try {
    const [
      totalOrders,
      attributedOrders,
      unknownOrders,
      totalRevenue,
      unknownRevenue,
      bySource,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.orderAttribution.count({
        where: { source: { not: "UNKNOWN" } },
      }),
      prisma.orderAttribution.count({
        where: { source: "UNKNOWN" },
      }),
      prisma.order.aggregate({ _sum: { total: true } }),
      prisma.orderAttribution.count({
        where: { source: "UNKNOWN" },
      }),
      prisma.orderAttribution.groupBy({
        by: ["source"],
        _count: { id: true },
      }),
    ]);

    const revenue = totalRevenue._sum.total || 0;
    const coverage = totalOrders > 0 ? (attributedOrders / totalOrders) * 100 : 0;

    res.json({
      data: {
        totalOrders,
        attributedOrders,
        unknownOrders,
        coverage: Math.round(coverage * 10) / 10,
        totalRevenue: revenue,
        unknownRevenue,
        bySource: bySource.map((s) => ({
          source: s.source,
          orders: s._count.id,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch attribution summary" });
  }
});

// GET /api/attribution/by-source — Revenue by source (MANAGER+ only)
router.get("/by-source", requireRole("MANAGER"), async (req, res) => {
  try {
    const { from, to } = req.query;
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) where.createdAt.lte = new Date(to as string);
    }

    const bySource = await prisma.orderAttribution.groupBy({
      by: ["source"],
      _count: { id: true },
      where,
    });

    res.json({ data: bySource });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch attribution by source" });
  }
});

export default router;
