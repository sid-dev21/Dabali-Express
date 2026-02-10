/**
 * NOTIFICATION CONTROLLER
 * 
 * Manages notifications for users, especially parents for meal notifications.
 */

import { Request, Response } from 'express';
import pool from '../config/database';
import { ApiResponse, NotificationType } from '../types';

/**
 * GET ALL NOTIFICATIONS - Retrieve notifications for a user
 * GET /api/notifications
 */
export const getAllNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const user_id = req.user?.id;
    const unread_only = req.query.unread_only === 'true';

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated.',
      } as ApiResponse);
      return;
    }

    let query = `
      SELECT n.*, s.first_name as student_first_name, s.last_name as student_last_name,
             m.description as menu_description, m.meal_type
      FROM notifications n
      LEFT JOIN students s ON n.related_student_id = s.id
      LEFT JOIN menus m ON n.related_menu_id = m.id
      WHERE n.user_id = $1
    `;

    const params: any[] = [user_id];

    if (unread_only) {
      query += ` AND n.read = false`;
    }

    query += ' ORDER BY n.created_at DESC';

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: result.rows,
    } as ApiResponse);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving notifications.',
    } as ApiResponse);
  }
};

/**
 * MARK NOTIFICATION AS READ - Mark a notification as read
 * PUT /api/notifications/:id/read
 */
export const markNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated.',
      } as ApiResponse);
      return;
    }

    const result = await pool.query(
      `UPDATE notifications 
       SET read = true 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, user_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Notification not found or access denied.',
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: result.rows[0],
    } as ApiResponse);
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read.',
    } as ApiResponse);
  }
};

/**
 * MARK ALL NOTIFICATIONS AS READ - Mark all notifications for a user as read
 * PUT /api/notifications/read-all
 */
export const markAllNotificationsAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated.',
      } as ApiResponse);
      return;
    }

    const result = await pool.query(
      `UPDATE notifications 
       SET read = true 
       WHERE user_id = $1 AND read = false
       RETURNING *`,
      [user_id]
    );

    res.status(200).json({
      success: true,
      message: `${result.rows.length} notifications marked as read.`,
      data: result.rows,
    } as ApiResponse);
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read.',
    } as ApiResponse);
  }
};

/**
 * CREATE NOTIFICATION - Create a new notification (internal function)
 */
export const createNotification = async (
  user_id: number,
  title: string,
  message: string,
  type: NotificationType,
  related_student_id?: number,
  related_menu_id?: number
): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, related_student_id, related_menu_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user_id, title, message, type, related_student_id, related_menu_id]
    );
  } catch (error) {
    console.error('Create notification error:', error);
  }
};

/**
 * GET UNREAD COUNT - Get count of unread notifications for a user
 * GET /api/notifications/unread-count
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated.',
      } as ApiResponse);
      return;
    }

    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
      [user_id]
    );

    res.status(200).json({
      success: true,
      data: { count: parseInt(result.rows[0].count) },
    } as ApiResponse);
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving unread count.',
    } as ApiResponse);
  }
};
