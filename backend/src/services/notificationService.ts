
import Notification from '../models/Notification';

export class NotificationService {
  static async createNotification(data: {
    user_id: string;
    title: string;
    message: string;
    type: string;
    related_student_id?: string;
    related_menu_id?: string;
  }) {
    const notification = new Notification(data);
    return await notification.save();
  }
  
  static async getUnreadCount(userId: string): Promise<number> {
    return await Notification.countDocuments({ 
      user_id: userId, 
      read: false 
    });
  }
}