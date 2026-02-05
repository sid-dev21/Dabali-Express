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

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all payments
router.get('/', getAllPayments);

// Get payments by subscription
router.get('/subscription/:subscriptionId', getPaymentsBySubscription);

// Get payment by ID
router.get('/:id', getPaymentById);

// Verify payment
router.get('/:id/verify', verifyPayment);

// Create payment
router.post('/', createPayment);

// Simulate payment confirmation (for development)
router.post('/:id/simulate-confirmation', simulatePaymentConfirmation);

export default router;
