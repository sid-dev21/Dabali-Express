import { Request, Response, NextFunction } from 'express';
import { UserRole, ApiResponse } from '../types';


// Require role middleware
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Check if the user is authenticated (should be via authMiddleware)
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Non authentifié.',
      } as ApiResponse);
      return;
    }

    // 2. Check the role
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Accès refusé. Permissions insuffisantes.',
      } as ApiResponse);
      return;
    }

    // 3. Role authorized, continue    
    next();
  };
};