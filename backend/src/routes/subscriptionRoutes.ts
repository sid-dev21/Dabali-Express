import { Router } from 'express';
import {
  getAllSubscriptions,
  getSubscriptionById,
  getSubscriptionsByStudent,
  createSubscription,
  updateSubscriptionStatus,
  deleteSubscription,
} from '../controllers/subscriptionController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all subscriptions
router.get('/', getAllSubscriptions);

// Get subscriptions by student
router.get('/student/:studentId', getSubscriptionsByStudent);

// Get subscription by ID
router.get('/:id', getSubscriptionById);

// Create subscription
router.post('/', createSubscription);

// Update subscription status
router.put('/:id/status', updateSubscriptionStatus);

// Delete subscription
router.delete('/:id', deleteSubscription);

export default router;
