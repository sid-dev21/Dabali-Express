/**
 * STUDENT CONTROLLER
 * 
 * Manages CRUD operations for students.
 */

import { Request, Response } from 'express';
import pool from '../config/database';
import { ApiResponse, CreateStudentDTO, UserRole } from '../types';

/**
 * GET ALL STUDENTS - Retrieve all students (with filters)
 * GET /api/students
 */
export const getAllStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const school_id = req.query.school_id as string;
    const parent_id = req.query.parent_id as string;
    const class_name = req.query.class_name as string;

    // Build query dynamically
    let query = `
      SELECT s.*, 
             sc.name as school_name,
             u.first_name as parent_first_name,
             u.last_name as parent_last_name,
             u.phone as parent_phone
      FROM students s
      JOIN schools sc ON s.school_id = sc.id
      JOIN users u ON s.parent_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (school_id) {
      query += ` AND s.school_id = $${paramCount}`;
      params.push(school_id);
      paramCount++;
    }

    if (parent_id) {
      query += ` AND s.parent_id = $${paramCount}`;
      params.push(parent_id);
      paramCount++;
    }

    if (class_name) {
      query += ` AND s.class_name = $${paramCount}`;
      params.push(class_name);
      paramCount++;
    }

    query += ' ORDER BY s.created_at DESC';

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: result.rows,
    } as ApiResponse);
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving students.',
    } as ApiResponse);
  }
};

/**
 * GET STUDENT BY ID - Retrieve a student by ID
 * GET /api/students/:id
 */
export const getStudentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT s.*, 
              sc.name as school_name, sc.city as school_city,
              u.first_name as parent_first_name,
              u.last_name as parent_last_name,
              u.email as parent_email,
              u.phone as parent_phone,
              (SELECT json_agg(json_build_object(
                'id', sub.id,
                'type', sub.type,
                'status', sub.status,
                'start_date', sub.start_date,
                'end_date', sub.end_date,
                'amount', sub.amount
              )) FROM subscriptions sub WHERE sub.student_id = s.id AND sub.status = 'ACTIVE') as active_subscriptions
       FROM students s
       JOIN schools sc ON s.school_id = sc.id
       JOIN users u ON s.parent_id = u.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Student not found.',
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    } as ApiResponse);
  } catch (error) {
    console.error('Get student by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving student.',
    } as ApiResponse);
  }
};

/**
 * GET STUDENTS BY PARENT - Retrieve all children of a parent
 * GET /api/students/parent/:parentId
 */
export const getStudentsByParent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { parentId } = req.params;

    const result = await pool.query(
      `SELECT s.*, 
              sc.name as school_name,
              (SELECT json_build_object(
                'id', sub.id,
                'type', sub.type,
                'status', sub.status,
                'end_date', sub.end_date
              ) FROM subscriptions sub 
              WHERE sub.student_id = s.id 
              AND sub.status = 'ACTIVE' 
              ORDER BY sub.created_at DESC 
              LIMIT 1) as active_subscription
       FROM students s
       JOIN schools sc ON s.school_id = sc.id
       WHERE s.parent_id = $1
       ORDER BY s.created_at DESC`,
      [parentId]
    );

    res.status(200).json({
      success: true,
      data: result.rows,
    } as ApiResponse);
  } catch (error) {
    console.error('Get students by parent error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving children.',
    } as ApiResponse);
  }
};

/**
 * CREATE STUDENT - Create a new student
 * POST /api/students
 */
export const createStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      first_name,
      last_name,
      class_name,
      school_id,
      parent_id,
      photo_url,
      allergies,
    }: CreateStudentDTO = req.body;

    // Basic validation
    if (!first_name || !last_name || !school_id || !parent_id) {
      res.status(400).json({
        success: false,
        message: 'First name, last name, school and parent fields are required.',
      } as ApiResponse);
      return;
    }

    // Check if school exists
    const schoolCheck = await pool.query(
      'SELECT * FROM schools WHERE id = $1',
      [school_id]
    );

    if (schoolCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'School not found.',
      } as ApiResponse);
      return;
    }

    // Check if parent exists and has PARENT role
    const parentCheck = await pool.query(
      "SELECT * FROM users WHERE id = $1 AND role = 'PARENT'",
      [parent_id]
    );

    if (parentCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Parent not found or invalid role.',
      } as ApiResponse);
      return;
    }

    const result = await pool.query(
      `INSERT INTO students (first_name, last_name, class_name, school_id, parent_id, photo_url, allergies)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        first_name,
        last_name,
        class_name || null,
        school_id,
        parent_id,
        photo_url || null,
        allergies || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Student created successfully.',
      data: result.rows[0],
    } as ApiResponse);
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating student.',
    } as ApiResponse);
  }
};

/**
 * UPDATE STUDENT - Update a student
 * PUT /api/students/:id
 */
export const updateStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { first_name, last_name, class_name, school_id, photo_url, allergies } = req.body;

    // Check if student exists
    const existingStudent = await pool.query(
      'SELECT * FROM students WHERE id = $1',
      [id]
    );

    if (existingStudent.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Student not found.',
      } as ApiResponse);
      return;
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (first_name !== undefined) {
      updates.push(`first_name = $${paramCount}`);
      values.push(first_name);
      paramCount++;
    }

    if (last_name !== undefined) {
      updates.push(`last_name = $${paramCount}`);
      values.push(last_name);
      paramCount++;
    }

    if (class_name !== undefined) {
      updates.push(`class_name = $${paramCount}`);
      values.push(class_name);
      paramCount++;
    }

    if (school_id !== undefined) {
      updates.push(`school_id = $${paramCount}`);
      values.push(school_id);
      paramCount++;
    }

    if (photo_url !== undefined) {
      updates.push(`photo_url = $${paramCount}`);
      values.push(photo_url);
      paramCount++;
    }

    if (allergies !== undefined) {
      updates.push(`allergies = $${paramCount}`);
      values.push(allergies);
      paramCount++;
    }

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No data to update.',
      } as ApiResponse);
      return;
    }

    values.push(id);

    const query = `
      UPDATE students 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    res.status(200).json({
      success: true,
      message: 'Student updated successfully.',
      data: result.rows[0],
    } as ApiResponse);
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating student.',
    } as ApiResponse);
  }
};

/**
 * DELETE STUDENT - Delete a student
 * DELETE /api/students/:id
 */
export const deleteStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM students WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Student not found.',
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully.',
    } as ApiResponse);
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting student.',
    } as ApiResponse);
  }
};