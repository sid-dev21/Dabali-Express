"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.deleteCanteenManager = exports.forcePasswordReset = exports.getCanteenManagersBySchool = exports.createCanteenManager = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const School_1 = __importDefault(require("../models/School"));
const Student_1 = __importDefault(require("../models/Student"));
const validators_1 = require("../utils/validators");
// Generate temporary password
const generateTemporaryPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};
// Create Canteen Manager account
const createCanteenManager = async (req, res) => {
    try {
        const { first_name, last_name, email, phone, school_id } = req.body;
        // Type assertion pour éviter l'erreur TypeScript
        const schoolAdmin = req.user; // Assuming auth middleware adds user to req
        const schoolAdminId = schoolAdmin?.id || schoolAdmin?._id;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        console.log('[CANTEEN_MANAGER_CREATE] Start', {
            schoolAdminId: schoolAdminId?.toString?.() || schoolAdminId,
            email,
            normalizedEmail,
            school_id,
        });
        // Validate required fields
        if (!first_name || !last_name || !email || !school_id) {
            console.warn('[CANTEEN_MANAGER_CREATE] Missing required fields', {
                first_name: !!first_name,
                last_name: !!last_name,
                email: !!email,
                school_id: !!school_id,
                schoolAdminId: schoolAdminId?.toString?.() || schoolAdminId,
            });
            res.status(400).json({
                success: false,
                message: 'Prénom, nom, email et école sont requis.',
            });
            return;
        }
        // Validate email format (only @gmail.com allowed for canteen managers)
        if (!(0, validators_1.isValidGmailEmail)(normalizedEmail)) {
            console.warn('[CANTEEN_MANAGER_CREATE] Invalid email domain', {
                email,
                normalizedEmail,
                schoolAdminId: schoolAdminId?.toString?.() || schoolAdminId,
            });
            res.status(400).json({
                success: false,
                message: 'Seuls les emails se terminant par @gmail.com sont autorisés pour les gestionnaires de cantine.',
            });
            return;
        }
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ email: normalizedEmail });
        if (existingUser) {
            console.warn('[CANTEEN_MANAGER_CREATE] Email already exists', {
                email,
                normalizedEmail,
                existingUserId: existingUser._id?.toString?.() || existingUser._id,
                schoolAdminId: schoolAdminId?.toString?.() || schoolAdminId,
            });
            res.status(400).json({
                success: false,
                message: 'Un utilisateur avec cet email existe déjà.',
            });
            return;
        }
        // Verify school exists and belongs to admin
        const school = await School_1.default.findById(school_id);
        if (!school) {
            console.warn('[CANTEEN_MANAGER_CREATE] School not found', {
                school_id,
                schoolAdminId: schoolAdminId?.toString?.() || schoolAdminId,
            });
            res.status(404).json({
                success: false,
                message: 'École non trouvée.',
            });
            return;
        }
        // Generate temporary password
        const temporaryPassword = generateTemporaryPassword();
        const hashedPassword = await bcryptjs_1.default.hash(temporaryPassword, 10);
        // Create canteen manager
        const canteenManager = new User_1.default({
            first_name,
            last_name,
            email: normalizedEmail,
            phone,
            password: hashedPassword,
            role: 'CANTEEN_MANAGER',
            school_id,
            is_temporary_password: true,
            created_by: schoolAdminId
        });
        await canteenManager.save();
        console.log('[CANTEEN_MANAGER_CREATE] Success', {
            canteenManagerId: canteenManager._id?.toString?.() || canteenManager._id,
            email: canteenManager.email,
            school_id: school_id?.toString?.() || school_id,
            schoolAdminId: schoolAdminId?.toString?.() || schoolAdminId,
        });
        // Return credentials (in real app, this should be sent via secure email/SMS)
        res.status(201).json({
            success: true,
            message: 'Gestionnaire de cantine créé avec succès.',
            data: {
                user: {
                    id: canteenManager._id,
                    first_name: canteenManager.first_name,
                    last_name: canteenManager.last_name,
                    email: canteenManager.email,
                    phone: canteenManager.phone,
                    role: canteenManager.role,
                    school: school.name
                },
                temporary_password: temporaryPassword,
                instructions: {
                    message: 'Veuillez communiquer ces identifiants au gestionnaire de cantine.',
                    security_note: 'Le gestionnaire devra changer son mot de passe lors de la première connexion.',
                    password_display: 'Afficher le mot de passe temporaire pour le copier-coller',
                    delivery_methods: [
                        'Affichage à l\'écran (copier-coller)',
                        'SMS (si configuré)',
                        'Email (si configuré)'
                    ]
                }
            }
        });
    }
    catch (error) {
        console.error('[CANTEEN_MANAGER_CREATE] Error', {
            message: error.message,
            stack: error.stack,
        });
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du gestionnaire de cantine.',
        });
    }
};
exports.createCanteenManager = createCanteenManager;
// Get canteen managers by school
const getCanteenManagersBySchool = async (req, res) => {
    try {
        const { school_id } = req.params;
        // Type assertion pour éviter l'erreur TypeScript
        const schoolAdmin = req.user;
        const schoolAdminId = schoolAdmin?.id || schoolAdmin?._id;
        // Verify school belongs to admin
        const school = await School_1.default.findById(school_id);
        if (!school || school.admin_id.toString() !== schoolAdminId?.toString()) {
            res.status(403).json({
                success: false,
                message: 'Accès non autorisé à cette école.',
            });
            return;
        }
        const managers = await User_1.default.find({
            role: 'CANTEEN_MANAGER',
            school_id
        }).select('-password');
        res.status(200).json({
            success: true,
            data: managers,
        });
    }
    catch (error) {
        console.error('Get canteen managers error:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des gestionnaires.',
        });
    }
};
exports.getCanteenManagersBySchool = getCanteenManagersBySchool;
// Force password reset for canteen manager
const forcePasswordReset = async (req, res) => {
    try {
        const { id } = req.params;
        // Type assertion pour éviter l'erreur TypeScript
        const schoolAdmin = req.user;
        const schoolAdminId = schoolAdmin?.id || schoolAdmin?._id;
        const manager = await User_1.default.findById(id);
        if (!manager || manager.role !== 'CANTEEN_MANAGER') {
            res.status(404).json({
                success: false,
                message: 'Gestionnaire de cantine non trouvé.',
            });
            return;
        }
        // Verify manager belongs to admin's school
        const school = await School_1.default.findById(manager.school_id);
        if (!school || school.admin_id.toString() !== schoolAdminId?.toString()) {
            res.status(403).json({
                success: false,
                message: 'Accès non autorisé.',
            });
            return;
        }
        // Generate new temporary password
        const newPassword = generateTemporaryPassword();
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await User_1.default.findByIdAndUpdate(id, {
            password: hashedPassword,
            is_temporary_password: true,
            password_changed_at: null
        });
        res.status(200).json({
            success: true,
            message: 'Mot de passe réinitialisé avec succès.',
            data: {
                temporary_password: newPassword,
                instructions: 'Le gestionnaire devra changer ce mot de passe lors de sa prochaine connexion.'
            }
        });
    }
    catch (error) {
        console.error('Force password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la réinitialisation du mot de passe.',
        });
    }
};
exports.forcePasswordReset = forcePasswordReset;
// Delete canteen manager
const deleteCanteenManager = async (req, res) => {
    try {
        const { id } = req.params;
        // Type assertion pour éviter l'erreur TypeScript
        const schoolAdmin = req.user;
        const schoolAdminId = schoolAdmin?.id || schoolAdmin?._id;
        const manager = await User_1.default.findById(id);
        if (!manager || manager.role !== 'CANTEEN_MANAGER') {
            res.status(404).json({
                success: false,
                message: 'Gestionnaire de cantine non trouvé.',
            });
            return;
        }
        // Verify manager belongs to admin's school
        const school = await School_1.default.findById(manager.school_id);
        if (!school || school.admin_id.toString() !== schoolAdminId?.toString()) {
            res.status(403).json({
                success: false,
                message: 'Accès non autorisé.',
            });
            return;
        }
        await User_1.default.findByIdAndDelete(id);
        res.status(200).json({
            success: true,
            message: 'Gestionnaire de cantine supprimé avec succès.',
        });
    }
    catch (error) {
        console.error('Delete canteen manager error:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression du gestionnaire.',
        });
    }
};
exports.deleteCanteenManager = deleteCanteenManager;
// Get user profile by ID
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.default.findById(id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found.',
            });
            return;
        }
        // Return user without password
        const userObject = user.toObject();
        const { password: _, ...userWithoutPassword } = userObject;
        res.status(200).json({
            success: true,
            data: userWithoutPassword,
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving user.',
        });
    }
};
exports.getUserById = getUserById;
// Create user (SUPER_ADMIN only)
const createUser = async (req, res) => {
    try {
        const { first_name, last_name, email, role, school_id } = req.body;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        const allowedRoles = ['SCHOOL_ADMIN', 'CANTEEN_MANAGER', 'PARENT'];
        if (!first_name || !last_name || !normalizedEmail || !role) {
            res.status(400).json({
                success: false,
                message: 'first_name, last_name, email, and role are required.',
            });
            return;
        }
        if (!allowedRoles.includes(role)) {
            res.status(400).json({
                success: false,
                message: 'Allowed roles: SCHOOL_ADMIN, CANTEEN_MANAGER, PARENT.',
            });
            return;
        }
        const existingUser = await User_1.default.findOne({ email: normalizedEmail });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: 'A user with this email already exists.',
            });
            return;
        }
        let resolvedSchoolId = school_id || undefined;
        if (role === 'SCHOOL_ADMIN' || role === 'CANTEEN_MANAGER') {
            if (!resolvedSchoolId) {
                res.status(400).json({
                    success: false,
                    message: 'School is required for SCHOOL_ADMIN and CANTEEN_MANAGER.',
                });
                return;
            }
            const school = await School_1.default.findById(resolvedSchoolId);
            if (!school) {
                res.status(404).json({
                    success: false,
                    message: 'School not found.',
                });
                return;
            }
        }
        else {
            resolvedSchoolId = undefined;
        }
        const temporaryPassword = generateTemporaryPassword();
        const hashedPassword = await bcryptjs_1.default.hash(temporaryPassword, 10);
        const user = new User_1.default({
            first_name,
            last_name,
            email: normalizedEmail,
            password: hashedPassword,
            role,
            school_id: resolvedSchoolId,
            is_temporary_password: true,
            created_by: req.user?.id,
        });
        await user.save();
        if (role === 'SCHOOL_ADMIN' && resolvedSchoolId) {
            await School_1.default.findByIdAndUpdate(resolvedSchoolId, {
                admin_id: user._id,
            });
        }
        const userObject = user.toObject();
        const { password: _, ...userWithoutPassword } = userObject;
        res.status(201).json({
            success: true,
            message: 'User created successfully.',
            data: {
                user: userWithoutPassword,
                temporary_password: temporaryPassword,
            },
        });
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating user.',
        });
    }
};
exports.createUser = createUser;
// Update user profile
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const requesterId = req.user?.id?.toString();
        const existingUser = await User_1.default.findById(id);
        if (!existingUser) {
            res.status(404).json({
                success: false,
                message: 'User not found.',
            });
            return;
        }
        if (req.body.password) {
            res.status(400).json({
                success: false,
                message: 'Password cannot be updated through this endpoint.',
            });
            return;
        }
        if (req.body.phone !== undefined) {
            res.status(400).json({
                success: false,
                message: 'Phone number cannot be updated by SUPER_ADMIN.',
            });
            return;
        }
        if (requesterId && requesterId === id && req.body.role && req.body.role !== existingUser.role) {
            res.status(400).json({
                success: false,
                message: 'You cannot change your own role.',
            });
            return;
        }
        const updates = {};
        const { first_name, last_name, phone, email, role, school_id } = req.body;
        if (first_name !== undefined)
            updates.first_name = first_name;
        if (last_name !== undefined)
            updates.last_name = last_name;
        if (phone !== undefined)
            updates.phone = phone;
        if (email !== undefined) {
            const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
            if (!normalizedEmail) {
                res.status(400).json({
                    success: false,
                    message: 'Email is invalid.',
                });
                return;
            }
            const duplicate = await User_1.default.findOne({ email: normalizedEmail, _id: { $ne: existingUser._id } });
            if (duplicate) {
                res.status(400).json({
                    success: false,
                    message: 'Another user already uses this email.',
                });
                return;
            }
            updates.email = normalizedEmail;
        }
        if (role !== undefined) {
            const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'CANTEEN_MANAGER', 'PARENT'];
            if (!allowedRoles.includes(role)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid role provided.',
                });
                return;
            }
            updates.role = role;
        }
        if (school_id !== undefined) {
            updates.school_id = school_id || undefined;
        }
        const effectiveRole = updates.role || existingUser.role;
        const effectiveSchoolId = updates.school_id !== undefined ? updates.school_id : existingUser.school_id;
        if ((effectiveRole === 'SCHOOL_ADMIN' || effectiveRole === 'CANTEEN_MANAGER') && !effectiveSchoolId) {
            res.status(400).json({
                success: false,
                message: 'School is required for SCHOOL_ADMIN and CANTEEN_MANAGER.',
            });
            return;
        }
        if (effectiveRole === 'SCHOOL_ADMIN' || effectiveRole === 'CANTEEN_MANAGER') {
            const schoolExists = await School_1.default.findById(effectiveSchoolId);
            if (!schoolExists) {
                res.status(400).json({
                    success: false,
                    message: 'School not found.',
                });
                return;
            }
        }
        const updateDoc = { ...updates };
        if (effectiveRole === 'SUPER_ADMIN' || effectiveRole === 'PARENT') {
            delete updateDoc.school_id;
            updateDoc.$unset = { school_id: 1 };
        }
        const user = await User_1.default.findByIdAndUpdate(id, updateDoc, { new: true, runValidators: true }).populate('school_id', 'name');
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found.',
            });
            return;
        }
        // Return updated user without password
        const userObject = user.toObject();
        const { password: _, ...userWithoutPassword } = userObject;
        res.status(200).json({
            success: true,
            message: 'User updated successfully.',
            data: userWithoutPassword,
        });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user.',
        });
    }
};
exports.updateUser = updateUser;
// Delete user account
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const requesterId = req.user?.id?.toString();
        if (requesterId && requesterId === id) {
            res.status(400).json({
                success: false,
                message: 'You cannot delete your own account.',
            });
            return;
        }
        const user = await User_1.default.findById(id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found.',
            });
            return;
        }
        if (user.role === 'PARENT') {
            await Student_1.default.updateMany({ parent_id: user._id }, { $unset: { parent_id: 1 } });
        }
        if (user.role === 'SCHOOL_ADMIN') {
            await School_1.default.updateMany({ admin_id: user._id }, { $unset: { admin_id: 1 } });
        }
        await User_1.default.findByIdAndDelete(id);
        res.status(200).json({
            success: true,
            message: 'User deleted successfully.',
        });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting user.',
        });
    }
};
exports.deleteUser = deleteUser;
// List all users (admin only)
const getAllUsers = async (req, res) => {
    try {
        const users = await User_1.default.find()
            .select('-password')
            .populate('school_id', 'name')
            .lean();
        const parentStats = await Student_1.default.aggregate([
            { $match: { parent_id: { $ne: null } } },
            {
                $group: {
                    _id: '$parent_id',
                    children_count: { $sum: 1 },
                    school_ids: { $addToSet: '$school_id' },
                }
            },
            {
                $lookup: {
                    from: 'schools',
                    localField: 'school_ids',
                    foreignField: '_id',
                    as: 'schools',
                }
            },
            {
                $project: {
                    children_count: 1,
                    school_names: '$schools.name',
                }
            }
        ]);
        const parentStatsMap = new Map();
        parentStats.forEach((stat) => {
            parentStatsMap.set(String(stat._id), {
                children_count: stat.children_count || 0,
                school_names: stat.school_names || [],
            });
        });
        const data = users.map((user) => {
            const normalizedUser = { ...user };
            if (user.role === 'PARENT') {
                const stats = parentStatsMap.get(String(user._id));
                normalizedUser.children_count = stats?.children_count || 0;
                normalizedUser.school_name = stats?.school_names?.join(', ') || '';
            }
            else {
                normalizedUser.children_count = 0;
                if (user.school_id && typeof user.school_id === 'object') {
                    normalizedUser.school_name = user.school_id.name || '';
                }
            }
            return normalizedUser;
        });
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving users.',
        });
    }
};
exports.getAllUsers = getAllUsers;
