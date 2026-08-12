"use strict";

import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

// GET /api/referrals — List referrals (MANAGER+)
router.get("/", authenticate, authorize("MANAGER"), async (req, res) => {
  try {
    const referrals = await req.prisma.referral.findMany({
      include: { referrer: true, campaign: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: referrals });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch referrals" });
  }
});

// POST /api/referrals — Create referral code
router.post("/", authenticate, authorize("MANAGER"), async (req, res) => {
  try {
    const referral = await req.prisma.referral.create({ data: req.body });
    res.status(201).json({ data: referral });
  } catch (err) {
    res.status(500).json({ error: "Failed to create referral" });
  }
});

// GET /api/referrals/:code — Track referral click (public)
router.get("/:code", async (req, res) => {
  try {
    const referral = await req.prisma.referral.update({
      where: { code: req.params.code },
      data: { clickCount: { increment: 1 } },
    });
    if (!referral) return res.status(404).json({ error: "Referral not found" });
    res.json({ data: referral });
  } catch (err) {
    res.status(500).json({ error: "Failed to track referral" });
  }
});

export default router;
