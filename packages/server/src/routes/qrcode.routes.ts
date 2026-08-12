"use strict";

import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import prisma from '../lib/db.js';

const router = Router();

// GET /api/qrcodes — List QR codes (MANAGER+)
router.get("/", authenticate, requireRole("MANAGER"), async (req, res) => {
  try {
    const qrCodes = await prisma.qRCode.findMany({
      include: { campaign: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: qrCodes });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch QR codes" });
  }
});

// POST /api/qrcodes — Create QR code (MANAGER+)
router.post("/", authenticate, requireRole("MANAGER"), async (req, res) => {
  try {
    const qrCode = await prisma.qRCode.create({ data: req.body });
    res.status(201).json({ data: qrCode });
  } catch (err) {
    res.status(500).json({ error: "Failed to create QR code" });
  }
});

// GET /api/qrcodes/:code — Track QR scan (public, increments scan count)
router.get("/:code", async (req, res) => {
  try {
    const qrCode = await prisma.qRCode.update({
      where: { code: req.params.code },
      data: { scanCount: { increment: 1 } },
    });
    if (!qrCode) return res.status(404).json({ error: "QR code not found" });
    
    // Create tracking event
    await prisma.trackingEvent.create({
      data: {
        eventType: "PAGE_VIEW",
        source: "QR_CODE",
        sessionId: req.headers["x-session-id"] as string || "unknown",
        campaignId: qrCode.campaignId || undefined,
        qrCodeId: qrCode.id,
        page: req.headers.referer || undefined,
        userAgent: req.headers["user-agent"] || undefined,
        ipAddress: req.ip || undefined,
      },
    });
    
    res.json({ data: qrCode });
  } catch (err) {
    res.status(500).json({ error: "Failed to track QR code" });
  }
});

export default router;
