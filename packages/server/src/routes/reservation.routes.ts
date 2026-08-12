import { Router } from 'express';
import { authenticate, requireStaff } from '../middleware/auth.js';
import { requireOwnership } from '../middleware/idor.js';
import {
  createReservation,
  listReservations,
  getReservation,
  updateReservation,
  deleteReservation,
  listCustomerReservations,
  checkAvailability,
  getReservationAnalytics,
} from '../controllers/reservation.controller.js';

const router = Router();

// Public: check availability
router.get('/availability', checkAvailability);

// Customer: own reservations
router.get('/my-reservations', authenticate, listCustomerReservations);

// Staff: analytics (must be before /:id)
router.get('/analytics', authenticate, requireStaff, getReservationAnalytics);

// Customer: create reservation
router.post('/', authenticate, createReservation);

// Staff: manage reservations
router.get('/', authenticate, requireStaff, listReservations);

// Single reservation — customers can only see their own, staff can see all
router.get('/:id', authenticate, requireOwnership('reservation'), getReservation);

// Only staff can update/delete reservations
router.patch('/:id', authenticate, requireStaff, updateReservation);
router.delete('/:id', authenticate, requireStaff, deleteReservation);

export default router;
