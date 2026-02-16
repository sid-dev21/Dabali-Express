import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Notification from '../models/Notification';
import { ApiResponse } from '../types';

const mapNotificationResponse = (notification: any) => {
  const obj = notification?.toObject ? notification.toObject() : notification;
  return {
    ...obj,
    id: obj?._id?.toString?.() || obj?.id || '',
    _id: obj?._id?.toString?.() || obj?._id || obj?.id || '',
    created_at: obj?.created_at || obj?.createdAt || null,
    createdAt: obj?.createdAt || obj?.created_at || null,
    read: !!obj?.read,
  };
};

// Allows to get all notifications for a user
export const getAllNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const user_id = req.user?.id;
    const rawLimit = parseInt(req.query.limit as string, 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const unreadOnly = String(req.query.unread_only || '').toLowerCase() === 'true';

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated.'
      } as ApiResponse);
      return;
    }

    const query: Record<string, any> = { user_id };
    if (unreadOnly) query.read = false;

    const notifications = await Notification.find(query)
      .populate('related_student_id', 'first_name last_name')
      .populate('related_menu_id', 'date meal_type description')
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .skip(offset);

    res.json({
      success: true,
      data: notifications.map(mapNotificationResponse)
    } as ApiResponse);
  } catch (error) {
    console.error('Get all notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving notifications.'
    } as ApiResponse);
  }
};

// Allows to get count of unread notifications for a user
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const user_id = req.user?.id;

    const count = await Notification.countDocuments({ 
      user_id, 
      read: false 
    });

    res.json({
      success: true,
      data: { count }
    } as ApiResponse);
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving unread count.'
    } as ApiResponse);
  }
};

// Allows to mark a notification as read
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Notification id is invalid.'
      } as ApiResponse);
      return;
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user_id },
      { read: true, updated_at: new Date() },
      { new: true }
    ).populate('related_student_id', 'first_name last_name')
     .populate('related_menu_id', 'date meal_type description');

    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'Notification not found.'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      message: 'Notification marked as read.',
      data: mapNotificationResponse(notification)
    } as ApiResponse);
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read.'
    } as ApiResponse);
  }
};

// Allows to mark all notifications as read
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const user_id = req.user?.id;

    const result = await Notification.updateMany(
      { user_id, read: false },
      { read: true, updated_at: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read.',
      data: { 
        modified_count: result.modifiedCount 
      }
    } as ApiResponse);
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read.'
    } as ApiResponse);
  }
};

// Allows to delete a notification
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Notification id is invalid.'
      } as ApiResponse);
      return;
    }

    const notification = await Notification.findOneAndDelete({ _id: id, user_id });

    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'Notification not found.'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully.',
      data: mapNotificationResponse(notification)
    } as ApiResponse);
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification.'
    } as ApiResponse);
  }
};
