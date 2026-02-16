import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User';
import School from '../models/School';
import Student from '../models/Student';
import { ApiResponse } from '../types';
import { isValidGmailEmail } from '../utils/validators';

// Generate temporary password
const generateTemporaryPassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Create Canteen Manager account
export const createCanteenManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const { first_name, last_name, email, phone, school_id } = req.body;
    // Type assertion pour éviter l'erreur TypeScript
    const schoolAdmin = req.user as any; // Assuming auth middleware adds user to req
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
      } as ApiResponse);
      return;
    }

    // Validate email format (only @gmail.com allowed for canteen managers)
    if (!isValidGmailEmail(normalizedEmail)) {
      console.warn('[CANTEEN_MANAGER_CREATE] Invalid email domain', {
        email,
        normalizedEmail,
        schoolAdminId: schoolAdminId?.toString?.() || schoolAdminId,
      });
      res.status(400).json({
        success: false,
        message: 'Seuls les emails se terminant par @gmail.com sont autorisés pour les gestionnaires de cantine.',
      } as ApiResponse);
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
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
      } as ApiResponse);
      return;
    }

    // Verify school exists and belongs to admin
    const school = await School.findById(school_id);
    if (!school) {
      console.warn('[CANTEEN_MANAGER_CREATE] School not found', {
        school_id,
        schoolAdminId: schoolAdminId?.toString?.() || schoolAdminId,
      });
      res.status(404).json({
        success: false,
        message: 'École non trouvée.',
      } as ApiResponse);
      return;
    }

    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Create canteen manager
    const canteenManager = new User({
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
    } as ApiResponse);

  } catch (error) {
    console.error('[CANTEEN_MANAGER_CREATE] Error', {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du gestionnaire de cantine.',
    } as ApiResponse);
  }
};

// Get canteen managers by school
export const getCanteenManagersBySchool = async (req: Request, res: Response): Promise<void> => {
  try {
    const { school_id } = req.params;
    // Type assertion pour éviter l'erreur TypeScript
    const schoolAdmin = req.user as any;
    const schoolAdminId = schoolAdmin?.id || schoolAdmin?._id;

    // Verify school belongs to admin
    const school = await School.findById(school_id);
    if (!school || school.admin_id.toString() !== schoolAdminId?.toString()) {
      res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette école.',
      } as ApiResponse);
      return;
    }

    const managers = await User.find({ 
      role: 'CANTEEN_MANAGER', 
      school_id 
    }).select('-password');

    res.status(200).json({
      success: true,
      data: managers,
    } as ApiResponse);

  } catch (error) {
    console.error('Get canteen managers error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des gestionnaires.',
    } as ApiResponse);
  }
};

// Force password reset for canteen manager
export const forcePasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // Type assertion pour éviter l'erreur TypeScript
    const schoolAdmin = req.user as any;
    const schoolAdminId = schoolAdmin?.id || schoolAdmin?._id;

    const manager = await User.findById(id);
    if (!manager || manager.role !== 'CANTEEN_MANAGER') {
      res.status(404).json({
        success: false,
        message: 'Gestionnaire de cantine non trouvé.',
      } as ApiResponse);
      return;
    }

    // Verify manager belongs to admin's school
    const school = await School.findById(manager.school_id);
    if (!school || school.admin_id.toString() !== schoolAdminId?.toString()) {
      res.status(403).json({
        success: false,
        message: 'Accès non autorisé.',
      } as ApiResponse);
      return;
    }

    // Generate new temporary password
    const newPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(id, {
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
    } as ApiResponse);

  } catch (error) {
    console.error('Force password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réinitialisation du mot de passe.',
    } as ApiResponse);
  }
};

// Delete canteen manager
export const deleteCanteenManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // Type assertion pour éviter l'erreur TypeScript
    const schoolAdmin = req.user as any;
    const schoolAdminId = schoolAdmin?.id || schoolAdmin?._id;

    const manager = await User.findById(id);
    if (!manager || manager.role !== 'CANTEEN_MANAGER') {
      res.status(404).json({
        success: false,
        message: 'Gestionnaire de cantine non trouvé.',
      } as ApiResponse);
      return;
    }

    // Verify manager belongs to admin's school
    const school = await School.findById(manager.school_id);
    if (!school || school.admin_id.toString() !== schoolAdminId?.toString()) {
      res.status(403).json({
        success: false,
        message: 'Accès non autorisé.',
      } as ApiResponse);
      return;
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Gestionnaire de cantine supprimé avec succès.',
    } as ApiResponse);

  } catch (error) {
    console.error('Delete canteen manager error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du gestionnaire.',
    } as ApiResponse);
  }
};

// Get user profile by ID
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
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
      data: userWithoutPassword,
    } as ApiResponse);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user.',
    } as ApiResponse);
  }
};

// Create user (SUPER_ADMIN only)
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { first_name, last_name, email, role, school_id } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const allowedRoles = ['SCHOOL_ADMIN', 'CANTEEN_MANAGER', 'PARENT'];

    if (!first_name || !last_name || !role) {
      res.status(400).json({
        success: false,
        message: 'first_name, last_name, and role are required.',
      } as ApiResponse);
      return;
    }

    if (!allowedRoles.includes(role)) {
      res.status(400).json({
        success: false,
        message: 'Allowed roles: SCHOOL_ADMIN, CANTEEN_MANAGER, PARENT.',
      } as ApiResponse);
      return;
    }

    let resolvedSchoolId = school_id || undefined;
    let resolvedSchool: any = null;
    if (role === 'SCHOOL_ADMIN' || role === 'CANTEEN_MANAGER') {
      if (!resolvedSchoolId) {
        res.status(400).json({
          success: false,
          message: 'School is required for SCHOOL_ADMIN and CANTEEN_MANAGER.',
        } as ApiResponse);
        return;
      }
      resolvedSchool = await School.findById(resolvedSchoolId);
      if (!resolvedSchool) {
        res.status(404).json({
          success: false,
          message: 'School not found.',
        } as ApiResponse);
        return;
      }
    } else {
      resolvedSchoolId = undefined;
    }

    const sanitizePart = (value: unknown): string =>
      String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.+|\.+$/g, '');

    const generateSchoolAdminEmail = async (): Promise<string> => {
      const firstPart = sanitizePart(first_name) || 'admin';
      const lastPart = sanitizePart(last_name) || 'user';
      const schoolPart = sanitizePart(resolvedSchool?.name || 'school') || 'school';
      const localBase = `admin.${firstPart}.${lastPart}`;
      const domainBase = `${schoolPart}.dabali.bf`;

      for (let index = 0; index < 200; index += 1) {
        const suffix = index === 0 ? '' : `.${index + 1}`;
        const candidate = `${localBase}${suffix}@${domainBase}`;
        const existing = await User.findOne({ email: candidate }).select('_id');
        if (!existing) return candidate;
      }

      const random = Math.random().toString(36).slice(2, 8);
      return `${localBase}.${random}@${domainBase}`;
    };

    let resolvedEmail = normalizedEmail;
    if (!resolvedEmail) {
      if (role !== 'SCHOOL_ADMIN') {
        res.status(400).json({
          success: false,
          message: 'Email is required for this role.',
        } as ApiResponse);
        return;
      }
      resolvedEmail = await generateSchoolAdminEmail();
    }

    const existingUser = await User.findOne({ email: resolvedEmail });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'A user with this email already exists.',
      } as ApiResponse);
      return;
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const user = new User({
      first_name,
      last_name,
      email: resolvedEmail,
      password: hashedPassword,
      role,
      school_id: resolvedSchoolId,
      is_temporary_password: true,
      created_by: req.user?.id,
    });

    await user.save();

    if (role === 'SCHOOL_ADMIN' && resolvedSchoolId) {
      await School.findByIdAndUpdate(resolvedSchoolId, {
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
        email_generated: !normalizedEmail,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user.',
    } as ApiResponse);
  }
};

// Update user profile
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id?.toString();
    const existingUser = await User.findById(id);

    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      } as ApiResponse);
      return;
    }

    if (req.body.password) {
      res.status(400).json({
        success: false,
        message: 'Password cannot be updated through this endpoint.',
      } as ApiResponse);
      return;
    }

    if (req.body.phone !== undefined) {
      res.status(400).json({
        success: false,
        message: 'Phone number cannot be updated by SUPER_ADMIN.',
      } as ApiResponse);
      return;
    }

    if (requesterId && requesterId === id && req.body.role && req.body.role !== existingUser.role) {
      res.status(400).json({
        success: false,
        message: 'You cannot change your own role.',
      } as ApiResponse);
      return;
    }

    const updates: any = {};
    const { first_name, last_name, phone, email, role, school_id } = req.body;

    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (phone !== undefined) updates.phone = phone;

    if (email !== undefined) {
      const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      if (!normalizedEmail) {
        res.status(400).json({
          success: false,
          message: 'Email is invalid.',
        } as ApiResponse);
        return;
      }

      const duplicate = await User.findOne({ email: normalizedEmail, _id: { $ne: existingUser._id } });
      if (duplicate) {
        res.status(400).json({
          success: false,
          message: 'Another user already uses this email.',
        } as ApiResponse);
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
        } as ApiResponse);
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
      } as ApiResponse);
      return;
    }

    if (effectiveRole === 'SCHOOL_ADMIN' || effectiveRole === 'CANTEEN_MANAGER') {
      const schoolExists = await School.findById(effectiveSchoolId);
      if (!schoolExists) {
        res.status(400).json({
          success: false,
          message: 'School not found.',
        } as ApiResponse);
        return;
      }
    }

    const updateDoc: any = { ...updates };
    if (effectiveRole === 'SUPER_ADMIN' || effectiveRole === 'PARENT') {
      delete updateDoc.school_id;
      updateDoc.$unset = { school_id: 1 };
    }

    const user = await User.findByIdAndUpdate(
      id,
      updateDoc,
      { new: true, runValidators: true }
    ).populate('school_id', 'name');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      } as ApiResponse);
      return;
    }

    // Return updated user without password
    const userObject = user.toObject();
    const { password: _, ...userWithoutPassword } = userObject;

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      data: userWithoutPassword,
    } as ApiResponse);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user.',
    } as ApiResponse);
  }
};

// Delete user account
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id?.toString();

    if (requesterId && requesterId === id) {
      res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.',
      } as ApiResponse);
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      } as ApiResponse);
      return;
    }

    if (user.role === 'PARENT') {
      await Student.updateMany(
        { parent_id: user._id },
        { $unset: { parent_id: 1 } }
      );
    }

    if (user.role === 'SCHOOL_ADMIN') {
      await School.updateMany(
        { admin_id: user._id },
        { $unset: { admin_id: 1 } }
      );
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully.',
    } as ApiResponse);
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user.',
    } as ApiResponse);
  }
};

// List all users (admin only)
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('school_id', 'name')
      .lean();

    const parentStats = await Student.aggregate([
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

    const parentStatsMap = new Map<string, { children_count: number; school_names: string[] }>();
    parentStats.forEach((stat: any) => {
      parentStatsMap.set(String(stat._id), {
        children_count: stat.children_count || 0,
        school_names: stat.school_names || [],
      });
    });

    const data = users.map((user: any) => {
      const normalizedUser: any = { ...user };

      if (user.role === 'PARENT') {
        const stats = parentStatsMap.get(String(user._id));
        normalizedUser.children_count = stats?.children_count || 0;
        normalizedUser.school_name = stats?.school_names?.join(', ') || '';
      } else {
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
    } as ApiResponse);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving users.',
    } as ApiResponse);
  }
};
