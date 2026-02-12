"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveMenu = exports.getPendingMenus = exports.deleteMenu = exports.updateMenu = exports.createMenu = exports.getMenuById = exports.getWeeklyMenus = exports.getAllMenus = void 0;
const Menu_1 = __importDefault(require("../models/Menu"));
const School_1 = __importDefault(require("../models/School"));
const Notification_1 = __importDefault(require("../models/Notification"));
const types_1 = require("../types");
// Allows to get all menus with optional filters (school, date, status) and populated school and user info
const getAllMenus = async (req, res) => {
    try {
        const school_id = req.query.school_id;
        const date = req.query.date;
        const status = req.query.status;
        // Build query
        let query = {};
        if (school_id)
            query.school_id = school_id;
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            query.date = { $gte: startDate, $lte: endDate };
        }
        if (status)
            query.status = status;
        const menus = await Menu_1.default.find(query)
            .populate('school_id', 'name city')
            .populate('created_by', 'first_name last_name')
            .populate('approved_by', 'first_name last_name')
            .sort({ date: -1, meal_type: 1 });
        res.json({
            success: true,
            data: menus
        });
    }
    catch (error) {
        console.error('Get all menus error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving menus.'
        });
    }
};
exports.getAllMenus = getAllMenus;
// Allows to get weekly menus for a school (only approved ones)
const getWeeklyMenus = async (req, res) => {
    try {
        const schoolId = (req.params.schoolId || req.query.school_id);
        const startDateInput = req.query.start_date;
        if (!schoolId) {
            res.status(400).json({
                success: false,
                message: 'School ID is required.'
            });
            return;
        }
        const now = new Date();
        const defaultWeekStart = new Date(now);
        defaultWeekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
        defaultWeekStart.setHours(0, 0, 0, 0);
        const startDate = startDateInput ? new Date(startDateInput) : defaultWeekStart;
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        const menus = await Menu_1.default.find({
            school_id: schoolId,
            date: { $gte: startDate, $lte: endDate },
            status: types_1.MenuStatus.APPROVED
        })
            .populate('school_id', 'name')
            .sort({ date: 1, meal_type: 1 });
        res.json({
            success: true,
            data: menus
        });
    }
    catch (error) {
        console.error('Get weekly menus error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving weekly menus.'
        });
    }
};
exports.getWeeklyMenus = getWeeklyMenus;
// Allows to get a menu by ID (with populated school and user info)
const getMenuById = async (req, res) => {
    try {
        const { id } = req.params;
        const menu = await Menu_1.default.findById(id)
            .populate('school_id', 'name city')
            .populate('created_by', 'first_name last_name')
            .populate('approved_by', 'first_name last_name');
        if (!menu) {
            res.status(404).json({
                success: false,
                message: 'Menu not found.'
            });
            return;
        }
        res.json({
            success: true,
            data: menu
        });
    }
    catch (error) {
        console.error('Get menu by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving menu.'
        });
    }
};
exports.getMenuById = getMenuById;
//
const createMenu = async (req, res) => {
    try {
        const { school_id, date, meal_type, description, items, allergens } = req.body;
        // Validate required fields
        if (!school_id || !date || !meal_type) {
            res.status(400).json({
                success: false,
                message: 'School ID, date, and meal type are required.'
            });
            return;
        }
        // Check if school exists
        const school = await School_1.default.findById(school_id);
        if (!school) {
            res.status(404).json({
                success: false,
                message: 'School not found.'
            });
            return;
        }
        // Create menu
        const menu = new Menu_1.default({
            school_id,
            date: new Date(date),
            meal_type,
            description,
            items: items || [],
            allergens: allergens || [],
            status: types_1.MenuStatus.PENDING,
            created_by: req.user?.id
        });
        await menu.save();
        // Return populated menu
        const populatedMenu = await Menu_1.default.findById(menu._id)
            .populate('school_id', 'name city')
            .populate('created_by', 'first_name last_name');
        res.status(201).json({
            success: true,
            message: 'Menu created successfully and pending approval.',
            data: populatedMenu
        });
    }
    catch (error) {
        console.error('Create menu error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating menu.'
        });
    }
};
exports.createMenu = createMenu;
// Allows to update a menu (only if it's still pending and only certain fields) 
const updateMenu = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        // Remove fields that shouldn't be updated
        delete updates._id;
        delete updates.created_by;
        delete updates.approved_by;
        delete updates.approved_at;
        delete updates.created_at;
        const menu = await Menu_1.default.findByIdAndUpdate(id, { ...updates, updated_at: new Date() }, { new: true, runValidators: true }).populate('school_id', 'name city')
            .populate('created_by', 'first_name last_name')
            .populate('approved_by', 'first_name last_name');
        if (!menu) {
            res.status(404).json({
                success: false,
                message: 'Menu not found.'
            });
            return;
        }
        res.json({
            success: true,
            message: 'Menu updated successfully.',
            data: menu
        });
    }
    catch (error) {
        console.error('Update menu error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating menu.'
        });
    }
};
exports.updateMenu = updateMenu;
//Allows to delete a menu (only if it's still pending)
const deleteMenu = async (req, res) => {
    try {
        const { id } = req.params;
        const menu = await Menu_1.default.findByIdAndDelete(id);
        if (!menu) {
            res.status(404).json({
                success: false,
                message: 'Menu not found.'
            });
            return;
        }
        res.json({
            success: true,
            message: 'Menu deleted successfully.',
            data: menu
        });
    }
    catch (error) {
        console.error('Delete menu error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting menu.'
        });
    }
};
exports.deleteMenu = deleteMenu;
// Allows to get all pending menus (for admin review)
const getPendingMenus = async (req, res) => {
    try {
        const { school_id } = req.query;
        let query = { status: types_1.MenuStatus.PENDING };
        if (school_id)
            query.school_id = school_id;
        const menus = await Menu_1.default.find(query)
            .populate('school_id', 'name city')
            .populate('created_by', 'first_name last_name')
            .sort({ date: -1, meal_type: 1 });
        res.json({
            success: true,
            data: menus
        });
    }
    catch (error) {
        console.error('Get pending menus error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving pending menus.'
        });
    }
};
exports.getPendingMenus = getPendingMenus;
// Allows to approve or reject a menu
const approveMenu = async (req, res) => {
    try {
        const { id } = req.params;
        const { approved, rejection_reason } = req.body;
        if (approved === undefined) {
            res.status(400).json({
                success: false,
                message: 'Approval status is required.'
            });
            return;
        }
        if (!approved && !rejection_reason) {
            res.status(400).json({
                success: false,
                message: 'Rejection reason is required when rejecting a menu.'
            });
            return;
        }
        const menu = await Menu_1.default.findById(id);
        if (!menu) {
            res.status(404).json({
                success: false,
                message: 'Menu not found.'
            });
            return;
        }
        if (menu.status !== types_1.MenuStatus.PENDING) {
            res.status(400).json({
                success: false,
                message: 'Menu is not pending approval.'
            });
            return;
        }
        // Update menu status
        const newStatus = approved ? types_1.MenuStatus.APPROVED : types_1.MenuStatus.REJECTED;
        const updatedMenu = await Menu_1.default.findByIdAndUpdate(id, {
            status: newStatus,
            approved_by: req.user?.id,
            approved_at: new Date(),
            rejection_reason: approved ? null : rejection_reason,
            updated_at: new Date()
        }, { new: true }).populate('created_by', 'first_name last_name');
        // Create notification for menu creator
        const notificationTitle = approved ? 'Menu Approuvé' : 'Menu Rejeté';
        const notificationMessage = approved
            ? `Votre menu pour le ${new Date(menu.date).toLocaleDateString()} (${menu.meal_type}) a été approuvé.`
            : `Votre menu pour le ${new Date(menu.date).toLocaleDateString()} (${menu.meal_type}) a été rejeté. Motif: ${rejection_reason}`;
        const notification = new Notification_1.default({
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
        });
    }
    catch (error) {
        console.error('Approve menu error:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving menu.'
        });
    }
};
exports.approveMenu = approveMenu;
