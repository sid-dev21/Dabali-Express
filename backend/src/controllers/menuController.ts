import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Menu from '../models/Menu';
import School from '../models/School';
import User from '../models/User';
import Student from '../models/Student';
import Notification from '../models/Notification';
import { ApiResponse, CreateMenuDTO, ApproveMenuDTO, MenuStatus, UserRole } from '../types';

const parseISODate = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date(value);
  return new Date(year, month - 1, day);
};

const startOfDay = (value: Date) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value: Date) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const getSameWeekdayDatesInRange = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return dates;
};

const normalizeMenuItems = (items: any): string[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item) return '';
      if (typeof item === 'string') return item.trim();
      if (typeof item === 'object') return String(item.name || '').trim();
      return '';
    })
    .filter((item) => item.length > 0);
};

const resolveAccessibleSchoolIds = async (user?: { id: string; role: UserRole }) => {
  if (!user) return [];
  if (user.role === UserRole.SUPER_ADMIN) return null;
  if (user.role === UserRole.SCHOOL_ADMIN) {
    const school = await School.findOne({ admin_id: user.id }).select('_id');
    return school?._id ? [school._id.toString()] : [];
  }
  if (user.role === UserRole.CANTEEN_MANAGER) {
    const manager = await User.findById(user.id).select('school_id');
    return manager?.school_id ? [manager.school_id.toString()] : [];
  }
  if (user.role === UserRole.PARENT) {
    const studentIds = await Student.find({ parent_id: user.id }).distinct('school_id');
    return studentIds.map((id) => id.toString());
  }
  return [];
};

const ensureMenuWriteAccess = async (menu: any, user?: { id: string; role: UserRole }) => {
  if (!user) return false;
  if (user.role === UserRole.SUPER_ADMIN) return true;
  if (user.role === UserRole.SCHOOL_ADMIN) {
    const school = await School.findById(menu.school_id).select('admin_id');
    return Boolean(school?.admin_id?.toString() === user.id?.toString());
  }
  if (user.role === UserRole.CANTEEN_MANAGER) {
    const manager = await User.findById(user.id).select('school_id');
    return Boolean(manager?.school_id?.toString() === menu.school_id?.toString());
  }
  return false;
};

// Get today's menu for a specific school
export const getTodayMenu = async (req: Request, res: Response): Promise<void> => {
  try {
    const school_id = req.query.school_id as string;
    
    if (!school_id) {
      res.status(400).json({ success: false, message: 'School ID is required' } as ApiResponse);
      return;
    }

    // Check user access
    const allowedSchoolIds = await resolveAccessibleSchoolIds(req.user);
    if (allowedSchoolIds && !allowedSchoolIds.includes(school_id)) {
      res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' } as ApiResponse);
      return;
    }

    // Get today's date range
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    // Build query
    let query: any = {
      school_id,
      date: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    };

    if (req.user?.role === UserRole.PARENT) {
      query.status = MenuStatus.APPROVED;
    }

    // Find today's menu
    const menu = await Menu.findOne(query)
      .populate('school_id', 'name')
      .populate('created_by', 'firstName lastName');

    if (!menu) {
      res.status(404).json({ success: false, message: 'Aucun menu trouvé pour aujourd\'hui.' } as ApiResponse);
      return;
    }

    res.status(200).json({ success: true, data: menu } as ApiResponse);
  } catch (error) {
    console.error('Error getting today menu:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' } as ApiResponse);
  }
};

// Allows to get all menus with optional filters (school, date, status) and populated school and user info
export const getAllMenus = async (req: Request, res: Response): Promise<void> => {
  try {
    const school_id = req.query.school_id as string;
    const date = req.query.date as string;
    const status = req.query.status as string;

    // Build query
    let query: any = {};
    const allowedSchoolIds = await resolveAccessibleSchoolIds(req.user);
    if (allowedSchoolIds && !allowedSchoolIds.length) {
      res.status(403).json({ success: false, message: 'Accès non autorisé.' } as ApiResponse);
      return;
    }

    if (school_id) {
      if (allowedSchoolIds && !allowedSchoolIds.includes(school_id)) {
        res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' } as ApiResponse);
        return;
      }
      query.school_id = school_id;
    } else if (allowedSchoolIds) {
      query.school_id = { $in: allowedSchoolIds };
    }

    if (req.user?.role === UserRole.PARENT) {
      query.status = MenuStatus.APPROVED;
    } else if (status) {
      query.status = status;
    }
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

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

    if (!start_date) {
      res.status(400).json({
        success: false,
        message: 'School ID and start date are required.'
      } as ApiResponse);
      return;
    }

    const allowedSchoolIds = await resolveAccessibleSchoolIds(req.user);
    if (allowedSchoolIds && !allowedSchoolIds.length) {
      res.status(403).json({ success: false, message: 'Accès non autorisé.' } as ApiResponse);
      return;
    }

    let resolvedSchoolId = school_id as string | undefined;
    if (!resolvedSchoolId) {
      if (allowedSchoolIds === null) {
        res.status(400).json({ success: false, message: 'School ID is required for SUPER_ADMIN.' } as ApiResponse);
        return;
      }
      if (allowedSchoolIds.length === 1) {
        resolvedSchoolId = allowedSchoolIds[0];
      } else {
        res.status(400).json({ success: false, message: 'School ID requis.' } as ApiResponse);
        return;
      }
    } else if (allowedSchoolIds && !allowedSchoolIds.includes(resolvedSchoolId)) {
      res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' } as ApiResponse);
      return;
    }

    const startDate = new Date(start_date as string);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    const menus = await Menu.find({
      school_id: resolvedSchoolId,
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

    const allowedSchoolIds = await resolveAccessibleSchoolIds(req.user);
    if (allowedSchoolIds && !allowedSchoolIds.length) {
      res.status(403).json({ success: false, message: 'Accès non autorisé.' } as ApiResponse);
      return;
    }
    const menuSchoolId = (menu.school_id as any)?._id?.toString?.() || menu.school_id?.toString?.();
    if (allowedSchoolIds && menuSchoolId && !allowedSchoolIds.includes(menuSchoolId)) {
      res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' } as ApiResponse);
      return;
    }
    if (req.user?.role === UserRole.PARENT && menu.status !== MenuStatus.APPROVED) {
      res.status(403).json({ success: false, message: 'Accès non autorisé.' } as ApiResponse);
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
    const normalizedItems = normalizeMenuItems(items as any);
    const normalizedDescription = String(description || '').trim() || normalizedItems[0] || '';

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

    const startDate = startOfDay(parseISODate(date));
    const endDate = new Date(startDate.getFullYear(), 11, 31);
    const dates = getSameWeekdayDatesInRange(startDate, endDate);

    const annualKey = new mongoose.Types.ObjectId().toString();
    const approvalDate = new Date();
    const payload = {
      school_id,
      meal_type,
      description: normalizedDescription,
      items: normalizedItems,
      allergens: allergens || [],
      status: MenuStatus.APPROVED,
      created_by: req.user?.id,
      approved_by: req.user?.id,
      approved_at: approvalDate,
      annual_key: annualKey,
      is_annual: true
    };

    const operations = dates.map((day) => ({
      updateOne: {
        filter: {
          school_id,
          meal_type,
          date: { $gte: startOfDay(day), $lte: endOfDay(day) }
        },
        update: { $set: { ...payload, date: new Date(day) } },
        upsert: true
      }
    }));

    if (operations.length) {
      await Menu.bulkWrite(operations);
    }

    const populatedMenu = await Menu.findOne({
      school_id,
      meal_type,
      annual_key: annualKey,
      date: { $gte: startOfDay(startDate), $lte: endOfDay(startDate) }
    })
      .populate('school_id', 'name city')
      .populate('created_by', 'first_name last_name');

    res.status(201).json({
      success: true,
      message: 'Menu created and approved successfully for the year.',
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

    if (Object.prototype.hasOwnProperty.call(updates, 'items')) {
      updates.items = normalizeMenuItems(updates.items);
    }
    if (updates.description !== undefined) {
      const normalizedDescription = String(updates.description || '').trim();
      updates.description = normalizedDescription || (Array.isArray(updates.items) ? updates.items[0] : '');
    } else if (Array.isArray(updates.items) && updates.items.length > 0) {
      updates.description = updates.items[0];
    }

    const existingMenu = await Menu.findById(id);
    if (!existingMenu) {
      res.status(404).json({
        success: false,
        message: 'Menu not found.'
      } as ApiResponse);
      return;
    }

    const canWrite = await ensureMenuWriteAccess(existingMenu, req.user);
    if (!canWrite) {
      res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette école.'
      } as ApiResponse);
      return;
    }

    const isAnnual = Boolean(existingMenu.annual_key || existingMenu.is_annual);
    if (isAnnual) {
      delete updates.date;
      await Menu.updateMany(
        { annual_key: existingMenu.annual_key },
        {
          $set: {
            ...updates,
            status: MenuStatus.APPROVED,
            approved_by: req.user?.id,
            approved_at: new Date(),
            updated_at: new Date()
          }
        }
      );
    } else {
      await Menu.findByIdAndUpdate(
        id,
        { ...updates, updated_at: new Date() },
        { runValidators: true }
      );
    }

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

    const menu = await Menu.findById(id);

    if (!menu) {
      res.status(404).json({
        success: false,
        message: 'Menu not found.'
      } as ApiResponse);
      return;
    }

    const canWrite = await ensureMenuWriteAccess(menu, req.user);
    if (!canWrite) {
      res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette école.'
      } as ApiResponse);
      return;
    }

    const isAnnual = Boolean(menu.annual_key || menu.is_annual);
    if (isAnnual) {
      await Menu.deleteMany({ annual_key: menu.annual_key });
    } else {
      await Menu.findByIdAndDelete(id);
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
