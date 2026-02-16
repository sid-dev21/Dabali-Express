"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const notificationController_1 = require("../controllers/notificationController");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes
router.use(auth_1.authMiddleware);
/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for the authenticated user
 * @access  Private
 */
router.get('/', notificationController_1.getAllNotifications);
/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications for the authenticated user
 * @access  Private
 */
router.get('/unread-count', notificationController_1.getUnreadCount);
/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private
 */
router.put('/:id/read', notificationController_1.markAsRead);
/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read for the authenticated user
 * @access  Private
 */
router.put('/read-all', notificationController_1.markAllAsRead);
/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification for the authenticated user
 * @access  Private
 */
router.delete('/:id', notificationController_1.deleteNotification);
exports.default = router;
