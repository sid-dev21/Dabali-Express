"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
class NotificationService {
    static async createNotification(data) {
        const notification = new Notification_1.default(data);
        return await notification.save();
    }
    static async getUnreadCount(userId) {
        return await Notification_1.default.countDocuments({
            user_id: userId,
            read: false
        });
    }
}
exports.NotificationService = NotificationService;
