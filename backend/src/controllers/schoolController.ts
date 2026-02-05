
import { Request, Response } from 'express';
import pool from '../config/database';
import { ApiResponse, PaginationResponse, CreateSchoolDTO, UserRole, School } from '../types';
import { calculatePagination } from '../utils/helpers';

/**
 * GET ALL SCHOOLS - Retrieve all schools
 * GET /api/schools
 */
export const getAllSchools = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const city = req.query.city as string;

    // Count total schools
    let countQuery = 'SELECT COUNT(*) FROM schools';
    const countParams: any[] = [];

    if (city) {
      countQuery += ' WHERE city = $1';
      countParams.push(city);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    const pagination = calculatePagination(page, limit, total);

    // Retrieve paginated schools
    let query = `
      SELECT s.*, 
             u.first_name as admin_first_name, 
             u.last_name as admin_last_name
      FROM schools s
      LEFT JOIN users u ON s.admin_id = u.id
    `;

    const queryParams: any[] = [];

    if (city) {
      query += ' WHERE s.city = $1';
      queryParams.push(city);
    }

    query += ` ORDER BY s.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, pagination.offset);

    const result = await pool.query(query, queryParams);

    res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: pagination.pages,
      },
    } as PaginationResponse<School>);
  } catch (error) {
    console.error('Get all schools error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving schools.',
    } as ApiResponse);
  }
};

/**
 * GET SCHOOL BY ID - Retrieve a school by ID
 * GET /api/schools/:id
 */
export const getSchoolById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT s.*, 
              u.first_name as admin_first_name, 
              u.last_name as admin_last_name,
              u.email as admin_email,
              (SELECT COUNT(*) FROM students WHERE school_id = s.id) as students_count
       FROM schools s
       LEFT JOIN users u ON s.admin_id = u.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'School not found.',
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    } as ApiResponse);
  } catch (error) {
    console.error('Get school by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving school.',
    } as ApiResponse);
  }
};

/**
 * CREATE SCHOOL - Create a new school
 * POST /api/schools
 * Requires SUPER_ADMIN role
 */
export const createSchool = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, address, city, admin_id }: CreateSchoolDTO = req.body;

    // Basic validation
    if (!name) {
      res.status(400).json({
        success: false,
        message: 'School name is required.',
      } as ApiResponse);
      return;
    }

    // If admin_id is provided, check if it exists and has the correct role
    if (admin_id) {
      const adminCheck = await pool.query(
        "SELECT * FROM users WHERE id = $1 AND role = 'SCHOOL_ADMIN'",
        [admin_id]
      );

      if (adminCheck.rows.length === 0) {
        res.status(400).json({
          success: false,
          message: 'The specified administrator does not exist or does not have the SCHOOL_ADMIN role.',
        } as ApiResponse);
        return;
      }
    }

    const result = await pool.query(
      `INSERT INTO schools (name, address, city, admin_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, address || null, city || null, admin_id || null]
    );

    res.status(201).json({
      success: true,
      message: 'School created successfully.',
      data: result.rows[0],
    } as ApiResponse);
  } catch (error) {
    console.error('Create school error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating school.',
    } as ApiResponse);
  }
};

/**
 * UPDATE SCHOOL - Update a school
 * PUT /api/schools/:id
 */
export const updateSchool = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, address, city, admin_id } = req.body;

    // Check if school exists
    const existingSchool = await pool.query(
      'SELECT * FROM schools WHERE id = $1',
      [id]
    );

    if (existingSchool.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'School not found.',
      } as ApiResponse);
      return;
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (address !== undefined) {
      updates.push(`address = $${paramCount}`);
      values.push(address);
      paramCount++;
    }

    if (city !== undefined) {
      updates.push(`city = $${paramCount}`);
      values.push(city);
      paramCount++;
    }

    if (admin_id !== undefined) {
      updates.push(`admin_id = $${paramCount}`);
      values.push(admin_id);
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
      UPDATE schools 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    res.status(200).json({
      success: true,
      message: 'School updated successfully.',
      data: result.rows[0],
    } as ApiResponse);
  } catch (error) {
    console.error('Update school error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating school.',
    } as ApiResponse);
  }
};

/**
 * DELETE SCHOOL - Delete a school
 * DELETE /api/schools/:id
 * Requires SUPER_ADMIN role
 */
export const deleteSchool = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM schools WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'School not found.',
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'School deleted successfully.',
    } as ApiResponse);
  } catch (error) {
    console.error('Delete school error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting school.',
    } as ApiResponse);
  }
};