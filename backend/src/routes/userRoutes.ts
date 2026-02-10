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

// Get all users (SUPER_ADMIN only)
router.get('/', superAdminOnly, userController.getAllUsers);

// Get user by ID (SUPER_ADMIN only)
router.get('/:id', superAdminOnly, userController.getUserById);

// Update user (SUPER_ADMIN only)
router.put('/:id', superAdminOnly, userController.updateUser);

// Delete user (SUPER_ADMIN only)
router.delete('/:id', superAdminOnly, userController.deleteUser);

export default router;
