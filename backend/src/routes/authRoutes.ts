import { Router } from 'express';
import { register, login, getCurrentUser, changeTemporaryPassword } from '../controllers/authController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', authMiddleware, getCurrentUser);

// Temporary password change route (for canteen managers)
router.post('/change-temporary-password', authMiddleware, changeTemporaryPassword);

export default router;
