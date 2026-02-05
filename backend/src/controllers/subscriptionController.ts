/**
 * SUBSCRIPTION CONTROLLER
 * 
 * Manages student subscriptions.
 */

import { Request, Response } from 'express';
import pool from '../config/database';
import { ApiResponse, CreateSubscriptionDTO, SubscriptionStatus } from '../types';
import { calculateEndDate } from '../utils/helpers';
import { isValidDate } from '../utils/validators';

/**
 * GET ALL SUBSCRIPTIONS - Retrieve subscriptions (with filters)
 * GET /api/subscriptions
 */
export const getAllSubscriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const student_id = req.query.student_id as string;
    const status = req.query.status as SubscriptionStatus;

    let query = `
      SELECT sub.*, 
             s.first_name as student_first_name,
             s.last_name as student_last_name,
             sc.name as school_name
      FROM subscriptions sub
      JOIN students s ON sub.student_id = s.id
      JOIN schools sc ON s.school_id = sc.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (student_id) {
      query += ` AND sub.student_id = $${paramCount}`;
      params.push(student_id);
      paramCount++;
    }

    if (status) {
      query += ` AND sub.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ' ORDER BY sub.created_at DESC';

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: result.rows,
    } as ApiResponse);
  } catch (error) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving subscriptions.',
    } as ApiResponse);
  }
};

/**
 * GET SUBSCRIPTION BY ID - Retrieve a subscription by ID
 * GET /api/subscriptions/:id
 */
export const getSubscriptionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT sub.*, 
              s.first_name as student_first_name,
              s.last_name as student_last_name,
              sc.name as school_name,
              u.first_name as parent_first_name,
              u.last_name as parent_last_name,
              (SELECT json_agg(json_build_object(
                'id', p.id,
                'amount', p.amount,
                'method', p.method,
                'status', p.status,
                'paid_at', p.paid_at
              )) FROM payments p WHERE p.subscription_id = sub.id) as payments
       FROM subscriptions sub
       JOIN students s ON sub.student_id = s.id
       JOIN schools sc ON s.school_id = sc.id
       JOIN users u ON s.parent_id = u.id
       WHERE sub.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found.',
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    } as ApiResponse);
  } catch (error) {
    console.error('Get subscription by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving subscription.',
    } as ApiResponse);
  }
};

/**
 * GET SUBSCRIPTIONS BY STUDENT - Retrieve subscriptions for a student
 * GET /api/subscriptions/student/:studentId
 */
export const getSubscriptionsByStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;

    const result = await pool.query(
      `SELECT sub.*,
              (SELECT json_agg(json_build_object(
                'id', p.id,
                'amount', p.amount,
                'method', p.method,
                'status', p.status,
                'reference', p.reference,
                'paid_at', p.paid_at
              )) FROM payments p WHERE p.subscription_id = sub.id) as payments
       FROM subscriptions sub
       WHERE sub.student_id = $1
       ORDER BY sub.created_at DESC`,
      [studentId]
    );

    res.status(200).json({
      success: true,
      data: result.rows,
    } as ApiResponse);
  } catch (error) {
    console.error('Get subscriptions by student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving subscriptions.',
    } as ApiResponse);
  }
};

/**
 * CREATE SUBSCRIPTION - Create a new subscription
 * POST /api/subscriptions
 */
export const createSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { student_id, type, start_date, amount }: CreateSubscriptionDTO = req.body;

    // Validation
    if (!student_id || !type || !start_date || !amount) {
      res.status(400).json({
        success: false,
        message: 'All fields are required.',
      } as ApiResponse);
      return;
    }

    if (!isValidDate(start_date)) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD.',
      } as ApiResponse);
      return;
    }

    if (amount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Amount must be positive.',
      } as ApiResponse);
      return;
    }

    // Check if student exists
    const studentCheck = await pool.query(
      'SELECT * FROM students WHERE id = $1',
      [student_id]
    );

    if (studentCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Student not found.',
      } as ApiResponse);
      return;
    }

    // Calculate end date
    const startDateObj = new Date(start_date);
    const endDateObj = calculateEndDate(startDateObj, type);
    const end_date = endDateObj.toISOString().split('T')[0];

    const result = await pool.query(
      `INSERT INTO subscriptions (student_id, start_date, end_date, type, amount, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [student_id, start_date, end_date, type, amount, 'ACTIVE']
    );

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully.',
      data: result.rows[0],
    } as ApiResponse);
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating subscription.',
    } as ApiResponse);
  }
};

/**
 * UPDATE SUBSCRIPTION STATUS - Update subscription status
 * PUT /api/subscriptions/:id/status
 */
export const updateSubscriptionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validation
    if (!status || !['ACTIVE', 'EXPIRED', 'SUSPENDED'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid status. Use ACTIVE, EXPIRED or SUSPENDED.',
      } as ApiResponse);
      return;
    }

    const result = await pool.query(
      `UPDATE subscriptions 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found.',
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Subscription status updated.',
      data: result.rows[0],
    } as ApiResponse);
  } catch (error) {
    console.error('Update subscription status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating status.',
    } as ApiResponse);
  }
};

/**
 * DELETE SUBSCRIPTION - Delete (cancel) a subscription
 * DELETE /api/subscriptions/:id
 */
export const deleteSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM subscriptions WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found.',
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Subscription deleted successfully.',
    } as ApiResponse);
  } catch (error) {
    console.error('Delete subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting subscription.',
    } as ApiResponse);
  }
};