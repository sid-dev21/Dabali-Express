"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeTemporaryPassword = exports.refreshToken = exports.logout = exports.registerSchoolAdmin = exports.updateCredentials = exports.getCurrentUser = exports.register = exports.login = void 0;
const User_1 = __importDefault(require("../models/User"));
const School_1 = __importDefault(require("../models/School"));
const hashPassword_1 = require("../utils/hashPassword");
const generateToken_1 = require("../utils/generateToken");
const validators_1 = require("../utils/validators");
const types_1 = require("../types");
const resolveSchoolInfo = async (user) => {
    let schoolId;
    let schoolName = null;
    if (user?.school_id) {
        const schoolRef = user.school_id;
        const resolvedId = schoolRef?._id || schoolRef;
        schoolId = resolvedId?.toString?.() || resolvedId?.toString?.();
        if (schoolRef?.name) {
            schoolName = schoolRef.name;
        }
        else if (schoolId) {
            const school = await School_1.default.findById(schoolId);
            schoolName = school?.name || null;
        }
        return { schoolId, schoolName };
    }
    if (user?.role === types_1.UserRole.SCHOOL_ADMIN) {
        const school = await School_1.default.findOne({ admin_id: user._id });
        if (school) {
            schoolId = school._id.toString();
            schoolName = school.name || null;
            await User_1.default.findByIdAndUpdate(user._id, { school_id: school._id });
        }
    }
    return { schoolId, schoolName };
};
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
        const { schoolId, schoolName } = await resolveSchoolInfo(user);
        // Response - Convert ObjectId to string for JSON serialization
        res.json({
            success: true,
            token,
            data: {
                id: user._id.toString(),
                email: user.email,
                role: user.role,
                first_name: user.first_name,
                last_name: user.last_name,
                schoolId,
                schoolName,
                school_id: schoolId
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
        const { email, password, role, first_name, last_name, phone, school_id } = req.body;
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
        // 7. For SCHOOL_ADMIN role, validate school_id
        if (role === types_1.UserRole.SCHOOL_ADMIN && !school_id) {
            res.status(400).json({
                success: false,
                message: 'School ID is required for School Admin role.',
            });
            return;
        }
        // 8. For SCHOOL_ADMIN role, verify school exists
        if (role === types_1.UserRole.SCHOOL_ADMIN && school_id) {
            const school = await School_1.default.findById(school_id);
            if (!school) {
                res.status(404).json({
                    success: false,
                    message: 'School not found.',
                });
                return;
            }
        }
        // 9. Hash password
        const hashedPassword = await (0, hashPassword_1.hashPassword)(password);
        // 10. Create user document with school_id for SCHOOL_ADMIN
        const user = new User_1.default({
            email,
            password: hashedPassword,
            role,
            first_name,
            last_name,
            phone,
            school_id: role === types_1.UserRole.SCHOOL_ADMIN ? school_id : undefined
        });
        await user.save();
        // 11. ✅ Generate JWT token - Convert ObjectId to string
        const token = (0, generateToken_1.generateToken)({
            id: user._id.toString(), // IMPORTANT: Convert ObjectId to string
            email: user.email,
            role: user.role,
        });
        // 12. Return response (without password)
        const userObject = user.toObject();
        const { password: _, ...userWithoutPassword } = userObject;
        // Get school name for SCHOOL_ADMIN
        let schoolName = null;
        if (role === types_1.UserRole.SCHOOL_ADMIN && user.school_id) {
            const school = await School_1.default.findById(user.school_id);
            schoolName = school?.name || null;
        }
        res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            data: {
                ...userWithoutPassword,
                _id: user._id.toString(), // Ensure _id is converted to string
                schoolId: user.school_id?.toString(),
                schoolName: schoolName,
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
        const { schoolId, schoolName } = await resolveSchoolInfo(user);
        res.status(200).json({
            success: true,
            data: {
                ...userWithoutPassword,
                _id: user._id.toString(), // Ensure _id is converted to string
                schoolId,
                schoolName,
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
 * POST /api/auth/update-credentials
 * Allows an authenticated user to update email and/or password.
 * The current password is required to secure the operation.
 */
const updateCredentials = async (req, res) => {
    try {
        if (!req.user?.id) {
            res.status(401).json({
                success: false,
                message: 'Not authenticated.',
            });
            return;
        }
        const { current_password, new_email, new_password, confirm_new_password, } = req.body;
        const normalizedCurrentPassword = typeof current_password === 'string' ? current_password : '';
        const normalizedNewEmail = typeof new_email === 'string' ? new_email.trim().toLowerCase() : '';
        const normalizedNewPassword = typeof new_password === 'string' ? new_password : '';
        const normalizedConfirmNewPassword = typeof confirm_new_password === 'string' ? confirm_new_password : '';
        const wantsEmailChange = new_email !== undefined;
        const wantsPasswordChange = new_password !== undefined || confirm_new_password !== undefined;
        if (!normalizedCurrentPassword) {
            res.status(400).json({
                success: false,
                message: 'Current password is required.',
            });
            return;
        }
        if (!wantsEmailChange && !wantsPasswordChange) {
            res.status(400).json({
                success: false,
                message: 'Provide new_email and/or new_password to update credentials.',
            });
            return;
        }
        if (wantsEmailChange) {
            if (!normalizedNewEmail || !(0, validators_1.isValidEmail)(normalizedNewEmail)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid email format.',
                });
                return;
            }
        }
        if (wantsPasswordChange) {
            if (!normalizedNewPassword || !normalizedConfirmNewPassword) {
                res.status(400).json({
                    success: false,
                    message: 'Both new password fields are required.',
                });
                return;
            }
            if (normalizedNewPassword !== normalizedConfirmNewPassword) {
                res.status(400).json({
                    success: false,
                    message: 'New password and confirmation do not match.',
                });
                return;
            }
            if (!(0, validators_1.isValidPassword)(normalizedNewPassword)) {
                res.status(400).json({
                    success: false,
                    message: 'Password must contain at least 8 characters, 1 uppercase, 1 lowercase and 1 digit.',
                });
                return;
            }
        }
        const user = await User_1.default.findById(req.user.id).select('+password');
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found.',
            });
            return;
        }
        const isCurrentPasswordValid = await (0, hashPassword_1.comparePassword)(normalizedCurrentPassword, user.password);
        if (!isCurrentPasswordValid) {
            res.status(400).json({
                success: false,
                message: 'Current password is incorrect.',
            });
            return;
        }
        const updates = {};
        if (wantsEmailChange && normalizedNewEmail !== user.email) {
            const existingUser = await User_1.default.findOne({
                email: normalizedNewEmail,
                _id: { $ne: user._id },
            });
            if (existingUser) {
                res.status(409).json({
                    success: false,
                    message: 'This email is already in use.',
                });
                return;
            }
            updates.email = normalizedNewEmail;
        }
        if (wantsPasswordChange) {
            const isSamePassword = await (0, hashPassword_1.comparePassword)(normalizedNewPassword, user.password);
            if (isSamePassword) {
                res.status(400).json({
                    success: false,
                    message: 'New password must be different from current password.',
                });
                return;
            }
            updates.password = await (0, hashPassword_1.hashPassword)(normalizedNewPassword);
            updates.is_temporary_password = false;
            updates.password_changed_at = new Date();
        }
        if (Object.keys(updates).length === 0) {
            res.status(400).json({
                success: false,
                message: 'No effective changes detected.',
            });
            return;
        }
        const updatedUser = await User_1.default.findByIdAndUpdate(req.user.id, updates, {
            new: true,
            runValidators: true,
        }).populate('school_id');
        if (!updatedUser) {
            res.status(404).json({
                success: false,
                message: 'User not found.',
            });
            return;
        }
        const { schoolId, schoolName } = await resolveSchoolInfo(updatedUser);
        const refreshedToken = (0, generateToken_1.generateToken)({
            id: updatedUser._id.toString(),
            email: updatedUser.email,
            role: updatedUser.role,
        });
        const userObject = updatedUser.toObject();
        const { password: _, ...userWithoutPassword } = userObject;
        res.status(200).json({
            success: true,
            message: 'Credentials updated successfully.',
            token: refreshedToken,
            data: {
                ...userWithoutPassword,
                _id: updatedUser._id.toString(),
                schoolId,
                schoolName,
            },
        });
    }
    catch (error) {
        console.error('Update credentials error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating credentials.',
        });
    }
};
exports.updateCredentials = updateCredentials;
/**
 * POST /api/auth/register-school-admin
 * Allows SUPER_ADMIN to create a SCHOOL_ADMIN with associated school
 * Automatically generates email and password if not provided
 *
 * @param req - Request with school and admin data
 * @param res - Response with created school and admin with credentials
 */
const registerSchoolAdmin = async (req, res) => {
    try {
        const { schoolName, schoolAddress, schoolCity, adminFirstName, adminLastName, adminPhone } = req.body;
        // 1. Validate required fields
        if (!schoolName || !adminFirstName || !adminLastName) {
            res.status(400).json({
                success: false,
                message: 'All required fields must be filled (schoolName, adminFirstName, adminLastName).',
            });
            return;
        }
        // 2. Generate automatic email if not provided
        const generateEmail = (firstName, lastName, schoolName) => {
            const cleanFirstName = firstName.toLowerCase().replace(/[^a-z]/g, '');
            const cleanLastName = lastName.toLowerCase().replace(/[^a-z]/g, '');
            const cleanSchoolName = schoolName.toLowerCase().replace(/[^a-z]/g, '').replace(/\s+/g, '');
            return `admin.${cleanFirstName}.${cleanLastName}@${cleanSchoolName}.dabali.bf`;
        };
        const adminEmail = generateEmail(adminFirstName, adminLastName, schoolName);
        // 3. Generate automatic temporary password
        const generatePassword = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
            let password = '';
            for (let i = 0; i < 12; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return password;
        };
        const adminPassword = generatePassword();
        // 4. Check if generated email already exists
        const existingAdmin = await User_1.default.findOne({ email: adminEmail });
        if (existingAdmin) {
            res.status(409).json({
                success: false,
                message: 'Generated email already exists. Please try different names.',
            });
            return;
        }
        // 5. Create school first
        const school = new School_1.default({
            name: schoolName,
            address: schoolAddress,
            city: schoolCity,
        });
        await school.save();
        // 6. Hash admin password
        const hashedPassword = await (0, hashPassword_1.hashPassword)(adminPassword);
        // 7. Create school admin
        const admin = new User_1.default({
            email: adminEmail,
            password: hashedPassword,
            role: types_1.UserRole.SCHOOL_ADMIN,
            first_name: adminFirstName,
            last_name: adminLastName,
            phone: adminPhone || null,
            school_id: school._id
        });
        await admin.save();
        // 8. Update school with admin_id
        school.admin_id = admin._id;
        await school.save();
        // 9. Generate JWT token for the new admin
        const token = (0, generateToken_1.generateToken)({
            id: admin._id.toString(),
            email: admin.email,
            role: admin.role,
        });
        // 10. Return response without passwords but with generated credentials
        const adminObject = admin.toObject();
        const { password: _, ...adminWithoutPassword } = adminObject;
        const schoolObject = school.toObject();
        res.status(201).json({
            success: true,
            message: 'School and admin created successfully with generated credentials.',
            data: {
                school: {
                    ...schoolObject,
                    _id: school._id.toString(),
                    schoolId: school._id.toString(),
                },
                admin: {
                    ...adminWithoutPassword,
                    _id: admin._id.toString(),
                    schoolId: admin.school_id?.toString(),
                    schoolName: school.name,
                },
                credentials: {
                    email: adminEmail,
                    temporaryPassword: adminPassword,
                    message: 'Please save these credentials and give them to the school admin. The admin should change the password after first login.'
                },
                token,
            },
        });
    }
    catch (error) {
        console.error('Register school admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating school and admin.',
        });
    }
};
exports.registerSchoolAdmin = registerSchoolAdmin;
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
        const userId = req.user?.id || req.user?._id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Not authenticated.',
            });
            return;
        }
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
