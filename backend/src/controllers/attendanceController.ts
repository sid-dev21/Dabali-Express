import { Request, Response } from 'express';
import pool from '../config/database';
import { ApiResponse, MarkAttendanceDTO, NotificationType } from '../types';

/**
 * ATTENDANCE CONTROLLER
 *
 * Manages student attendance at the cafeteria, including justified absences.
 */

/**
 * GET ATTENDANCE
 * GET /api/attendance
 */
export const getAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const student_id = req.query.student_id as string | undefined;
    const date = req.query.date as string | undefined;
    const school_id = req.query.school_id as string | undefined;

    let query = `
      SELECT a.*, s.first_name, s.last_name, s.school_id, m.date as menu_date
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN menus m ON a.menu_id = m.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (student_id) {
      query += ` AND a.student_id = $${paramCount}`;
      params.push(student_id);
      paramCount++;
    }

    if (date) {
      query += ` AND a.date = $${paramCount}`;
      params.push(date);
      paramCount++;
    }

    if (school_id) {
      query += ` AND s.school_id = $${paramCount}`;
      params.push(school_id);
      paramCount++;
    }

    query += ' ORDER BY a.date DESC';

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: result.rows,
    } as ApiResponse);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving attendance.',
    } as ApiResponse);
  }
};

/**
 * MARK ATTENDANCE
 * POST /api/attendance/mark
 */
export const markAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { student_id, menu_id, date, present, justified, reason }: MarkAttendanceDTO =
      req.body;

    if (!student_id || !menu_id || !date || typeof present !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'Student, menu, date and present fields are required.',
      } as ApiResponse);
      return;
    }

    // Business rules for justified absences
    let finalJustified = justified ?? false;
    let finalReason = reason ?? null;

    if (present) {
      // If the student is present, no justification or reason is needed
      finalJustified = false;
      finalReason = null;
    } else if (!present && finalJustified && !finalReason) {
      // Justified absence => reason is required
      res.status(400).json({
        success: false,
        message: 'Reason is required for justified absences.',
      } as ApiResponse);
      return;
    }

    // Check if a record already exists for this (student, menu, date) combination
    const existing = await pool.query(
      `SELECT * FROM attendance
       WHERE student_id = $1 AND menu_id = $2 AND date = $3`,
      [student_id, menu_id, date]
    );

    let result;

    if (existing.rows.length > 0) {
      // UPDATE existing record
      result = await pool.query(
        `UPDATE attendance
         SET present = $1,
             justified = $2,
             reason = $3,
             marked_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [present, finalJustified, finalReason, existing.rows[0].id]
      );
    } else {
      // INSERT new record
      result = await pool.query(
        `INSERT INTO attendance (student_id, menu_id, date, present, justified, reason, marked_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         RETURNING *`,
        [student_id, menu_id, date, present, finalJustified, finalReason]
      );
    }

    // Get student and menu information for notification
    const studentInfo = await pool.query(
      'SELECT s.*, u.email as parent_email, u.first_name as parent_first_name, u.last_name as parent_last_name FROM students s JOIN users u ON s.parent_id = u.id WHERE s.id = $1',
      [student_id]
    );

    const menuInfo = await pool.query(
      'SELECT * FROM menus WHERE id = $1',
      [menu_id]
    );

    if (studentInfo.rows.length > 0 && menuInfo.rows.length > 0) {
      const student = studentInfo.rows[0];
      const menu = menuInfo.rows[0];
      
      // Create notification for parent
      const notificationTitle = present ? 'Repas Pris' : 'Repas Manqué';
      const notificationMessage = present 
        ? `${student.first_name} ${student.last_name} a pris son repas (${menu.meal_type}) aujourd'hui. Menu: ${menu.description || 'Non spécifié'}`
        : `${student.first_name} ${student.last_name} n'a pas pris son repas (${menu.meal_type}) aujourd'hui.${finalJustified && finalReason ? ` Motif: ${finalReason}` : ''}`;

      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, related_student_id, related_menu_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          student.parent_id,
          notificationTitle,
          notificationMessage,
          present ? NotificationType.MEAL_TAKEN : NotificationType.MEAL_MISSED,
          student_id,
          menu_id
        ]
      );
    }

    res.status(200).json({
      success: true,
      message: 'Attendance saved successfully.',
      data: result.rows[0],
    } as ApiResponse);
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving attendance.',
    } as ApiResponse);
  }
};

