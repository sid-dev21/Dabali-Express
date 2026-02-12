"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const menuController_1 = require("../controllers/menuController");
const auth_1 = require("../middlewares/auth");
const roleCheck_1 = require("../middlewares/roleCheck");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authMiddleware);
// Get all menus
router.get('/', menuController_1.getAllMenus);
// Get week menu
router.get('/week/:schoolId', menuController_1.getWeeklyMenus);
// Get menu by ID
router.get('/:id', menuController_1.getMenuById);
// Create menu (CANTEEN_MANAGER only - creates pending menu)
router.post('/', (0, roleCheck_1.requireRole)(types_1.UserRole.CANTEEN_MANAGER), menuController_1.createMenu);
// Update menu (SCHOOL_ADMIN or CANTEEN_MANAGER)
router.put('/:id', (0, roleCheck_1.requireRole)(types_1.UserRole.SCHOOL_ADMIN, types_1.UserRole.CANTEEN_MANAGER), menuController_1.updateMenu);
// Delete menu (SCHOOL_ADMIN or CANTEEN_MANAGER)
router.delete('/:id', (0, roleCheck_1.requireRole)(types_1.UserRole.SCHOOL_ADMIN, types_1.UserRole.CANTEEN_MANAGER), menuController_1.deleteMenu);
// Get pending menus (SCHOOL_ADMIN only - for approval)
router.get('/pending', (0, roleCheck_1.requireRole)(types_1.UserRole.SCHOOL_ADMIN), menuController_1.getPendingMenus);
// Approve/reject menu (SCHOOL_ADMIN only)
router.put('/:id/approve', (0, roleCheck_1.requireRole)(types_1.UserRole.SCHOOL_ADMIN), menuController_1.approveMenu);
exports.default = router;
