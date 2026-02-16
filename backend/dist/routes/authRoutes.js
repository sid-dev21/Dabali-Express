"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middlewares/auth");
const roleCheck_1 = require("../middlewares/roleCheck");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// Public routes
router.post('/login', authController_1.login);
router.post('/register', authController_1.register);
// Protected routes
router.use(auth_1.authMiddleware);
router.get('/me', authController_1.getCurrentUser);
router.post('/update-credentials', authController_1.updateCredentials);
router.post('/change-temporary-password', authController_1.changeTemporaryPassword);
router.post('/logout', authController_1.logout);
router.post('/refresh-token', authController_1.refreshToken);
// SUPER_ADMIN only routes
router.post('/register-school-admin', (0, roleCheck_1.requireRole)(types_1.UserRole.SUPER_ADMIN), authController_1.registerSchoolAdmin);
exports.default = router;
