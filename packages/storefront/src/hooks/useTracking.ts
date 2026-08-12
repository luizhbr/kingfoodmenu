import { useCallback, useEffect, useRef } from 'react';
import { withCsrf } from '../lib/csrf.js';

const SESSION_KEY = 'kf_session_id';
const ATTRIBUTION_KEY = 'kf_attribution';
const EVENTS_KEY = 'kf_events';

interface AttributionData {
  firstSource: string;
  firstMedium: string | null;
  firstCampaign: string | null;
  firstContent: string | null;
  firstTerm: string | null;
  firstLandingPage: string | null;
  firstReferrer: string | null;
  firstTouchAt: string;
  lastSource: string;
  lastMedium: string | null;
  lastCampaign: string | null;
  lastContent: string | null;
  lastTerm: string | null;
  lastLandingPage: string | null;
  lastReferrer: string | null;
  lastTouchAt: string;
}

type TrackingEventType =
  | 'SESSION_STARTED'
  | 'PAGE_VIEW'
  | 'PRODUCT_VIEW'
  | 'PRODUCT_ADDED'
  | 'CART_CREATED'
  | 'CHECKOUT_STARTED'
  | 'CHECKOUT_COMPLETED'
  | 'ORDER_CREATED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_DELIVERED'
  | 'COUPON_USED'
  | 'WHATSAPP_CLICKED';

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getAttribution(): AttributionData | null {
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveAttribution(data: AttributionData): void {
  localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(data));
}

function captureUTM(): { source: string; medium: string | null; campaign: string | null; content: string | null; term: string | null } {
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get('utm_source') || params.get('source') || 'DIRECT',
    medium: params.get('utm_medium') || null,
    campaign: params.get('utm_campaign') || null,
    content: params.get('utm_content') || null,
    term: params.get('utm_term') || null,
  };
}

function initAttribution(): AttributionData {
  const utm = captureUTM();
  const existing = getAttribution();
  const now = new Date().toISOString();
  const landingPage = window.location.pathname + window.location.search;
  const referrer = document.referrer || null;

  if (!existing) {
    // First touch — create new attribution
    const data: AttributionData = {
      firstSource: utm.source,
      firstMedium: utm.medium,
      firstCampaign: utm.campaign,
      firstContent: utm.content,
      firstTerm: utm.term,
      firstLandingPage: landingPage,
      firstReferrer: referrer,
      firstTouchAt: now,
      lastSource: utm.source,
      lastMedium: utm.medium,
      lastCampaign: utm.campaign,
      lastContent: utm.content,
      lastTerm: utm.term,
      lastLandingPage: landingPage,
      lastReferrer: referrer,
      lastTouchAt: now,
    };
    saveAttribution(data);
    return data;
  }

  // Update last touch (never overwrite first touch)
  if (utm.source !== 'DIRECT') {
    existing.lastSource = utm.source;
    existing.lastMedium = utm.medium;
    existing.lastCampaign = utm.campaign;
    existing.lastContent = utm.content;
    existing.lastTerm = utm.term;
    existing.lastLandingPage = landingPage;
    existing.lastReferrer = referrer;
    existing.lastTouchAt = now;
    saveAttribution(existing);
  }

  return existing;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export function useTracking() {
  const attributionRef = useRef<AttributionData | null>(null);
  const sessionIdRef = useRef<string>(getSessionId());

  // Initialize attribution on mount
  useEffect(() => {
    attributionRef.current = initAttribution();
    // Track session start
    trackEvent('SESSION_STARTED');
  }, []);

  const trackEvent = useCallback(async (eventType: TrackingEventType, metadata?: Record<string, unknown>) => {
    const attr = attributionRef.current || getAttribution();
    const sessionId = sessionIdRef.current;

    const payload = {
      eventType,
      sessionId,
      source: attr?.lastSource || 'DIRECT',
      medium: attr?.lastMedium,
      campaign: attr?.lastCampaign,
      content: attr?.lastContent,
      term: attr?.lastTerm,
      page: window.location.pathname,
      referrer: document.referrer || undefined,
      landingPage: attr?.firstLandingPage,
      customerId: metadata?.customerId as string | undefined,
      orderId: metadata?.orderId as string | undefined,
      productId: metadata?.productId as string | undefined,
      couponCode: metadata?.couponCode as string | undefined,
      metadata,
    };

    try {
      const url = `${API_BASE}/api/tracking/events`;
      withCsrf({ 'Content-Type': 'application/json' }).then((headers) => {
        fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        }).catch(() => {
          // Silent fail — tracking should never block the user
        });
      });
    } catch {
      // Silent fail
    }
  }, []);

  const getAttributionData = useCallback((): AttributionData | null => {
    return attributionRef.current || getAttribution();
  }, []);

  return { trackEvent, getAttributionData, sessionId: sessionIdRef.current };
}

export { initAttribution, captureUTM, getAttribution, saveAttribution, getSessionId };
export type { AttributionData, TrackingEventType };
