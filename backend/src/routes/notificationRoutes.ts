import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import {
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
} from '../controllers/notificationController';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for the authenticated user
 * @access  Private
 */
router.get('/', getAllNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications for the authenticated user
 * @access  Private
 */
router.get('/unread-count', getUnreadCount);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private
 */
router.put('/:id/read', markAsRead);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read for the authenticated user
 * @access  Private
 */
router.put('/read-all', markAllAsRead);

export default router;
