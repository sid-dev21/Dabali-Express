import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/generateToken';
import { ApiResponse } from '../types';

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Non authentifié. Token manquant.' } as ApiResponse);
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(401).json({ success: false, message: 'Token invalide ou expiré.' } as ApiResponse);
      return;
    }

    req.user = decoded; // ✅ reconnu maintenant
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur lors de l\'authentification.' } as ApiResponse);
  }
};
