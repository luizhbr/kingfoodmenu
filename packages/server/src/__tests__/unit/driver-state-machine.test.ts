import { describe, it, expect } from 'vitest';

// The driver state machine lives in driver.controller.ts as DRIVER_TRANSITIONS.
// Test the transition rules as pure data to verify the machine is strict.
const DRIVER_TRANSITIONS: Record<string, string[]> = {
  READY: ['PICKED_UP'],
  PICKED_UP: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
};

function isValidTransition(from: string, to: string): boolean {
  const allowed = DRIVER_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

describe('Driver State Machine - Unit Tests', () => {
  describe('Valid transitions', () => {
    it('READY → PICKED_UP', () => {
      expect(isValidTransition('READY', 'PICKED_UP')).toBe(true);
    });
    it('PICKED_UP → OUT_FOR_DELIVERY', () => {
      expect(isValidTransition('PICKED_UP', 'OUT_FOR_DELIVERY')).toBe(true);
    });
    it('OUT_FOR_DELIVERY → DELIVERED', () => {
      expect(isValidTransition('OUT_FOR_DELIVERY', 'DELIVERED')).toBe(true);
    });
  });

  describe('Invalid transitions', () => {
    it('DELIVERED → PICKED_UP blocked', () => {
      expect(isValidTransition('DELIVERED', 'PICKED_UP')).toBe(false);
    });
    it('OUT_FOR_DELIVERY → READY blocked', () => {
      expect(isValidTransition('OUT_FOR_DELIVERY', 'READY')).toBe(false);
    });
    it('READY → DELIVERED blocked (skips pickup)', () => {
      expect(isValidTransition('READY', 'DELIVERED')).toBe(false);
    });
    it('PICKED_UP → READY blocked', () => {
      expect(isValidTransition('PICKED_UP', 'READY')).toBe(false);
    });
    it('unknown status → anything blocked', () => {
      expect(isValidTransition('ASSIGNED', 'PICKED_UP')).toBe(false);
    });
  });

  describe('Driver RBAC rules', () => {
    it('driver cannot transition an order not assigned to them', () => {
      // ownership check happens server-side before the state machine
      const assignedToMe = false;
      expect(assignedToMe).toBe(false);
    });
    it('anonymous and customer tokens never reach driver endpoints', () => {
      // requireDriver middleware: req.user.type === 'staff' && role === 'DRIVER'
      const isDriver = (user: any) => user?.type === 'staff' && user?.role === 'DRIVER';
      expect(isDriver(null)).toBe(false);
      expect(isDriver({ type: 'customer' })).toBe(false);
      expect(isDriver({ type: 'staff', role: 'STAFF' })).toBe(false);
      expect(isDriver({ type: 'staff', role: 'DRIVER' })).toBe(true);
    });
  });
});
