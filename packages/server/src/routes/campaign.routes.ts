"use strict";

import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { Prisma } from "@prisma/client";

const router = Router();

// All campaign routes require MANAGER+ role
router.use(authenticate);
router.use(authorize("MANAGER"));

// GET /api/campaigns — List all campaigns
router.get("/", async (req, res) => {
  try {
    const { page = "1", limit = "20", isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === "true";

    const [campaigns, total] = await Promise.all([
      req.prisma.campaign.findMany({
        where,
        skip,
        take,
        include: { partner: true, _count: { select: { trackingEvents: true, qrCodes: true, referrals: true } } },
        orderBy: { createdAt: "desc" },
      }),
      req.prisma.campaign.count({ where }),
    ]);

    res.json({
      data: campaigns,
      pagination: { page: Number(page), limit: take, total, totalPages: Math.ceil(total / take) },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

// POST /api/campaigns — Create campaign
router.post("/", async (req, res) => {
  try {
    const campaign = await req.prisma.campaign.create({ data: req.body });
    res.status(201).json({ data: campaign });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return res.status(409).json({ error: "Campaign slug already exists" });
    }
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

// GET /api/campaigns/:id — Get campaign
router.get("/:id", async (req, res) => {
  try {
    const campaign = await req.prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: { partner: true, qrCodes: true, referrals: true },
    });
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    res.json({ data: campaign });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch campaign" });
  }
});

// PATCH /api/campaigns/:id — Update campaign
router.patch("/:id", async (req, res) => {
  try {
    const campaign = await req.prisma.campaign.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: campaign });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return res.status(404).json({ error: "Campaign not found" });
    }
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

// DELETE /api/campaigns/:id — Delete campaign
router.delete("/:id", async (req, res) => {
  try {
    await req.prisma.campaign.delete({ where: { id: req.params.id } });
    res.json({ data: { id: req.params.id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return res.status(404).json({ error: "Campaign not found" });
    }
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

export default router;
