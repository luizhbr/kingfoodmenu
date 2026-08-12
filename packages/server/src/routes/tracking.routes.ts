"use strict";

import { Router } from "express";
import prisma from '../lib/db.js';
import type { TrackingEventType, AttributionSource } from '@prisma/client';

const router = Router();

// ── Enum normalization ──────────────────────────────────────────────────────
// Prisma enums are UPPERCASE. The frontend sends raw UTM values (lowercase),
// so normalize before persisting to avoid 500 "Invalid value for argument".

const TRACKING_EVENT_TYPES = new Set([
  "SESSION_STARTED", "PAGE_VIEW", "PRODUCT_VIEW", "PRODUCT_ADDED",
  "CART_CREATED", "CHECKOUT_STARTED", "CHECKOUT_COMPLETED", "ORDER_CREATED",
  "ORDER_CONFIRMED", "ORDER_DELIVERED", "COUPON_USED", "WHATSAPP_CLICKED",
]);

const SOURCE_ALIASES: Record<string, string> = {
  google: "GOOGLE",
  googleads: "GOOGLE_ADS",
  google_ads: "GOOGLE_ADS",
  instagram: "INSTAGRAM",
  facebook: "FACEBOOK",
  meta: "META_ADS",
  metaads: "META_ADS",
  meta_ads: "META_ADS",
  tiktok: "TIKTOK",
  tiktokads: "TIKTOK_ADS",
  tiktok_ads: "TIKTOK_ADS",
  whatsapp: "WHATSAPP",
  qr: "QR_CODE",
  qrcode: "QR_CODE",
  email: "EMAIL",
  referral: "REFERRAL",
  influencer: "INFLUENCER",
  organic: "ORGANIC",
  custom: "CUSTOM",
  direct: "DIRECT",
};

function normalizeEventType(value: unknown): TrackingEventType {
  if (typeof value !== "string") return "PAGE_VIEW";
  const upper = value.trim().toUpperCase();
  return (TRACKING_EVENT_TYPES.has(upper) ? upper : "PAGE_VIEW") as TrackingEventType;
}

function normalizeSource(value: unknown): AttributionSource {
  if (typeof value !== "string" || !value.trim()) return "UNKNOWN";
  const raw = value.trim().toLowerCase();
  return (SOURCE_ALIASES[raw] || raw.toUpperCase()) as AttributionSource;
}

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

    // Resolve attribution source (normalized to Prisma enum)
    const attributionSource = normalizeSource(source);
    const normalizedEventType = normalizeEventType(eventType);

    // Validate customerId — tracking must never 500 on a stale/invalid FK.
    // If the customer doesn't exist, persist the event as anonymous.
    let resolvedCustomerId: string | null = null;
    if (customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true },
      });
      if (customer) resolvedCustomerId = customerId;
    }

    const event = await prisma.trackingEvent.create({
      data: {
        eventType: normalizedEventType,
        sessionId: sessionId || "unknown",
        source: attributionSource,
        medium: medium || null,
        campaignSlug: campaign || null,
        content: content || null,
        term: term || null,
        page: page || null,
        referrer: referrer || null,
        landingPage: landingPage || null,
        customerId: resolvedCustomerId,
        orderId: orderId || null,
        productId: productId || null,
        couponCode: couponCode || null,
        userAgent: req.headers["user-agent"] || null,
        ipAddress: req.ip || null,
        metadata: metadata || null,
      },
    });

    // Update customer attribution (first/last touch)
    if (resolvedCustomerId && attributionSource !== "UNKNOWN") {
      const existing = await prisma.attribution.findUnique({
        where: { customerId: resolvedCustomerId },
      });

      if (!existing) {
        // First touch — create
        await prisma.attribution.create({
          data: {
            customerId: resolvedCustomerId,
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
          where: { customerId: resolvedCustomerId },
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
