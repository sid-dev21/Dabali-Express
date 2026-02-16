import { Router } from 'express';
import {
  getTodayMenu,
  getAllMenus,
  getWeeklyMenus,
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

// Get today's menu
router.get('/today', getTodayMenu);

// Get all menus
router.get('/', getAllMenus);

// Get week menu
router.get('/week/:schoolId', getWeeklyMenus);

// Get menu by ID
router.get('/:id', getMenuById);

// Create menu (CANTEEN_MANAGER only - auto-approved)
router.post('/', requireRole(UserRole.CANTEEN_MANAGER), createMenu);

// Update menu (SUPER_ADMIN, SCHOOL_ADMIN, CANTEEN_MANAGER)
router.put('/:id', requireRole(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.CANTEEN_MANAGER), updateMenu);

// Delete menu (SUPER_ADMIN, SCHOOL_ADMIN, CANTEEN_MANAGER)
router.delete('/:id', requireRole(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.CANTEEN_MANAGER), deleteMenu);

export default router;
