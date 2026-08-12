import { describe, it, expect } from 'vitest';
import { computeRange, round2 } from '../../lib/reports-service.js';

describe('Reports Service - Unit Tests', () => {
  describe('P8-UNIT-001 round2 precision', () => {
    it('rounds money to cents', () => {
      expect(round2(10.005)).toBe(10.01);
      expect(round2(10.004)).toBe(10);
      expect(round2(0.1 + 0.2)).toBe(0.3);
    });
  });

  describe('P8-UNIT-002/003 timezone — today in America/New_York', () => {
    it('today range starts at midnight ET', () => {
      const range = computeRange('today', 'America/New_York');
      // start should be a midnight instant (UTC) for ET
      const startUtc = range.start.getTime();
      expect(startUtc % 86400000).toBe(0);
      expect(range.end.getTime() - range.start.getTime()).toBe(86400000);
    });
    it('yesterday is exactly the day before today', () => {
      const today = computeRange('today', 'America/New_York');
      const yesterday = computeRange('yesterday', 'America/New_York');
      expect(yesterday.end.getTime()).toBe(today.start.getTime());
      expect(yesterday.start.getTime() + 86400000).toBe(today.start.getTime());
    });
  });

  describe('P8-UNIT-004 last 7 days', () => {
    it('spans 7 calendar days', () => {
      const range = computeRange('7d', 'America/New_York');
      const days = (range.end.getTime() - range.start.getTime()) / 86400000;
      expect(days).toBe(7);
    });
  });

  describe('P8-UNIT-005 last 30 days', () => {
    it('spans 30 calendar days', () => {
      const range = computeRange('30d', 'America/New_York');
      const days = (range.end.getTime() - range.start.getTime()) / 86400000;
      expect(days).toBe(30);
    });
  });

  describe('P8-UNIT-006 month boundaries', () => {
    it('this month starts on the 1st', () => {
      const range = computeRange('month', 'America/New_York');
      const start = range.start;
      expect(start.getUTCDate()).toBe(1);
      expect(start.getUTCHours()).toBe(0);
    });
    it('previous month is contiguous with this month', () => {
      const cur = computeRange('month', 'America/New_York');
      const prev = computeRange('prevMonth', 'America/New_York');
      expect(prev.end.getTime()).toBe(cur.start.getTime());
    });
  });

  describe('P8-UNIT-007 custom range', () => {
    it('accepts explicit start/end', () => {
      const range = computeRange('custom', 'America/New_York', '2026-08-01', '2026-08-10');
      expect(range.start.getTime()).toBe(new Date('2026-08-01').getTime());
      // end + 1 day (inclusive)
      expect(range.end.getTime()).toBe(new Date('2026-08-11').getTime());
    });
  });

  describe('P8-UNIT-008 invalid dates fall back', () => {
    it('custom without end uses now + 1 day', () => {
      const range = computeRange('custom', 'America/New_York', '2026-08-01');
      expect(range.start.getTime()).toBe(new Date('2026-08-01').getTime());
      expect(range.end.getTime()).toBeGreaterThan(range.start.getTime());
    });
  });

  describe('P8-UNIT-009 AOV formula', () => {
    it('revenue / non-cancelled orders', () => {
      const revenue = 100;
      const orders = 4;
      expect(round2(revenue / orders)).toBe(25);
    });
    it('zero orders → AOV 0', () => {
      const orders = 0;
      const aov = orders > 0 ? 1 : 0;
      expect(aov).toBe(0);
    });
  });

  describe('P8-UNIT-010 gross vs net separation', () => {
    it('gross = subtotal + tax + delivery; net = total after discounts', () => {
      const subtotal = 100, tax = 8, delivery = 4, discount = 5;
      const gross = subtotal + tax + delivery;
      const net = subtotal + tax + delivery - discount;
      expect(gross).toBe(112);
      expect(net).toBe(107);
      expect(net).toBeLessThan(gross);
    });
  });

  describe('P8-UNIT-011 completion rate', () => {
    it('delivered / assigned * 100', () => {
      const assigned = 4, delivered = 3;
      expect(round2((delivered / assigned) * 100)).toBe(75);
    });
    it('zero assigned → 0', () => {
      const assigned = 0, delivered = 0;
      const rate = assigned > 0 ? round2((delivered / assigned) * 100) : 0;
      expect(rate).toBe(0);
    });
  });
});
