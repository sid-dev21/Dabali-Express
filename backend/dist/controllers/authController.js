"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeTemporaryPassword = exports.refreshToken = exports.logout = exports.getCurrentUser = exports.register = exports.login = void 0;
const User_1 = __importDefault(require("../models/User"));
const hashPassword_1 = require("../utils/hashPassword");
const generateToken_1 = require("../utils/generateToken");
const validators_1 = require("../utils/validators");
const types_1 = require("../types");
/**
 * POST /api/auth/login
 * Allows user to login and receive a JWT token
 *
 * @param req - Request with email and password in body
 * @param res - Response with token and user data
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validation
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: 'Email and password are required.',
            });
            return;
        }
        // For login, allow any email format (we'll check user role after finding the user)
        if (!email || !email.includes('@')) {
            res.status(400).json({
                success: false,
                message: 'Invalid email format.',
            });
            return;
        }
        // Search user in database
        const user = await User_1.default.findOne({ email });
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Identifiants incorrects'
            });
            return;
        }
        // Compare password
        const isMatch = await (0, hashPassword_1.comparePassword)(password, user.password);
        if (!isMatch) {
            res.status(401).json({
                success: false,
                message: 'Identifiants incorrects'
            });
            return;
        }
        // Generate JWT token - Convert ObjectId to string
        const token = (0, generateToken_1.generateToken)({
            id: user._id.toString(), // IMPORTANT: Convert ObjectId to string
            email: user.email,
            role: user.role
        });
        // Response - Convert ObjectId to string for JSON serialization
        res.json({
            success: true,
            token,
            data: {
                id: user._id.toString(),
                email: user.email,
                role: user.role,
                first_name: user.first_name,
                last_name: user.last_name
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
};
exports.login = login;
/**
 * POST /api/auth/register
 * Allows user to register a new account
 *
 * @param req - Request with registration data in body
 * @param res - Response with created user and token
 */
const register = async (req, res) => {
    try {
        const { email, password, role, first_name, last_name, phone } = req.body;
        // 1. Validation of required fields
        if (!email || !password || !role || !first_name || !last_name) {
            res.status(400).json({
                success: false,
                message: 'All required fields must be filled (email, password, role, first_name, last_name).',
            });
            return;
        }
        // 2. Validate email format
        if (!(0, validators_1.isValidEmail)(email)) {
            res.status(400).json({
                success: false,
                message: 'Invalid email format.',
            });
            return;
        }
        // 3. Validate password strength
        if (!(0, validators_1.isValidPassword)(password)) {
            res.status(400).json({
                success: false,
                message: 'Password must contain at least 8 characters, 1 uppercase, 1 lowercase and 1 digit.',
            });
            return;
        }
        // 4. Validate role enum
        if (!Object.values(types_1.UserRole).includes(role)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user role.',
            });
            return;
        }
        // 5. Check if email already exists
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            res.status(409).json({
                success: false,
                message: 'This email is already in use.',
            });
            return;
        }
        // 6. Check if only one SUPER_ADMIN exists
        if (role === types_1.UserRole.SUPER_ADMIN) {
            const existingSuperAdmin = await User_1.default.findOne({ role: types_1.UserRole.SUPER_ADMIN });
            if (existingSuperAdmin) {
                res.status(403).json({
                    success: false,
                    message: 'A Super Admin already exists. Only one is allowed.',
                });
                return;
            }
        }
        // 7. Hash password
        const hashedPassword = await (0, hashPassword_1.hashPassword)(password);
        // 8. Create user document
        const user = new User_1.default({
            email,
            password: hashedPassword,
            role,
            first_name,
            last_name,
            phone
        });
        await user.save();
        // 9. ✅ Generate JWT token - Convert ObjectId to string
        const token = (0, generateToken_1.generateToken)({
            id: user._id.toString(), // IMPORTANT: Convert ObjectId to string
            email: user.email,
            role: user.role,
        });
        // 10. Return response (without password)
        const userObject = user.toObject();
        const { password: _, ...userWithoutPassword } = userObject;
        res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            data: {
                ...userWithoutPassword,
                _id: user._id.toString(), // Ensure _id is converted to string
            },
            token,
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating account.',
        });
    }
};
exports.register = register;
/**
 * GET /api/auth/me
 * Allows user to get their own profile (requires authentication)
 * req.user is populated by authMiddleware
 *
 * @param req - Request with authenticated user
 * @param res - Response with user data
 */
const getCurrentUser = async (req, res) => {
    try {
        // req.user is defined by authMiddleware
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Not authenticated.',
            });
            return;
        }
        // Fetch fresh user data from database with school information
        const user = await User_1.default.findById(req.user.id).populate('school_id');
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
            data: {
                ...userWithoutPassword,
                _id: user._id.toString(), // Ensure _id is converted to string
                schoolId: user.school_id?._id?.toString() || user.school_id?.toString(),
                schoolName: user.school_id?.name || null,
            },
        });
    }
    catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving profile.',
        });
    }
};
exports.getCurrentUser = getCurrentUser;
/**
 * POST /api/auth/logout
 * Allows user to logout
 * In a stateless JWT implementation, logout is handled client-side by deleting the token
 * This endpoint serves as a confirmation endpoint
 *
 * @param req - Request (requires authentication)
 * @param res - Response with success message
 */
const logout = async (req, res) => {
    try {
        // In a stateless JWT implementation, logout is handled client-side
        // The token is simply deleted from the client
        // This endpoint can be used for logging out on the server side if needed
        res.status(200).json({
            success: true,
            message: 'Logout successful. Please delete the token on the client side.',
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during logout.',
        });
    }
};
exports.logout = logout;
/**
 * POST /api/auth/refresh-token
 * Optional: Refresh JWT token (useful for extending session)
 *
 * @param req - Request with user authenticated via middleware
 * @param res - Response with new token
 */
const refreshToken = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Not authenticated.',
            });
            return;
        }
        const user = await User_1.default.findById(req.user.id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found.',
            });
            return;
        }
        // ✅ Generate new JWT token
        const newToken = (0, generateToken_1.generateToken)({
            id: user._id.toString(),
            email: user.email,
            role: user.role,
        });
        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully.',
            token: newToken,
        });
    }
    catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({
            success: false,
            message: 'Error refreshing token.',
        });
    }
};
exports.refreshToken = refreshToken;
/**
 * POST /api/auth/change-temporary-password
 * Allows canteen managers to change their temporary password
 *
 * @param req - Request with current_password, new_password, and confirm_password
 * @param res - Response with success message
 */
const changeTemporaryPassword = async (req, res) => {
    try {
        const { current_password, new_password, confirm_password } = req.body;
        // Type assertion pour éviter l'erreur TypeScript
        const userId = req.user._id;
        // Validation
        if (!current_password || !new_password || !confirm_password) {
            res.status(400).json({
                success: false,
                message: 'Le mot de passe actuel, le nouveau mot de passe et la confirmation sont requis.',
            });
            return;
        }
        if (new_password !== confirm_password) {
            res.status(400).json({
                success: false,
                message: 'Le nouveau mot de passe et la confirmation ne correspondent pas.',
            });
            return;
        }
        if (!(0, validators_1.isValidPassword)(new_password)) {
            res.status(400).json({
                success: false,
                message: 'Le nouveau mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.',
            });
            return;
        }
        // Get user with password
        const user = await User_1.default.findById(userId).select('+password');
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé.',
            });
            return;
        }
        // Verify current password
        const isCurrentPasswordValid = await (0, hashPassword_1.comparePassword)(current_password, user.password);
        if (!isCurrentPasswordValid) {
            res.status(400).json({
                success: false,
                message: 'Le mot de passe actuel est incorrect.',
            });
            return;
        }
        // Hash new password
        const hashedNewPassword = await (0, hashPassword_1.hashPassword)(new_password);
        // Update password and mark as changed
        await User_1.default.findByIdAndUpdate(userId, {
            password: hashedNewPassword,
            is_temporary_password: false,
            password_changed_at: new Date()
        });
        res.status(200).json({
            success: true,
            message: 'Mot de passe changé avec succès. Vous pouvez maintenant utiliser l\'application normalement.',
        });
    }
    catch (error) {
        console.error('Change temporary password error:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du changement du mot de passe.',
        });
    }
};
exports.changeTemporaryPassword = changeTemporaryPassword;
