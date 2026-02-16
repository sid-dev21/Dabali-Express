"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const schoolController_1 = require("../controllers/schoolController");
const auth_1 = require("../middlewares/auth");
const roleCheck_1 = require("../middlewares/roleCheck");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// Public route (no auth)
router.get('/public', schoolController_1.getPublicSchools);
// All routes require authentication
router.use(auth_1.authMiddleware);
// Get all schools (SUPER_ADMIN, SCHOOL_ADMIN)
router.get('/', (0, roleCheck_1.requireRole)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.SCHOOL_ADMIN), schoolController_1.getAllSchools);
// Get school by ID (SUPER_ADMIN, SCHOOL_ADMIN)
router.get('/:id', (0, roleCheck_1.requireRole)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.SCHOOL_ADMIN), schoolController_1.getSchoolById);
// Create school (only SUPER_ADMIN)
router.post('/', (0, roleCheck_1.requireRole)(types_1.UserRole.SUPER_ADMIN), schoolController_1.createSchool);
// Update school (SUPER_ADMIN or SCHOOL_ADMIN for their own school)
router.put('/:id', schoolController_1.updateSchool);
// Delete school (only SUPER_ADMIN)
router.delete('/:id', (0, roleCheck_1.requireRole)(types_1.UserRole.SUPER_ADMIN), schoolController_1.deleteSchool);
exports.default = router;
