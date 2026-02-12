import { JWTPayload } from './index';
import { Document } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        email: string;
        role: string;
        first_name: string;
        last_name: string;
        is_temporary_password?: boolean;
        school_id?: string;
        password_changed_at?: Date;
        created_by?: string;
      } & JWTPayload & Document;
    }
  }
}

export {};

import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    // Add other user properties you need
  };
}