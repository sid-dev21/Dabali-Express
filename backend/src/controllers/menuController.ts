/**
 * MENU CONTROLLER
 * 
 * Manages CRUD operations for cafeteria menus.
 */

import { Request, Response } from 'express';
import pool from '../config/database';
import { ApiResponse, CreateMenuDTO, MealType } from '../types';
import { formatDateForDB } from '../utils/helpers';
import { isValidDate } from '../utils/validators';

/**
 * GET ALL MENUS - Retrieve menus (with filters)
 * GET /api/menus
 */
export const getAllMenus = async (req: Request, res: Response): Promise<void> => {
  try {
    const school_id = req.query.school_id as string;
    const start_date = req.query.start_date as string;
    const end_date = req.query.end_date as string;
    const meal_type = req.query.meal_type as MealType;

    // Validation
    if (!school_id) {
      res.status(400).json({
        success: false,
        message: 'School ID is required.',
      } as ApiResponse);
      return;
    }

    let query = `
      SELECT m.*, sc.name as school_name, COALESCE(m.allergens, '[]'::json) as allergens
      FROM menus m
      JOIN schools sc ON m.school_id = sc.id
      WHERE m.school_id = $1
    `;

    const params: any[] = [school_id];
    let paramCount = 2;

    if (start_date) {
      query += ` AND m.date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND m.date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    if (meal_type) {
      query += ` AND m.meal_type = $${paramCount}`;
      params.push(meal_type);
      paramCount++;
    }

    query += ' ORDER BY m.date ASC, m.meal_type ASC';

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: result.rows,
    } as ApiResponse);
  } catch (error) {
    console.error('Get all menus error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving menus.',
    } as ApiResponse);
  }
};

/**
 * GET WEEK MENU - Retrieve the weekly menu
 * GET /api/menus/week/:schoolId
 */
export const getWeekMenu = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId } = req.params;

    // Calculate the start and end of the week
    const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday of this week

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + diff);

    const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Sunday

    const result = await pool.query(
      `SELECT *, COALESCE(allergens, '[]'::json) as allergens
       FROM menus
       WHERE school_id = $1
       AND date >= $2
       AND date <= $3
       ORDER BY date ASC, meal_type ASC`,
      [schoolId, formatDateForDB(weekStart), formatDateForDB(weekEnd)]
    );

    // Format results by day
    const menusByDay: { [key: string]: any } = {};
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    result.rows.forEach((menu: any) => {
      const date = new Date(menu.date);
      const dateStr = menu.date;
      const dayName = daysOfWeek[date.getDay()];

      if (!menusByDay[dateStr]) {
        menusByDay[dateStr] = {
          date: dateStr,
          day: dayName,
        };
      }

      menusByDay[dateStr][menu.meal_type.toLowerCase()] = {
        description: menu.description,
        items: menu.items,
        allergens: menu.allergens,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        school_id: schoolId,
        week_start: formatDateForDB(weekStart),
        week_end: formatDateForDB(weekEnd),
        menus: Object.values(menusByDay),
      },
    } as ApiResponse);
  } catch (error) {
    console.error('Get week menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving weekly menu.',
    } as ApiResponse);
  }
};

/**
 * GET MENU BY ID - Retrieve a menu by ID
 * GET /api/menus/:id
 */
export const getMenuById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT m.*, sc.name as school_name, COALESCE(m.allergens, '[]'::json) as allergens
       FROM menus m
       JOIN schools sc ON m.school_id = sc.id
       WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Menu not found.',
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    } as ApiResponse);
  } catch (error) {
    console.error('Get menu by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving menu.',
    } as ApiResponse);
  }
};

/**
 * CREATE MENU - Create a new menu
 * POST /api/menus
 */
export const createMenu = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      school_id,
      date,
      meal_type,
      description,
      items,
      allergens,
    }: CreateMenuDTO = req.body;

    // Validation
    if (!school_id || !date || !meal_type) {
      res.status(400).json({
        success: false,
        message: 'School, date and meal type are required.',
      } as ApiResponse);
      return;
    }

    if (!isValidDate(date)) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD.',
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

    // Check if a menu already exists for this school, date and type
    const existingMenu = await pool.query(
      'SELECT * FROM menus WHERE school_id = $1 AND date = $2 AND meal_type = $3',
      [school_id, date, meal_type]
    );

    if (existingMenu.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: 'A menu already exists for this date and meal type.',
      } as ApiResponse);
      return;
    }

    const result = await pool.query(
      `INSERT INTO menus (school_id, date, meal_type, description, items, allergens)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        school_id,
        date,
        meal_type,
        description || null,
        JSON.stringify(items || []),
        allergens || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Menu created successfully.',
      data: result.rows[0],
    } as ApiResponse);
  } catch (error: any) {
    console.error('Create menu error:', error);
    
    // Handle unique constraint error
    if (error.code === '23505') {
      res.status(400).json({
        success: false,
        message: 'A menu already exists for this school, date and meal type.',
      } as ApiResponse);
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error creating menu.',
    } as ApiResponse);
  }
};

/**
 * UPDATE MENU - Update a menu
 * PUT /api/menus/:id
 */
export const updateMenu = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { description, items, allergens } = req.body;

    // Check if menu exists
    const existingMenu = await pool.query(
      'SELECT * FROM menus WHERE id = $1',
      [id]
    );

    if (existingMenu.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Menu not found.',
      } as ApiResponse);
      return;
    }

    // Build the query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (items !== undefined) {
      updates.push(`items = $${paramCount}`);
      values.push(JSON.stringify(items));
      paramCount++;
    }

    if (allergens !== undefined) {
      updates.push(`allergens = $${paramCount}`);
      values.push(allergens);
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
      UPDATE menus 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    res.status(200).json({
      success: true,
      message: 'Menu updated successfully.',
      data: result.rows[0],
    } as ApiResponse);
  } catch (error) {
    console.error('Update menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating menu.',
    } as ApiResponse);
  }
};

/**
 * DELETE MENU - Delete a menu
 * DELETE /api/menus/:id
 */
export const deleteMenu = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM menus WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Menu not found.',
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Menu deleted successfully.',
    } as ApiResponse);
  } catch (error) {
    console.error('Delete menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting menu.',
    } as ApiResponse);
  }
};