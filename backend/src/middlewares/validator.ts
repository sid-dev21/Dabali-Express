
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ApiResponse } from '../types';


/**
 * Middleware of validation
 * Checks the results of express-validator
 */
export const validate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: errors.array(),
    } as ApiResponse);
    return;
  }

  next();
};