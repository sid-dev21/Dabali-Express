"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Public routes
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
// Protected routes
router.get('/me', auth_1.authMiddleware, authController_1.getCurrentUser);
// Temporary password change route (for canteen managers)
router.post('/change-temporary-password', auth_1.authMiddleware, authController_1.changeTemporaryPassword);
exports.default = router;
