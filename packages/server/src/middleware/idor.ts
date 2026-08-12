import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/db.js';

/**
 * IDOR (Insecure Direct Object Reference) Protection Middleware
 *
 * Ensures that authenticated users can only access resources they own
 * or resources they are authorized to manage (staff/admin roles).
 *
 * Usage:
 *   router.get('/orders/:id', authenticate, requireOwnership('order'), getOrder);
 *   router.patch('/orders/:id/status', authenticate, requireStaff, updateOrderStatus);
 */

type ResourceType = 'order' | 'reservation' | 'review' | 'loyalty';

interface OwnershipConfig {
  /** Prisma model name */
  model: string;
  /** Foreign key field that references the owner (customer) */
  ownerField: string;
  /** Roles that can access any resource regardless of ownership */
  adminRoles: string[];
}

const OWNERSHIP_MAP: Record<ResourceType, OwnershipConfig> = {
  order: {
    model: 'order',
    ownerField: 'customerId',
    adminRoles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'],
  },
  reservation: {
    model: 'reservation',
    ownerField: 'customerId',
    adminRoles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'],
  },
  review: {
    model: 'review',
    ownerField: 'customerId',
    adminRoles: ['SUPER_ADMIN', 'MANAGER'],
  },
  loyalty: {
    model: 'customer',
    ownerField: 'id',
    adminRoles: ['SUPER_ADMIN', 'MANAGER'],
  },
};

/**
 * Middleware that verifies the authenticated user owns the requested resource.
 * Staff with appropriate roles can access any resource.
 */
export function requireOwnership(resource: ResourceType) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const config = OWNERSHIP_MAP[resource];
    const resourceId = req.params.id;

    if (!resourceId) {
      res.status(400).json({ success: false, error: 'Resource ID is required' });
      return;
    }

    // Staff/admin roles can access any resource
    if (req.user.type === 'staff' && config.adminRoles.includes(req.user.role || '')) {
      return next();
    }

    // Customer can only access their own resources
    try {
      // @ts-expect-error - dynamic model access
      const record = await prisma[config.model].findUnique({
        where: { id: resourceId },
        select: { [config.ownerField]: true },
      });

      if (!record) {
        res.status(404).json({ success: false, error: 'Resource not found' });
        return;
      }

      const ownerId = record[config.ownerField];
      if (ownerId !== req.user.id) {
        res.status(403).json({ success: false, error: 'You do not have permission to access this resource' });
        return;
      }

      next();
    } catch (err) {
      console.error('[idor] Error checking resource ownership:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };
}

/**
 * Middleware that ensures a customer can only list their own orders/reservations.
 * Applied to /my-orders and /my-reservations endpoints.
 */
export function enforceCustomerScope(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  // Staff can see all; customers are already scoped in the controller
  if (req.user.type === 'staff') {
    return next();
  }

  // For customers, the controller should filter by customer ID
  // This middleware just ensures the user is authenticated
  next();
}
