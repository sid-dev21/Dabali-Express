"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const studentController_1 = require("../controllers/studentController");
const auth_1 = require("../middlewares/auth");
const roleCheck_1 = require("../middlewares/roleCheck");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authMiddleware);
// Get all students (SCHOOL_ADMIN, CANTEEN_MANAGER)
router.get('/', (0, roleCheck_1.requireRole)(types_1.UserRole.SCHOOL_ADMIN, types_1.UserRole.CANTEEN_MANAGER), studentController_1.getAllStudents);
// Get students by parent (PARENT only - for their own children)
router.get('/parent/:parentId', (0, roleCheck_1.requireRole)(types_1.UserRole.PARENT), studentController_1.getStudentsByParent);
// Bulk import students (SCHOOL_ADMIN only)
router.post('/import', (0, roleCheck_1.requireRole)(types_1.UserRole.SCHOOL_ADMIN), studentController_1.importStudents);
// Claim a student (PARENT only)
router.post('/claim', (0, roleCheck_1.requireRole)(types_1.UserRole.PARENT), studentController_1.claimStudent);
// Get student by ID (SCHOOL_ADMIN, CANTEEN_MANAGER, PARENT)
router.get('/:id', (0, roleCheck_1.requireRole)(types_1.UserRole.SCHOOL_ADMIN, types_1.UserRole.CANTEEN_MANAGER, types_1.UserRole.PARENT), studentController_1.getStudentById);
// Create student (SCHOOL_ADMIN, PARENT)
router.post('/', (0, roleCheck_1.requireRole)(types_1.UserRole.SCHOOL_ADMIN, types_1.UserRole.PARENT), studentController_1.createStudent);
// Update student (SCHOOL_ADMIN only)
router.put('/:id', (0, roleCheck_1.requireRole)(types_1.UserRole.SCHOOL_ADMIN), studentController_1.updateStudent);
// Delete student (SCHOOL_ADMIN only)
router.delete('/:id', (0, roleCheck_1.requireRole)(types_1.UserRole.SCHOOL_ADMIN), studentController_1.deleteStudent);
exports.default = router;
