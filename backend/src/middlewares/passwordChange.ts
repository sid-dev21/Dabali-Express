import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { ApiResponse } from '../types';

/**
 * Middleware to force password change for users with temporary passwords
 * This middleware should be applied to protected routes
 */
export const requirePasswordChange = (req: Request, res: Response, next: NextFunction): void => {
  // Type assertion pour éviter l'erreur TypeScript
  const user = req.user as any;

  // Check if user has temporary password
  if (user && user.is_temporary_password) {
    // If the route is already for password change, allow it
    if (req.path === '/api/auth/change-temporary-password') {
      return next();
    }

    // Block access and force password change
    res.status(403).json({
      success: false,
      message: 'Vous devez changer votre mot de passe temporaire avant de continuer.',
      error_code: 'TEMPORARY_PASSWORD_REQUIRED',
      data: {
        requires_password_change: true,
        current_user: {
          id: user._id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role
        }
      }
    } as ApiResponse);
    return;
  }

  // If no temporary password, proceed normally
  next();
};

/**
 * Middleware to check if user is canteen manager with temporary password
 * Used for login flow
 */
export const checkCanteenManagerFirstLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next();
    }

    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return next();
    }

    // Check if user is canteen manager with temporary password
    if (user.role === 'CANTEEN_MANAGER' && user.is_temporary_password) {
      const isValidPassword = await user.comparePassword(password);
      
      if (isValidPassword) {
        return res.status(200).json({
          success: true,
          message: 'Connexion réussie. Veuillez changer votre mot de passe.',
          data: {
            requires_password_change: true,
            user: {
              id: user._id,
              email: user.email,
              first_name: user.first_name,
              last_name: user.last_name,
              role: user.role
            }
          }
        } as ApiResponse);
      }
    }

    next();
  } catch (error) {
    console.error('Check canteen manager first login error:', error);
    next();
  }
};
