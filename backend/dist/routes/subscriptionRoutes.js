"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subscriptionController_1 = require("../controllers/subscriptionController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authMiddleware);
// Get all subscriptions
router.get('/', subscriptionController_1.getAllSubscriptions);
// Get subscriptions by student
router.get('/student/:studentId', subscriptionController_1.getSubscriptionsByStudent);
// Get subscription by ID
router.get('/:id', subscriptionController_1.getSubscriptionById);
// Create subscription
router.post('/', subscriptionController_1.createSubscription);
// Update subscription status
router.put('/:id/status', subscriptionController_1.updateSubscriptionStatus);
// Delete subscription
router.delete('/:id', subscriptionController_1.deleteSubscription);
exports.default = router;
