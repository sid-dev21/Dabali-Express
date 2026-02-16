import { Router } from 'express';
import {
  login,
  register,
  registerSchoolAdmin,
  getCurrentUser,
  updateCredentials,
  changeTemporaryPassword,
  logout,
  refreshToken,
} from '../controllers/authController';
import { authMiddleware } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleCheck';
import { UserRole } from '../types';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/register', register);

// Protected routes
router.use(authMiddleware);
router.get('/me', getCurrentUser);
router.post('/update-credentials', updateCredentials);
router.post('/change-temporary-password', changeTemporaryPassword);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);

// SUPER_ADMIN only routes
router.post('/register-school-admin', requireRole(UserRole.SUPER_ADMIN), registerSchoolAdmin);

export default router;
