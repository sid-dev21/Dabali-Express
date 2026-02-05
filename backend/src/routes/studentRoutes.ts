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

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all students
router.get('/', getAllStudents);

// Get students by parent
router.get('/parent/:parentId', getStudentsByParent);

// Get student by ID
router.get('/:id', getStudentById);

// Create student
router.post('/', createStudent);

// Update student
router.put('/:id', updateStudent);

// Delete student
router.delete('/:id', deleteStudent);

export default router;
