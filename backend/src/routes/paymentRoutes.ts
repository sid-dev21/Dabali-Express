import { Router } from 'express';
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  simulatePaymentConfirmation,
  verifyPayment,
  getPaymentsBySubscription,
  validatePayment,
} from '../controllers/paymentController';
import { authMiddleware } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleCheck';
import { UserRole } from '../types';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all payments (SCHOOL_ADMIN, SUPER_ADMIN, PARENT)
router.get('/', requireRole(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN, UserRole.PARENT), getAllPayments);

// Get payments by subscription (SCHOOL_ADMIN, SUPER_ADMIN, PARENT)
router.get('/subscription/:subscriptionId', requireRole(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN, UserRole.PARENT), getPaymentsBySubscription);

// Get payment by ID (SCHOOL_ADMIN, SUPER_ADMIN, PARENT)
router.get('/:id', requireRole(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN, UserRole.PARENT), getPaymentById);

// Verify payment (SCHOOL_ADMIN, PARENT) - PUT for verification with code
router.put('/:id/verify', requireRole(UserRole.SCHOOL_ADMIN, UserRole.PARENT), verifyPayment);

// Validate payment (SCHOOL_ADMIN, SUPER_ADMIN) - Admin validation for waiting payments
router.put('/:id/validate', requireRole(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN), validatePayment);

// Create payment (PARENT only)
router.post('/', requireRole(UserRole.PARENT), createPayment);

// Simulate payment confirmation (for development - SCHOOL_ADMIN)
router.post('/:id/simulate-confirmation', requireRole(UserRole.SCHOOL_ADMIN), simulatePaymentConfirmation);

export default router;
