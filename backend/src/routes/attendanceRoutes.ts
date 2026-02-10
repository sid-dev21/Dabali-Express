import { Router } from 'express';
import {
  getAttendance,
  markAttendance,
} from '../controllers/attendanceController';
import { authMiddleware } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleCheck';
import { UserRole } from '../types';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get attendance records (SCHOOL_ADMIN, CANTEEN_MANAGER)
router.get('/', requireRole(UserRole.SCHOOL_ADMIN, UserRole.CANTEEN_MANAGER), getAttendance);

// Mark attendance (CANTEEN_MANAGER only)
router.post('/mark', requireRole(UserRole.CANTEEN_MANAGER), markAttendance);

export default router;
