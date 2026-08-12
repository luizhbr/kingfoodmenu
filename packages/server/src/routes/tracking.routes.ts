"use strict";

import { Router } from "express";
import prisma from '../lib/db.js';

const router = Router();

// POST /api/tracking/events — Track an event (public, no auth required)
router.post("/events", async (req, res) => {
  try {
    const {
      eventType,
      sessionId,
      source,
      medium,
      campaign,
      content,
      term,
      page,
      referrer,
      landingPage,
      customerId,
      orderId,
      productId,
      couponCode,
      metadata,
    } = req.body;

    // Resolve attribution source
    const attributionSource = source || "UNKNOWN";

    const event = await prisma.trackingEvent.create({
      data: {
        eventType,
        sessionId: sessionId || "unknown",
        source: attributionSource,
        medium: medium || null,
        campaign: campaign || null,
        content: content || null,
        term: term || null,
        page: page || null,
        referrer: referrer || null,
        landingPage: landingPage || null,
        customerId: customerId || null,
        orderId: orderId || null,
        productId: productId || null,
        couponCode: couponCode || null,
        userAgent: req.headers["user-agent"] || null,
        ipAddress: req.ip || null,
        metadata: metadata || null,
      },
    });

    // Update customer attribution (first/last touch)
    if (customerId && attributionSource !== "UNKNOWN") {
      const existing = await prisma.attribution.findUnique({
        where: { customerId },
      });

      if (!existing) {
        // First touch — create
        await prisma.attribution.create({
          data: {
            customerId,
            firstSource: attributionSource,
            firstMedium: medium || null,
            firstCampaign: campaign || null,
            firstContent: content || null,
            firstTerm: term || null,
            firstLandingPage: landingPage || null,
            firstReferrer: referrer || null,
            firstTouchAt: new Date(),
            lastSource: attributionSource,
            lastMedium: medium || null,
            lastCampaign: campaign || null,
            lastContent: content || null,
            lastTerm: term || null,
            lastLandingPage: landingPage || null,
            lastReferrer: referrer || null,
            lastTouchAt: new Date(),
            totalSessions: 1,
            totalEvents: 1,
          },
        });
      } else {
        // Update last touch (never overwrite first touch)
        await prisma.attribution.update({
          where: { customerId },
          data: {
            lastSource: attributionSource,
            lastMedium: medium || null,
            lastCampaign: campaign || null,
            lastContent: content || null,
            lastTerm: term || null,
            lastLandingPage: landingPage || null,
            lastReferrer: referrer || null,
            lastTouchAt: new Date(),
            totalSessions: { increment: 1 },
            totalEvents: { increment: 1 },
          },
        });
      }
    }

    res.status(201).json({ data: event });
  } catch (err) {
    console.error("[tracking] Error creating event:", err);
    res.status(500).json({ error: "Failed to track event" });
  }
});

export default router;
