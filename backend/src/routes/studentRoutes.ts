import { Router } from 'express';
import {
  getAllStudents,
  getStudentById,
  getStudentsByParent,
  createStudent,
  updateStudent,
  deleteStudent,
  importStudents,
  claimStudent,
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

// Bulk import students (SCHOOL_ADMIN only)
router.post('/import', requireRole(UserRole.SCHOOL_ADMIN), importStudents);

// Claim a student (PARENT only)
router.post('/claim', requireRole(UserRole.PARENT), claimStudent);

// Get student by ID (SCHOOL_ADMIN, CANTEEN_MANAGER, PARENT)
router.get('/:id', requireRole(UserRole.SCHOOL_ADMIN, UserRole.CANTEEN_MANAGER, UserRole.PARENT), getStudentById);

// Create student (SCHOOL_ADMIN, PARENT)
router.post('/', requireRole(UserRole.SCHOOL_ADMIN, UserRole.PARENT), createStudent);

// Update student (SCHOOL_ADMIN only)
router.put('/:id', requireRole(UserRole.SCHOOL_ADMIN), updateStudent);

// Delete student (SCHOOL_ADMIN only)
router.delete('/:id', requireRole(UserRole.SCHOOL_ADMIN), deleteStudent);

export default router;
