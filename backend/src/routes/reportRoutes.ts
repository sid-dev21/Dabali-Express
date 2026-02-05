import { Router } from 'express';
import {
  getDashboardStats,
} from '../controllers/reportController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get dashboard statistics
router.get('/dashboard', getDashboardStats);

export default router;
