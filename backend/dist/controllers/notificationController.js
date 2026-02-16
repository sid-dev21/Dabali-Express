"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getUnreadCount = exports.getAllNotifications = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
// Allows to get all notifications for a user
const getAllNotifications = async (req, res) => {
    try {
        const user_id = req.user?.id;
        const rawLimit = parseInt(req.query.limit, 10);
        const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;
        const offset = parseInt(req.query.offset) || 0;
        const unreadOnly = String(req.query.unread_only || '').toLowerCase() === 'true';
        if (!user_id) {
            res.status(401).json({
                success: false,
                message: 'Not authenticated.'
            });
            return;
        }
        const query = { user_id };
        if (unreadOnly)
            query.read = false;
        const notifications = await Notification_1.default.find(query)
            .populate('related_student_id', 'first_name last_name')
            .populate('related_menu_id', 'date meal_type description')
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit)
            .skip(offset);
        res.json({
            success: true,
            data: notifications
        });
    }
    catch (error) {
        console.error('Get all notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving notifications.'
        });
    }
};
exports.getAllNotifications = getAllNotifications;
// Allows to get count of unread notifications for a user
const getUnreadCount = async (req, res) => {
    try {
        const user_id = req.user?.id;
        const count = await Notification_1.default.countDocuments({
            user_id,
            read: false
        });
        res.json({
            success: true,
            data: { count }
        });
    }
    catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving unread count.'
        });
    }
};
exports.getUnreadCount = getUnreadCount;
// Allows to mark a notification as read
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user?.id;
        const notification = await Notification_1.default.findOneAndUpdate({ _id: id, user_id }, { read: true, updated_at: new Date() }, { new: true }).populate('related_student_id', 'first_name last_name')
            .populate('related_menu_id', 'date meal_type description');
        if (!notification) {
            res.status(404).json({
                success: false,
                message: 'Notification not found.'
            });
            return;
        }
        res.json({
            success: true,
            message: 'Notification marked as read.',
            data: notification
        });
    }
    catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking notification as read.'
        });
    }
};
exports.markAsRead = markAsRead;
// Allows to mark all notifications as read
const markAllAsRead = async (req, res) => {
    try {
        const user_id = req.user?.id;
        const result = await Notification_1.default.updateMany({ user_id, read: false }, { read: true, updated_at: new Date() });
        res.json({
            success: true,
            message: 'All notifications marked as read.',
            data: {
                modified_count: result.modifiedCount
            }
        });
    }
    catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking all notifications as read.'
        });
    }
};
exports.markAllAsRead = markAllAsRead;
// Allows to delete a notification
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user?.id;
        const notification = await Notification_1.default.findOneAndDelete({ _id: id, user_id });
        if (!notification) {
            res.status(404).json({
                success: false,
                message: 'Notification not found.'
            });
            return;
        }
        res.json({
            success: true,
            message: 'Notification deleted successfully.',
            data: notification
        });
    }
    catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting notification.'
        });
    }
};
exports.deleteNotification = deleteNotification;
