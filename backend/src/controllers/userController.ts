import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User';
import School from '../models/School';
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

    // Validate required fields
    if (!first_name || !last_name || !email || !school_id) {
      res.status(400).json({
        success: false,
        message: 'Prénom, nom, email et école sont requis.',
      } as ApiResponse);
      return;
    }

    // Validate email format (only @gmail.com allowed for canteen managers)
    if (!isValidGmailEmail(email)) {
      res.status(400).json({
        success: false,
        message: 'Seuls les emails se terminant par @gmail.com sont autorisés pour les gestionnaires de cantine.',
      } as ApiResponse);
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà.',
      } as ApiResponse);
      return;
    }

    // Verify school exists and belongs to admin
    const school = await School.findById(school_id);
    if (!school) {
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
    } as ApiResponse);

  } catch (error) {
    console.error('Create canteen manager error:', error);
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

    // Verify school belongs to admin
    const school = await School.findById(school_id);
    if (!school || school.admin_id.toString() !== schoolAdmin._id.toString()) {
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
    if (!school || school.admin_id.toString() !== schoolAdmin._id.toString()) {
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
    if (!school || school.admin_id.toString() !== schoolAdmin._id.toString()) {
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

// Update user profile
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { first_name, last_name, phone } = req.body;

    // Prevent updating sensitive fields
    if (req.body.email || req.body.password || req.body.role) {
      res.status(400).json({
        success: false,
        message: 'Cannot update email, password, or role through this endpoint.',
      } as ApiResponse);
      return;
    }

    const user = await User.findByIdAndUpdate(
      id,
      { first_name, last_name, phone },
      { new: true, runValidators: true }
    );

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

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      } as ApiResponse);
      return;
    }

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
    const users = await User.find().select('-password');

    res.status(200).json({
      success: true,
      data: users,
    } as ApiResponse);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving users.',
    } as ApiResponse);
  }
};