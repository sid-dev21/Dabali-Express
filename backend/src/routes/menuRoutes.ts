import { Router } from 'express';
import {
  getAllMenus,
  getWeekMenu,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu,
} from '../controllers/menuController';
import { authMiddleware } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleCheck';
import { UserRole } from '../types';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all menus
router.get('/', getAllMenus);

// Get week menu
router.get('/week/:schoolId', getWeekMenu);

// Get menu by ID
router.get('/:id', getMenuById);

// Create menu (SCHOOL_ADMIN or CANTEEN_MANAGER)
router.post('/', requireRole(UserRole.SCHOOL_ADMIN, UserRole.CANTEEN_MANAGER), createMenu);

// Update menu (SCHOOL_ADMIN or CANTEEN_MANAGER)
router.put('/:id', requireRole(UserRole.SCHOOL_ADMIN, UserRole.CANTEEN_MANAGER), updateMenu);

// Delete menu (SCHOOL_ADMIN or CANTEEN_MANAGER)
router.delete('/:id', requireRole(UserRole.SCHOOL_ADMIN, UserRole.CANTEEN_MANAGER), deleteMenu);

export default router;
