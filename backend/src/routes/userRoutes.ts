import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleCheck';
import { UserRole } from '../types';

// Import controllers directly from dist (CommonJS)
const userController = require('../controllers/userController');

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// All routes require SUPER_ADMIN role
const superAdminOnly = requireRole(UserRole.SUPER_ADMIN);

// All routes require SCHOOL_ADMIN role
const schoolAdminOnly = requireRole(UserRole.SCHOOL_ADMIN);

// Get all users (SUPER_ADMIN only)
router.get('/', superAdminOnly, userController.getAllUsers);
router.post('/', superAdminOnly, userController.createUser);

// Get user by ID (SUPER_ADMIN only)
router.get('/:id', superAdminOnly, userController.getUserById);

// Update user (SUPER_ADMIN only)
router.put('/:id', superAdminOnly, userController.updateUser);

// Delete user (SUPER_ADMIN only)
router.delete('/:id', superAdminOnly, userController.deleteUser);
router.delete('/:id/delete', superAdminOnly, userController.deleteUser);

// === CANTEEN MANAGER MANAGEMENT ROUTES ===

// Create canteen manager (SCHOOL_ADMIN only)
router.post('/canteen-managers', schoolAdminOnly, userController.createCanteenManager);

// Get canteen managers by school (SCHOOL_ADMIN only)
router.get('/canteen-managers/school/:school_id', schoolAdminOnly, userController.getCanteenManagersBySchool);

// Force password reset for canteen manager (SCHOOL_ADMIN only)
router.post('/canteen-managers/:id/reset-password', schoolAdminOnly, userController.forcePasswordReset);

// Delete canteen manager (SCHOOL_ADMIN only)
router.delete('/canteen-managers/:id', schoolAdminOnly, userController.deleteCanteenManager);

export default router;
