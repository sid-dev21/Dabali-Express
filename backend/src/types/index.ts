/* TypeScript types for the backend domain */

import { ObjectId } from 'mongodb';

// Enum: fixed values for user roles

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  CANTEEN_MANAGER = 'CANTEEN_MANAGER',
  PARENT = 'PARENT',
  STUDENT = 'STUDENT',
}

export enum SubscriptionType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  TRIMESTER = 'TRIMESTER',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
}

export enum PaymentMethod {
  ORANGE_MONEY = 'ORANGE_MONEY',
  MOOV_MONEY = 'MOOV_MONEY',
  CASH = 'CASH',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum MealType {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
}

export enum MenuStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum NotificationType {
  MEAL_TAKEN = 'MEAL_TAKEN',
  MEAL_MISSED = 'MEAL_MISSED',
  MENU_APPROVED = 'MENU_APPROVED',
  MENU_REJECTED = 'MENU_REJECTED',
  ABSENCE = 'ABSENCE',
}

/* Interfaces: structures for various entities in the system */

// ✅ CORRECTED: id should be string (converted from ObjectId)
export interface User {
  _id: ObjectId;  // MongoDB's default ID field
  id?: string;    // Optional string version for convenience
  email: string;
  password: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: Date;
  updated_at: Date;
}

// Version without password field
export interface UserResponse extends Omit<User, 'password'> {}

export interface School {
  _id: ObjectId;
  id?: string;
  name: string;
  address?: string;
  city?: string;
  admin_id?: string | ObjectId;
  created_at: Date;
  updated_at: Date;
}

export interface Student {
  _id: ObjectId;
  id?: string;
  first_name: string;
  last_name: string;
  class_name?: string;
  school_id: string | ObjectId;
  parent_id: string | ObjectId;
  photo_url?: string;
  allergies?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface Menu {
  _id: ObjectId;
  id?: string;
  school_id: string | ObjectId;
  date: Date;
  meal_type: MealType;
  description?: string;
  items?: string[];
  allergens?: string[];
  status: MenuStatus;
  created_by: string | ObjectId;
  approved_by?: string | ObjectId;
  approved_at?: Date;
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Subscription {
  _id: ObjectId;
  id?: string;
  student_id: string | ObjectId;
  start_date: Date;
  end_date: Date;
  type: SubscriptionType;
  amount: number;
  status: SubscriptionStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Payment {
  _id: ObjectId;
  id?: string;
  subscription_id: string | ObjectId;
  parent_id: string | ObjectId;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference?: string;
  paid_at?: Date;
  created_at: Date;
}

export interface Attendance {
  _id: ObjectId;
  id?: string;
  student_id: string | ObjectId;
  menu_id: string | ObjectId;
  date: Date;
  present: boolean;
  justified?: boolean;
  reason?: string;
  marked_by?: string | ObjectId;
  marked_at: Date;
}

export interface Notification {
  _id: ObjectId;
  id?: string;
  user_id: string | ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  related_student_id?: string | ObjectId;
  related_menu_id?: string | ObjectId;
  read: boolean;
  created_at: Date;
}

/* DTO (Data Transfer Objects): structures for requests and responses */

export interface RegisterDTO {
  email: string;
  password: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface CreateSchoolDTO {
  name: string;
  address?: string;
  city?: string;
  admin_id?: string;
}

export interface CreateStudentDTO {
  first_name: string;
  last_name: string;
  class_name?: string;
  school_id: string;
  parent_id: string;
  photo_url?: string;
  allergies?: string[];
}

export interface CreateMenuDTO {
  school_id: string;
  date: string; // Format: YYYY-MM-DD
  meal_type: MealType;
  description?: string;
  items?: string[];
  allergens?: string[];
}

export interface ApproveMenuDTO {
  approved: boolean;
  rejection_reason?: string;
}

export interface CreateSubscriptionDTO {
  student_id: string;
  type: SubscriptionType;
  start_date: string;
  amount: number;
}

export interface CreatePaymentDTO {
  subscription_id: string;
  amount: number;
  method: PaymentMethod;
  phone?: string; // For mobile money payments
}

export interface MarkAttendanceDTO {
  student_id: string;
  menu_id: string;
  date: string;
  present: boolean;
  justified?: boolean;
  reason?: string;
}

/* Response types */

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
}

export interface PaginationResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ✅ CORRECTED: JWT payload - id should be string
export interface JWTPayload {
  id: string;  // MongoDB _id converted to string
  email: string;
  role: UserRole;
}

// Request with authenticated user
// Defined via Express module augmentation in src/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}