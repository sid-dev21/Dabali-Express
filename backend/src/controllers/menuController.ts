import { Request, Response } from 'express';
import Menu from '../models/Menu';
import School from '../models/School';
import User from '../models/User';
import Notification from '../models/Notification';
import { ApiResponse, CreateMenuDTO, ApproveMenuDTO, MenuStatus } from '../types';

// Allows to get all menus with optional filters (school, date, status) and populated school and user info
export const getAllMenus = async (req: Request, res: Response): Promise<void> => {
  try {
    const school_id = req.query.school_id as string;
    const date = req.query.date as string;
    const status = req.query.status as string;

    // Build query
    let query: any = {};
    if (school_id) query.school_id = school_id;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }
    if (status) query.status = status;

    const menus = await Menu.find(query)
      .populate('school_id', 'name city')
      .populate('created_by', 'first_name last_name')
      .populate('approved_by', 'first_name last_name')
      .sort({ date: -1, meal_type: 1 });

    res.json({
      success: true,
      data: menus
    } as ApiResponse);
  } catch (error) {
    console.error('Get all menus error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving menus.'
    } as ApiResponse);
  }
};

// Allows to get weekly menus for a school (only approved ones)
export const getWeeklyMenus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { school_id, start_date } = req.query;

    if (!school_id || !start_date) {
      res.status(400).json({
        success: false,
        message: 'School ID and start date are required.'
      } as ApiResponse);
      return;
    }

    const startDate = new Date(start_date as string);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    const menus = await Menu.find({
      school_id,
      date: { $gte: startDate, $lte: endDate },
      status: MenuStatus.APPROVED
    })
      .populate('school_id', 'name')
      .sort({ date: 1, meal_type: 1 });

    res.json({
      success: true,
      data: menus
    } as ApiResponse);
  } catch (error) {
    console.error('Get weekly menus error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving weekly menus.'
    } as ApiResponse);
  }
};

// Allows to get a menu by ID (with populated school and user info)
export const getMenuById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const menu = await Menu.findById(id)
      .populate('school_id', 'name city')
      .populate('created_by', 'first_name last_name')
      .populate('approved_by', 'first_name last_name');

    if (!menu) {
      res.status(404).json({
        success: false,
        message: 'Menu not found.'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: menu
    } as ApiResponse);
  } catch (error) {
    console.error('Get menu by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving menu.'
    } as ApiResponse);
  }
};

//
export const createMenu = async (req: Request, res: Response): Promise<void> => {
  try {
    const { school_id, date, meal_type, description, items, allergens }: CreateMenuDTO = req.body;

    // Validate required fields
    if (!school_id || !date || !meal_type) {
      res.status(400).json({
        success: false,
        message: 'School ID, date, and meal type are required.'
      } as ApiResponse);
      return;
    }

    // Check if school exists
    const school = await School.findById(school_id);
    if (!school) {
      res.status(404).json({
        success: false,
        message: 'School not found.'
      } as ApiResponse);
      return;
    }

    // Create menu
    const menu = new Menu({
      school_id,
      date: new Date(date),
      meal_type,
      description,
      items: items || [],
      allergens: allergens || [],
      status: MenuStatus.PENDING,
      created_by: req.user?.id
    });

    await menu.save();

    // Return populated menu
    const populatedMenu = await Menu.findById(menu._id)
      .populate('school_id', 'name city')
      .populate('created_by', 'first_name last_name');

    res.status(201).json({
      success: true,
      message: 'Menu created successfully and pending approval.',
      data: populatedMenu
    } as ApiResponse);
  } catch (error) {
    console.error('Create menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating menu.'
    } as ApiResponse);
  }
};

// Allows to update a menu (only if it's still pending and only certain fields) 
export const updateMenu = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates._id;
    delete updates.created_by;
    delete updates.approved_by;
    delete updates.approved_at;
    delete updates.created_at;

    const menu = await Menu.findByIdAndUpdate(
      id,
      { ...updates, updated_at: new Date() },
      { new: true, runValidators: true }
    ).populate('school_id', 'name city')
     .populate('created_by', 'first_name last_name')
     .populate('approved_by', 'first_name last_name');

    if (!menu) {
      res.status(404).json({
        success: false,
        message: 'Menu not found.'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      message: 'Menu updated successfully.',
      data: menu
    } as ApiResponse);
  } catch (error) {
    console.error('Update menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating menu.'
    } as ApiResponse);
  }
};

//Allows to delete a menu (only if it's still pending)
export const deleteMenu = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const menu = await Menu.findByIdAndDelete(id);

    if (!menu) {
      res.status(404).json({
        success: false,
        message: 'Menu not found.'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      message: 'Menu deleted successfully.',
      data: menu
    } as ApiResponse);
  } catch (error) {
    console.error('Delete menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting menu.'
    } as ApiResponse);
  }
};

// Allows to get all pending menus (for admin review)
export const getPendingMenus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { school_id } = req.query;

    let query: any = { status: MenuStatus.PENDING };
    if (school_id) query.school_id = school_id;

    const menus = await Menu.find(query)
      .populate('school_id', 'name city')
      .populate('created_by', 'first_name last_name')
      .sort({ date: -1, meal_type: 1 });

    res.json({
      success: true,
      data: menus
    } as ApiResponse);
  } catch (error) {
    console.error('Get pending menus error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving pending menus.'
    } as ApiResponse);
  }
};

// Allows to approve or reject a menu
export const approveMenu = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { approved, rejection_reason }: ApproveMenuDTO = req.body;

    if (approved === undefined) {
      res.status(400).json({
        success: false,
        message: 'Approval status is required.'
      } as ApiResponse);
      return;
    }

    if (!approved && !rejection_reason) {
      res.status(400).json({
        success: false,
        message: 'Rejection reason is required when rejecting a menu.'
      } as ApiResponse);
      return;
    }

    const menu = await Menu.findById(id);
    if (!menu) {
      res.status(404).json({
        success: false,
        message: 'Menu not found.'
      } as ApiResponse);
      return;
    }

    if (menu.status !== MenuStatus.PENDING) {
      res.status(400).json({
        success: false,
        message: 'Menu is not pending approval.'
      } as ApiResponse);
      return;
    }

    // Update menu status
    const newStatus = approved ? MenuStatus.APPROVED : MenuStatus.REJECTED;
    const updatedMenu = await Menu.findByIdAndUpdate(
      id,
      {
        status: newStatus,
        approved_by: req.user?.id,
        approved_at: new Date(),
        rejection_reason: approved ? null : rejection_reason,
        updated_at: new Date()
      },
      { new: true }
    ).populate('created_by', 'first_name last_name');

    // Create notification for menu creator
    const notificationTitle = approved ? 'Menu Approuvé' : 'Menu Rejeté';
    const notificationMessage = approved
      ? `Votre menu pour le ${new Date(menu.date).toLocaleDateString()} (${menu.meal_type}) a été approuvé.`
      : `Votre menu pour le ${new Date(menu.date).toLocaleDateString()} (${menu.meal_type}) a été rejeté. Motif: ${rejection_reason}`;

    const notification = new Notification({
      user_id: menu.created_by,
      title: notificationTitle,
      message: notificationMessage,
      type: approved ? 'MENU_APPROVED' : 'MENU_REJECTED',
      related_menu_id: id
    });

    await notification.save();

    res.json({
      success: true,
      message: `Menu ${approved ? 'approved' : 'rejected'} successfully.`,
      data: updatedMenu
    } as ApiResponse);
  } catch (error) {
    console.error('Approve menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving menu.'
    } as ApiResponse);
  }
};
