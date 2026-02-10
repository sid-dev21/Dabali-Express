import { Router } from 'express';
import {
  getAllStudents,
  getStudentById,
  getStudentsByParent,
  createStudent,
  updateStudent,
  deleteStudent,
} from '../controllers/studentController';
import { authMiddleware } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleCheck';
import { UserRole } from '../types';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all students (SCHOOL_ADMIN, CANTEEN_MANAGER)
router.get('/', requireRole(UserRole.SCHOOL_ADMIN, UserRole.CANTEEN_MANAGER), getAllStudents);

// Get students by parent (PARENT only - for their own children)
router.get('/parent/:parentId', requireRole(UserRole.PARENT), getStudentsByParent);

// Get student by ID (SCHOOL_ADMIN, CANTEEN_MANAGER, PARENT)
router.get('/:id', requireRole(UserRole.SCHOOL_ADMIN, UserRole.CANTEEN_MANAGER, UserRole.PARENT), getStudentById);

// Create student (SCHOOL_ADMIN only)
router.post('/', requireRole(UserRole.SCHOOL_ADMIN), createStudent);

// Update student (SCHOOL_ADMIN only)
router.put('/:id', requireRole(UserRole.SCHOOL_ADMIN), updateStudent);

// Delete student (SCHOOL_ADMIN only)
router.delete('/:id', requireRole(UserRole.SCHOOL_ADMIN), deleteStudent);

export default router;
