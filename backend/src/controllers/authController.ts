
import { Request, Response } from 'express';
import pool from '../config/database';
import { hashPassword, comparePassword } from '../utils/hashPassword';
import { generateToken } from '../utils/generateToken';
import { isValidEmail, isValidPassword } from '../utils/validators';
import { ApiResponse, UserResponse, RegisterDTO, LoginDTO, UserRole } from '../types';

/**
 * REGISTER - New user registration
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role, first_name, last_name, phone }: RegisterDTO = req.body;

    // 1. Validation of data
    if (!email || !password || !role || !first_name || !last_name) {
      res.status(400).json({
        success: false,
        message: 'All required fields must be filled.',
      } as ApiResponse);
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({
        success: false,
        message: 'Email invalide.',
      } as ApiResponse);
      return;
    }

    if (!isValidPassword(password)) {
      res.status(400).json({
        success: false,
        message: 'Password must contain at least 8 characters, 1 uppercase, 1 lowercase and 1 digit.',
      } as ApiResponse);
      return;
    }

    // 2. Check if email already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: 'This email is already in use.',
      } as ApiResponse);
      return;
    }

    // 3. Check if only one SUPER_ADMIN exists
    if (role === UserRole.SUPER_ADMIN) {
      const existingSuperAdmin = await pool.query(
        "SELECT * FROM users WHERE role = 'SUPER_ADMIN'"
      );

      if (existingSuperAdmin.rows.length > 0) {
        res.status(403).json({
          success: false,
          message: 'A Super Admin already exists.',
        } as ApiResponse);
        return;
      }
    }

    // 4. Hash the password
    const hashedPassword = await hashPassword(password);

    // 5. Insert the user into the DB
    const result = await pool.query(
      `INSERT INTO users (email, password, role, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, role, first_name, last_name, phone, created_at`,
      [email, hashedPassword, role, first_name, last_name, phone || null]
    );

    const user: UserResponse = result.rows[0];

    // 6. Generate a JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    // 7. Return the response
    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: user,
      token,
    } as ApiResponse);
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating account.',
    } as ApiResponse);
  }
};

/**
 * LOGIN - User login
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginDTO = req.body;

    // 1. Validation of data
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password required.',
      } as ApiResponse);
      return;
    }

    // 2. Check if user exists
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Email or password incorrect.',
      } as ApiResponse);
      return;
    }

    const user = result.rows[0];

    // 3. Verify the password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Email or password incorrect.',
      } as ApiResponse);
      return;
    }

    // 4. Generate the token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // 5. Return the response (without the password)
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: userWithoutPassword,
      token,
    } as ApiResponse);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login.',
    } as ApiResponse);
  }
};

/**
 * GET CURRENT USER - Get current user profile
 * GET /api/auth/me
 * Requires authentication
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // req.user is defined by the authMiddleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated.',
      } as ApiResponse);
      return;
    }

    // Retrieve the complete user information
    const result = await pool.query(
      'SELECT id, email, role, first_name, last_name, phone, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    } as ApiResponse);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving profile.',
    } as ApiResponse);
  }
};