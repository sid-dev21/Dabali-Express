import { Request, Response } from 'express';
import Notification from '../models/Notification';
import { ApiResponse } from '../types';

// Allows to get all notifications for a user
export const getAllNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const user_id = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const notifications = await Notification.find({ user_id })
      .populate('related_student_id', 'first_name last_name')
      .populate('related_menu_id', 'date meal_type description')
      .sort({ created_at: -1 })
      .limit(limit)
      .skip(offset);

    res.json({
      success: true,
      data: notifications
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
      data: notification
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
      data: notification
    } as ApiResponse);
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification.'
    } as ApiResponse);
  }
};
