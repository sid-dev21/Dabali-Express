import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';


const JWT_SECRET: string = process.env.JWT_SECRET || 'your_secret_key';
const JWT_EXPIRE: string = process.env.JWT_EXPIRE || '7d';

// Generate JWT token

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
  } as jwt.SignOptions);
};

// Verify JWT token
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};