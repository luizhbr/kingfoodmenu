"use strict";

import { Router, Request, Response } from "express";
import crypto from "crypto";
import prisma from '../lib/db.js';
import type { OrderStatus } from '@prisma/client';
import express from 'express';

const router = Router();

// Webhook secret for signature verification
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

/**
 * Verify HMAC-SHA256 signature on incoming webhooks
 * Expected header: x-webhook-signature
 * Computed from: HMAC-SHA256(rawBody, secret)
 */
function verifySignature(req: Request): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn("[webhook] WEBHOOK_SECRET not set — skipping signature verification");
    return true; // Skip if no secret configured (dev mode)
  }

  const signature = req.headers["x-webhook-signature"] as string;
  if (!signature) return false;

  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/n8n — Receive events from N8N or external services
 * 
 * Events:
 * - ORDER_CREATED
 * - ORDER_CONFIRMED  
 * - ORDER_READY
 * - ORDER_DELIVERED
 * - CUSTOMER_INACTIVE
 * - CAMPAIGN_CREATED
 * - WHATSAPP_MESSAGE_RECEIVED
 * 
 * Body: { event: string, data: any, source?: string, attribution?: { ... } }
 */
router.post("/n8n", express.json(), async (req: Request, res: Response) => {
  // Verify signature
  if (!verifySignature(req)) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  const { event, data, source, attribution } = req.body;

  if (!event) {
    return res.status(400).json({ error: "Missing 'event' field" });
  }

  try {
    // Process the webhook event
    switch (event) {
      case "ORDER_CREATED":
      case "ORDER_CONFIRMED":
      case "ORDER_READY":
      case "ORDER_DELIVERED": {
        // Update order status if orderId provided
        if (data?.orderId) {
          const statusMap: Record<string, string> = {
            ORDER_CREATED: "PENDING",
            ORDER_CONFIRMED: "CONFIRMED",
            ORDER_READY: "READY",
            ORDER_DELIVERED: "DELIVERED",
          };
          const status = statusMap[event];
          if (status) {
            await prisma.order.update({
              where: { id: data.orderId },
              data: { status: status as OrderStatus },
            }).catch(() => {
              console.warn("[webhook] Order not found:", data.orderId);
            });
          }
        }
        break;
      }

      case "CUSTOMER_INACTIVE": {
        // Could trigger re-engagement campaign
        console.info("[webhook] Customer inactive:", data?.customerId);
        break;
      }

      case "CAMPAIGN_CREATED": {
        // Campaign was created externally
        console.info("[webhook] Campaign created:", data?.campaignId);
        break;
      }

      case "WHATSAPP_MESSAGE_RECEIVED": {
        // WhatsApp message received — preserve attribution
        if (data?.customerPhone && attribution) {
          // Track the WhatsApp touch as a tracking event
          await prisma.trackingEvent.create({
            data: {
              eventType: "WHATSAPP_CLICKED",
              sessionId: `whatsapp_${data.customerPhone}_${Date.now()}`,
              source: attribution.source || "WHATSAPP",
              medium: attribution.medium || "whatsapp",
              campaign: attribution.campaign || null,
              content: attribution.content || null,
              term: attribution.term || null,
              customerId: data.customerId || null,
              metadata: {
                phone: data.customerPhone,
                message: data.messagePreview || null,
                originalSource: attribution.source,
              },
            },
          }).catch((err: any) => {
            console.warn("[webhook] Failed to track WhatsApp event:", err.message);
          });
        }
        break;
      }

      default:
        console.warn("[webhook] Unknown event:", event);
    }

    // If attribution data is provided, update customer attribution
    if (attribution?.customerId && attribution.source && attribution.source !== "UNKNOWN") {
      const existing = await prisma.attribution.findUnique({
        where: { customerId: attribution.customerId },
      }).catch(() => null);

      if (!existing) {
        await prisma.attribution.create({
          data: {
            customerId: attribution.customerId,
            firstSource: attribution.source,
            firstMedium: attribution.medium || null,
            firstCampaign: attribution.campaign || null,
            firstContent: attribution.content || null,
            firstTerm: attribution.term || null,
            firstTouchAt: new Date(),
            lastSource: attribution.source,
            lastMedium: attribution.medium || null,
            lastCampaign: attribution.campaign || null,
            lastContent: attribution.content || null,
            lastTerm: attribution.term || null,
            lastTouchAt: new Date(),
          },
        }).catch(() => {});
      } else {
        // Only update last touch — never overwrite first touch
        await prisma.attribution.update({
          where: { customerId: attribution.customerId },
          data: {
            lastSource: attribution.source,
            lastMedium: attribution.medium || null,
            lastCampaign: attribution.campaign || null,
            lastContent: attribution.content || null,
            lastTerm: attribution.term || null,
            lastTouchAt: new Date(),
          },
        }).catch(() => {});
      }
    }

    res.json({ received: true, event });
  } catch (err) {
    console.error("[webhook] Error processing event:", err);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

/**
 * GET /api/webhooks/n8n/health — Health check
 */
router.get("/n8n/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
