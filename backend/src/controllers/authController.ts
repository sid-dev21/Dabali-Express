import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import School from '../models/School';
import { hashPassword, comparePassword } from '../utils/hashPassword';
import { generateToken } from '../utils/generateToken';
import { isValidEmail, isValidPassword } from '../utils/validators';
import { ApiResponse, RegisterDTO, LoginDTO, UserRole } from '../types';

const resolveSchoolInfo = async (user: any): Promise<{ schoolId?: string; schoolName: string | null }> => {
  let schoolId: string | undefined;
  let schoolName: string | null = null;

  if (user?.school_id) {
    const schoolRef = (user.school_id as any);
    const resolvedId = schoolRef?._id || schoolRef;
    schoolId = resolvedId?.toString?.() || resolvedId?.toString?.();
    if (schoolRef?.name) {
      schoolName = schoolRef.name;
    } else if (schoolId) {
      const school = await School.findById(schoolId);
      schoolName = school?.name || null;
    }
    return { schoolId, schoolName };
  }

  if (user?.role === UserRole.SCHOOL_ADMIN) {
    const school = await School.findOne({ admin_id: user._id });
    if (school) {
      schoolId = school._id.toString();
      schoolName = school.name || null;
      await User.findByIdAndUpdate(user._id, { school_id: school._id });
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
    const { email, password, role, first_name, last_name, phone, school_id }: RegisterDTO = req.body;

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

    // 7. For SCHOOL_ADMIN role, validate school_id
    if (role === UserRole.SCHOOL_ADMIN && !school_id) {
      res.status(400).json({
        success: false,
        message: 'School ID is required for School Admin role.',
      } as ApiResponse);
      return;
    }

    // 8. For SCHOOL_ADMIN role, verify school exists
    if (role === UserRole.SCHOOL_ADMIN && school_id) {
      const school = await School.findById(school_id);
      if (!school) {
        res.status(404).json({
          success: false,
          message: 'School not found.',
        } as ApiResponse);
        return;
      }
    }

    // 9. Hash password
    const hashedPassword = await hashPassword(password);

    // 10. Create user document with school_id for SCHOOL_ADMIN
    const user = new User({
      email,
      password: hashedPassword,
      role,
      first_name,
      last_name,
      phone,
      school_id: role === UserRole.SCHOOL_ADMIN ? school_id : undefined
    });

    await user.save();

    // 11. ✅ Generate JWT token - Convert ObjectId to string
    const token = generateToken({
      id: user._id.toString(),  // IMPORTANT: Convert ObjectId to string
      email: user.email,
      role: user.role as UserRole,
    });

    // 12. Return response (without password)
    const userObject = user.toObject();
    const { password: _, ...userWithoutPassword } = userObject;

    // Get school name for SCHOOL_ADMIN
    let schoolName = null;
    if (role === UserRole.SCHOOL_ADMIN && user.school_id) {
      const school = await School.findById(user.school_id);
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

    const { schoolId, schoolName } = await resolveSchoolInfo(user);

    res.status(200).json({
      success: true,
      data: {
        ...userWithoutPassword,
        _id: user._id.toString(), // Ensure _id is converted to string
        schoolId,
        schoolName,
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
 * POST /api/auth/register-school-admin
 * Allows SUPER_ADMIN to create a SCHOOL_ADMIN with associated school
 * Automatically generates email and password if not provided
 * 
 * @param req - Request with school and admin data
 * @param res - Response with created school and admin with credentials
 */
export const registerSchoolAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      schoolName, 
      schoolAddress, 
      schoolCity, 
      adminFirstName, 
      adminLastName,
      adminPhone 
    } = req.body;

    // 1. Validate required fields
    if (!schoolName || !adminFirstName || !adminLastName) {
      res.status(400).json({
        success: false,
        message: 'All required fields must be filled (schoolName, adminFirstName, adminLastName).',
      } as ApiResponse);
      return;
    }

    // 2. Generate automatic email if not provided
    const generateEmail = (firstName: string, lastName: string, schoolName: string): string => {
      const cleanFirstName = firstName.toLowerCase().replace(/[^a-z]/g, '');
      const cleanLastName = lastName.toLowerCase().replace(/[^a-z]/g, '');
      const cleanSchoolName = schoolName.toLowerCase().replace(/[^a-z]/g, '').replace(/\s+/g, '');
      return `admin.${cleanFirstName}.${cleanLastName}@${cleanSchoolName}.dabali.bf`;
    };

    const adminEmail = generateEmail(adminFirstName, adminLastName, schoolName);

    // 3. Generate automatic temporary password
    const generatePassword = (): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const adminPassword = generatePassword();

    // 4. Check if generated email already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      res.status(409).json({
        success: false,
        message: 'Generated email already exists. Please try different names.',
      } as ApiResponse);
      return;
    }

    // 5. Create school first
    const school = new School({
      name: schoolName,
      address: schoolAddress,
      city: schoolCity,
    });

    await school.save();

    // 6. Hash admin password
    const hashedPassword = await hashPassword(adminPassword);

    // 7. Create school admin
    const admin = new User({
      email: adminEmail,
      password: hashedPassword,
      role: UserRole.SCHOOL_ADMIN,
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
    const token = generateToken({
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role as UserRole,
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
    } as ApiResponse);
  } catch (error) {
    console.error('Register school admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating school and admin.',
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
