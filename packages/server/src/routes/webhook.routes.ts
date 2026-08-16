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

// Simple in-memory nonce store for replay protection
// In production, this should be Redis or similar shared store
const nonceStore = new Set();
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const WEBSOCKET_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function pruneNonceStore() {
  const now = Date.now();
  // Note: This is a simple implementation - in production use Redis with TTL
  // For now, we'll just rely on the timestamp check in verifySignatureWithReplayProtection
}

/**
 * Verify HMAC-SHA256 signature with replay protection
 * Expected header: x-webhook-signature
 * Also checks: x-webhook-timestamp (optional) and x-webhook-nonce (required for replay protection)
 */
function verifySignatureWithReplayProtection(req: Request): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn("[webhook] WEBHOOK_SECRET not set — skipping signature verification");
    return true; // Skip if no secret configured (dev mode)
  }

  const signature = req.headers["x-webhook-signature"] as string;
  const timestampStr = req.headers["x-webhook-timestamp"] as string;
  const nonce = req.headers["x-webhook-nonce"] as string;

  if (!signature) return false;
  if (!nonce) {
    console.warn("[webhook] Missing x-webhook-nonce header");
    return false;
  }

  // Check timestamp if provided (reject if older than 5 minutes)
  if (timestampStr) {
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) {
      console.warn("[webhook] Invalid x-webhook-timestamp");
      return false;
    }
    const now = Date.now();
    if (Math.abs(now - timestamp) > WEBSOCKET_TIMEOUT_MS) {
      console.warn("[webhook] Webhook timestamp too old");
      return false;
    }
  }

  // Check for replay
  if (nonceStore.has(nonce)) {
    console.warn("[webhook] Replay attack detected - nonce already used");
    return false;
  }

  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");

  try {
    const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (valid) {
      // Add nonce to store (in production, set expiry)
      nonceStore.add(nonce);
      // Simple cleanup - remove if we have too many entries
      if (nonceStore.size > 10000) {
        // Clear half when getting too large (simple approach)
        const arr = Array.from(nonceStore);
        nonceStore.clear();
        for (let i = Math.floor(arr.length / 2); i < arr.length; i++) {
          nonceStore.add(arr[i]);
        }
      }
    }
    return valid;
  } catch {
    return false;
  }
}

router.post("/n8n", express.json(), async (req: Request, res: Response) => {
  // Verify signature
  if (!verifySignatureWithReplayProtection(req)) {
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
