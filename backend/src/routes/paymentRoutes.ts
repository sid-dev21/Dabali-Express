import { Router } from 'express';
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  simulatePaymentConfirmation,
  verifyPayment,
  getPaymentsBySubscription,
} from '../controllers/paymentController';
import { authMiddleware } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleCheck';
import { UserRole } from '../types';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all payments (SCHOOL_ADMIN, PARENT)
router.get('/', requireRole(UserRole.SCHOOL_ADMIN, UserRole.PARENT), getAllPayments);

// Get payments by subscription (SCHOOL_ADMIN, PARENT)
router.get('/subscription/:subscriptionId', requireRole(UserRole.SCHOOL_ADMIN, UserRole.PARENT), getPaymentsBySubscription);

// Get payment by ID (SCHOOL_ADMIN, PARENT)
router.get('/:id', requireRole(UserRole.SCHOOL_ADMIN, UserRole.PARENT), getPaymentById);

// Verify payment (SCHOOL_ADMIN, PARENT)
router.get('/:id/verify', requireRole(UserRole.SCHOOL_ADMIN, UserRole.PARENT), verifyPayment);

// Create payment (PARENT only)
router.post('/', requireRole(UserRole.PARENT), createPayment);

// Simulate payment confirmation (for development - SCHOOL_ADMIN)
router.post('/:id/simulate-confirmation', requireRole(UserRole.SCHOOL_ADMIN), simulatePaymentConfirmation);

export default router;
