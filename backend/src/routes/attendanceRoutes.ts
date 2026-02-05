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

// Get attendance records
router.get('/', getAttendance);

// Mark attendance (SCHOOL_ADMIN or CANTEEN_MANAGER)
router.post('/mark', requireRole(UserRole.SCHOOL_ADMIN, UserRole.CANTEEN_MANAGER), markAttendance);

export default router;
