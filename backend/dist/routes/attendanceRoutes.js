"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendanceController_1 = require("../controllers/attendanceController");
const auth_1 = require("../middlewares/auth");
const roleCheck_1 = require("../middlewares/roleCheck");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authMiddleware);
// Get attendance records (SCHOOL_ADMIN, CANTEEN_MANAGER)
router.get('/', (0, roleCheck_1.requireRole)(types_1.UserRole.SCHOOL_ADMIN, types_1.UserRole.CANTEEN_MANAGER), attendanceController_1.getAttendance);
// Mark attendance (CANTEEN_MANAGER only)
router.post('/mark', (0, roleCheck_1.requireRole)(types_1.UserRole.CANTEEN_MANAGER), attendanceController_1.markAttendance);
exports.default = router;
