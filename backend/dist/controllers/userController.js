"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParentsOverview = exports.getAllUsers = exports.deleteUser = exports.updateUser = exports.getUserById = exports.deleteCanteenManager = exports.forcePasswordReset = exports.getCanteenManagersBySchool = exports.createCanteenManager = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const School_1 = __importDefault(require("../models/School"));
const Student_1 = __importDefault(require("../models/Student"));
const Subscription_1 = __importDefault(require("../models/Subscription"));
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
        // Validate required fields
        if (!first_name || !last_name || !email || !school_id) {
            res.status(400).json({
                success: false,
                message: 'Prénom, nom, email et école sont requis.',
            });
            return;
        }
        // Validate email format (only @gmail.com allowed for canteen managers)
        if (!(0, validators_1.isValidGmailEmail)(email)) {
            res.status(400).json({
                success: false,
                message: 'Seuls les emails se terminant par @gmail.com sont autorisés pour les gestionnaires de cantine.',
            });
            return;
        }
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: 'Un utilisateur avec cet email existe déjà.',
            });
            return;
        }
        // Verify school exists and belongs to admin
        const school = await School_1.default.findById(school_id);
        if (!school) {
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
            email,
            phone,
            password: hashedPassword,
            role: 'CANTEEN_MANAGER',
            school_id,
            is_temporary_password: true,
            created_by: schoolAdmin._id
        });
        await canteenManager.save();
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
        console.error('Create canteen manager error:', error);
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
        // Verify school belongs to admin
        const school = await School_1.default.findById(school_id);
        if (!school || school.admin_id.toString() !== schoolAdmin._id.toString()) {
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
        if (!school || school.admin_id.toString() !== schoolAdmin._id.toString()) {
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
        if (!school || school.admin_id.toString() !== schoolAdmin._id.toString()) {
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
// Update user profile
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, phone } = req.body;
        // Prevent updating sensitive fields
        if (req.body.email || req.body.password || req.body.role) {
            res.status(400).json({
                success: false,
                message: 'Cannot update email, password, or role through this endpoint.',
            });
            return;
        }
        const user = await User_1.default.findByIdAndUpdate(id, { first_name, last_name, phone }, { new: true, runValidators: true });
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
        const user = await User_1.default.findByIdAndDelete(id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found.',
            });
            return;
        }
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
        const users = await User_1.default.find().select('-password');
        res.status(200).json({
            success: true,
            data: users,
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
// Get parents overview with children details (SUPER_ADMIN only)
const getParentsOverview = async (req, res) => {
    try {
        const parents = await User_1.default.find({ role: 'PARENT' }).select('-password').lean();
        const parentIds = parents.map((parent) => parent._id);
        const students = await Student_1.default.find({ parent_id: { $in: parentIds } })
            .populate('school_id', 'name city')
            .lean();
        const studentIds = students.map((student) => student._id);
        const subscriptions = await Subscription_1.default.find({ student_id: { $in: studentIds } })
            .sort({ end_date: -1 })
            .lean();
        const latestSubByStudent = new Map();
        for (const subscription of subscriptions) {
            const key = subscription.student_id.toString();
            if (!latestSubByStudent.has(key)) {
                latestSubByStudent.set(key, subscription);
            }
        }
        const studentsByParent = new Map();
        for (const student of students) {
            const parentKey = student.parent_id.toString();
            if (!studentsByParent.has(parentKey)) {
                studentsByParent.set(parentKey, []);
            }
            const latestSub = latestSubByStudent.get(student._id.toString());
            const school = student.school_id;
            const subscriptionStatus = latestSub?.status || 'NONE';
            studentsByParent.get(parentKey)?.push({
                id: student._id.toString(),
                first_name: student.first_name,
                last_name: student.last_name,
                class_name: student.class_name,
                school: school ? {
                    id: school._id?.toString?.() || '',
                    name: school.name || '',
                    city: school.city || '',
                } : null,
                subscription: latestSub ? {
                    id: latestSub._id.toString(),
                    status: subscriptionStatus,
                    meal_plan: latestSub.meal_plan,
                    start_date: latestSub.start_date,
                    end_date: latestSub.end_date,
                    price: latestSub.price,
                } : null,
            });
        }
        const data = parents.map((parent) => {
            const children = studentsByParent.get(parent._id.toString()) || [];
            const activeChildren = children.filter((child) => child.subscription?.status === 'ACTIVE').length;
            return {
                id: parent._id.toString(),
                email: parent.email,
                first_name: parent.first_name,
                last_name: parent.last_name,
                phone: parent.phone,
                children_count: children.length,
                active_children_count: activeChildren,
                children,
            };
        });
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        console.error('Get parents overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving parents overview.',
        });
    }
};
exports.getParentsOverview = getParentsOverview;
