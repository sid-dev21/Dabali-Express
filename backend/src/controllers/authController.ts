import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { hashPassword, comparePassword } from '../utils/hashPassword';
import { generateToken } from '../utils/generateToken';
import { isValidEmail, isValidPassword } from '../utils/validators';
import { ApiResponse, RegisterDTO, LoginDTO, UserRole } from '../types';

/**
 * POST /api/auth/login
 * Allows user to login and receive a JWT token
 * 
 * @param req - Request with email and password in body
 * @param res - Response with token and user data
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginDTO = req.body;
    
    // Validation
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      } as ApiResponse);
      return;
    }

    // For login, allow any email format (we'll check user role after finding the user)
    if (!email || !email.includes('@')) {
      res.status(400).json({
        success: false,
        message: 'Invalid email format.',
      } as ApiResponse);
      return;
    }

    // Search user in database
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ 
        success: false, 
        message: 'Identifiants incorrects' 
      } as ApiResponse);
      return;
    }
    
    // Compare password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      res.status(401).json({ 
        success: false, 
        message: 'Identifiants incorrects' 
      } as ApiResponse);
      return;
    }
    
    // Generate JWT token - Convert ObjectId to string
    const token = generateToken({ 
      id: user._id.toString(),  // IMPORTANT: Convert ObjectId to string
      email: user.email,
      role: user.role as UserRole 
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
    } as ApiResponse);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    } as ApiResponse);
  }
};

/**
 * POST /api/auth/register
 * Allows user to register a new account
 * 
 * @param req - Request with registration data in body
 * @param res - Response with created user and token
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role, first_name, last_name, phone }: RegisterDTO = req.body;

    // 1. Validation of required fields
    if (!email || !password || !role || !first_name || !last_name) {
      res.status(400).json({
        success: false,
        message: 'All required fields must be filled (email, password, role, first_name, last_name).',
      } as ApiResponse);
      return;
    }

    // 2. Validate email format
    if (!isValidEmail(email)) {
      res.status(400).json({
        success: false,
        message: 'Invalid email format.',
      } as ApiResponse);
      return;
    }

    // 3. Validate password strength
    if (!isValidPassword(password)) {
      res.status(400).json({
        success: false,
        message: 'Password must contain at least 8 characters, 1 uppercase, 1 lowercase and 1 digit.',
      } as ApiResponse);
      return;
    }

    // 4. Validate role enum
    if (!Object.values(UserRole).includes(role)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user role.',
      } as ApiResponse);
      return;
    }

    // 5. Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'This email is already in use.',
      } as ApiResponse);
      return;
    }

    // 6. Check if only one SUPER_ADMIN exists
    if (role === UserRole.SUPER_ADMIN) {
      const existingSuperAdmin = await User.findOne({ role: UserRole.SUPER_ADMIN });
      if (existingSuperAdmin) {
        res.status(403).json({
          success: false,
          message: 'A Super Admin already exists. Only one is allowed.',
        } as ApiResponse);
        return;
      }
    }

    // 7. Hash password
    const hashedPassword = await hashPassword(password);

    // 8. Create user document
    const user = new User({
      email,
      password: hashedPassword,
      role,
      first_name,
      last_name,
      phone
    });

    await user.save();

    // 9. ✅ Generate JWT token - Convert ObjectId to string
    const token = generateToken({
      id: user._id.toString(),  // IMPORTANT: Convert ObjectId to string
      email: user.email,
      role: user.role as UserRole,
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
    } as ApiResponse);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating account.',
    } as ApiResponse);
  }
};

/**
 * GET /api/auth/me
 * Allows user to get their own profile (requires authentication)
 * req.user is populated by authMiddleware
 * 
 * @param req - Request with authenticated user
 * @param res - Response with user data
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // req.user is defined by authMiddleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated.',
      } as ApiResponse);
      return;
    }

    // Fetch fresh user data from database with school information
    const user = await User.findById(req.user.id).populate('school_id');
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      } as ApiResponse);
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
    } as ApiResponse);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving profile.',
    } as ApiResponse);
  }
};

/**
 * POST /api/auth/logout
 * Allows user to logout
 * In a stateless JWT implementation, logout is handled client-side by deleting the token
 * This endpoint serves as a confirmation endpoint
 * 
 * @param req - Request (requires authentication)
 * @param res - Response with success message
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // In a stateless JWT implementation, logout is handled client-side
    // The token is simply deleted from the client
    // This endpoint can be used for logging out on the server side if needed
    
    res.status(200).json({
      success: true,
      message: 'Logout successful. Please delete the token on the client side.',
    } as ApiResponse);
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout.',
    } as ApiResponse);
  }
};

/**
 * POST /api/auth/refresh-token
 * Optional: Refresh JWT token (useful for extending session)
 * 
 * @param req - Request with user authenticated via middleware
 * @param res - Response with new token
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated.',
      } as ApiResponse);
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      } as ApiResponse);
      return;
    }

    // ✅ Generate new JWT token
    const newToken = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role as UserRole,
    });

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      token: newToken,
    } as ApiResponse);
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Error refreshing token.',
    } as ApiResponse);
  }
};

/**
 * POST /api/auth/change-temporary-password
 * Allows canteen managers to change their temporary password
 * 
 * @param req - Request with current_password, new_password, and confirm_password
 * @param res - Response with success message
 */
export const changeTemporaryPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { current_password, new_password, confirm_password } = req.body;
    
    // Type assertion pour éviter l'erreur TypeScript
    const userId = (req.user as any)._id;

    // Validation
    if (!current_password || !new_password || !confirm_password) {
      res.status(400).json({
        success: false,
        message: 'Le mot de passe actuel, le nouveau mot de passe et la confirmation sont requis.',
      } as ApiResponse);
      return;
    }

    if (new_password !== confirm_password) {
      res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe et la confirmation ne correspondent pas.',
      } as ApiResponse);
      return;
    }

    if (!isValidPassword(new_password)) {
      res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.',
      } as ApiResponse);
      return;
    }

    // Get user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé.',
      } as ApiResponse);
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(current_password, user.password);
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        message: 'Le mot de passe actuel est incorrect.',
      } as ApiResponse);
      return;
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(new_password);

    // Update password and mark as changed
    await User.findByIdAndUpdate(userId, {
      password: hashedNewPassword,
      is_temporary_password: false,
      password_changed_at: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Mot de passe changé avec succès. Vous pouvez maintenant utiliser l\'application normalement.',
    } as ApiResponse);

  } catch (error) {
    console.error('Change temporary password error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement du mot de passe.',
    } as ApiResponse);
  }
};