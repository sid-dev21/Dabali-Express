import { Router } from 'express';
import {
  getAllSchools,
  getSchoolById,
  createSchool,
  updateSchool,
  deleteSchool,
} from '../controllers/schoolController';
import { authMiddleware } from '../middlewares/auth';
import { requireRole } from '../middlewares/roleCheck';
import { UserRole } from '../types';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all schools (accessible to all authenticated users)
router.get('/', getAllSchools);

// Get school by ID
router.get('/:id', getSchoolById);

// Create school (only SUPER_ADMIN)
router.post('/', requireRole(UserRole.SUPER_ADMIN), createSchool);

// Update school (SUPER_ADMIN or SCHOOL_ADMIN for their own school)
router.put('/:id', updateSchool);

// Delete school (only SUPER_ADMIN)
router.delete('/:id', requireRole(UserRole.SUPER_ADMIN), deleteSchool);

export default router;
