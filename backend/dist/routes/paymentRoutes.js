"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentController_1 = require("../controllers/paymentController");
const auth_1 = require("../middlewares/auth");
const roleCheck_1 = require("../middlewares/roleCheck");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authMiddleware);
// Get all payments (SCHOOL_ADMIN, PARENT)
router.get('/', (0, roleCheck_1.requireRole)(types_1.UserRole.SCHOOL_ADMIN, types_1.UserRole.PARENT), paymentController_1.getAllPayments);
// Get payments by subscription (SCHOOL_ADMIN, PARENT)
router.get('/subscription/:subscriptionId', (0, roleCheck_1.requireRole)(types_1.UserRole.SCHOOL_ADMIN, types_1.UserRole.PARENT), paymentController_1.getPaymentsBySubscription);
// Get payment by ID (SCHOOL_ADMIN, PARENT)
router.get('/:id', (0, roleCheck_1.requireRole)(types_1.UserRole.SCHOOL_ADMIN, types_1.UserRole.PARENT), paymentController_1.getPaymentById);
// Verify payment (SCHOOL_ADMIN, PARENT)
router.get('/:id/verify', (0, roleCheck_1.requireRole)(types_1.UserRole.SCHOOL_ADMIN, types_1.UserRole.PARENT), paymentController_1.verifyPayment);
// Create payment (PARENT only)
router.post('/', (0, roleCheck_1.requireRole)(types_1.UserRole.PARENT), paymentController_1.createPayment);
// Simulate payment confirmation (for development - SCHOOL_ADMIN)
router.post('/:id/simulate-confirmation', (0, roleCheck_1.requireRole)(types_1.UserRole.SCHOOL_ADMIN), paymentController_1.simulatePaymentConfirmation);
exports.default = router;
