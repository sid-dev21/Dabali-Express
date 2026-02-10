import { Response, Request } from 'express';
import { AuthenticatedRequest } from '../types/express';
import database from '../config/database';

/**
 * GET ALL USERS - Retrieve all users (SUPER_ADMIN only)
 * GET /api/users
 */
export const getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await database.query(
      `SELECT id, email, role, first_name, last_name, phone, school_id, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    );

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving users.',
    });
  }
};

/**
 * GET USER BY ID - Retrieve a user by ID (SUPER_ADMIN only)
 * GET /api/users/:id
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await database.query(
      `SELECT id, email, role, first_name, last_name, phone, school_id, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user.',
    });
  }
};

/**
 * UPDATE USER - Update a user (SUPER_ADMIN only)
 * PUT /api/users/:id
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { email, role, first_name, last_name, phone, school_id } = req.body;

    // Check if user exists
    const userCheck = await database.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (email !== undefined) {
      updates.push(`email = $${paramCount}`);
      params.push(email);
      paramCount++;
    }
    if (role !== undefined) {
      updates.push(`role = $${paramCount}`);
      params.push(role);
      paramCount++;
    }
    if (first_name !== undefined) {
      updates.push(`first_name = $${paramCount}`);
      params.push(first_name);
      paramCount++;
    }
    if (last_name !== undefined) {
      updates.push(`last_name = $${paramCount}`);
      params.push(last_name);
      paramCount++;
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount}`);
      params.push(phone);
      paramCount++;
    }
    if (school_id !== undefined) {
      updates.push(`school_id = $${paramCount}`);
      params.push(school_id);
      paramCount++;
    }

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No fields to update.',
      });
      return;
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await database.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, role, first_name, last_name, phone, school_id, created_at, updated_at`,
      params
    );

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user.',
    });
  }
};

/**
 * DELETE USER - Delete a user (SUPER_ADMIN only)
 * DELETE /api/users/:id
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Prevent deletion of SUPER_ADMIN
    const userCheck = await database.query('SELECT role FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }

    if (userCheck.rows[0].role === 'SUPER_ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Cannot delete SUPER_ADMIN user.',
      });
      return;
    }

    await database.query('DELETE FROM users WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user.',
    });
  }
};
