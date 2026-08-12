"use strict";

import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

// GET /api/qrcodes — List QR codes (MANAGER+)
router.get("/", authenticate, authorize("MANAGER"), async (req, res) => {
  try {
    const qrCodes = await req.prisma.qRCode.findMany({
      include: { campaign: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: qrCodes });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch QR codes" });
  }
});

// POST /api/qrcodes — Create QR code (MANAGER+)
router.post("/", authenticate, authorize("MANAGER"), async (req, res) => {
  try {
    const qrCode = await req.prisma.qRCode.create({ data: req.body });
    res.status(201).json({ data: qrCode });
  } catch (err) {
    res.status(500).json({ error: "Failed to create QR code" });
  }
});

// GET /api/qrcodes/:code — Track QR scan (public, increments scan count)
router.get("/:code", async (req, res) => {
  try {
    const qrCode = await req.prisma.qRCode.update({
      where: { code: req.params.code },
      data: { scanCount: { increment: 1 } },
    });
    if (!qrCode) return res.status(404).json({ error: "QR code not found" });
    
    // Create tracking event
    await req.prisma.trackingEvent.create({
      data: {
        eventType: "PAGE_VIEW",
        source: "QR_CODE",
        sessionId: req.headers["x-session-id"] as string || "unknown",
        campaign: qrCode.campaignId || undefined,
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
