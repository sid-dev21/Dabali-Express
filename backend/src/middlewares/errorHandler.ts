import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';


export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  // if headers already sent, return the error to the user
  if (res.headersSent) {
    return next(err);
  }

  // Determine the status code
  const statusCode = err.statusCode || 500;

  // Send the error response
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Erreur serveur interne.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  } as ApiResponse);
};

/**
 * Middleware pour gérer les routes non trouvées (404)
 */
export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route non trouvée : ${req.method} ${req.originalUrl}`,
  } as ApiResponse);
};

