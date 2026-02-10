/* TypeScript types for the backend domain */

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

export interface User {
  id: number;
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
  id: number;
  name: string;
  address?: string;
  city?: string;
  admin_id?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Student {
  id: number;
  first_name: string;
  last_name: string;
  class_name?: string;
  school_id: number;
  parent_id: number;
  photo_url?: string;
  allergies?: string[]; // Student allergies
  created_at: Date;
  updated_at: Date;
}


export interface Menu {
  id: number;
  school_id: number;
  date: Date;
  meal_type: MealType;
  description?: string;
  items?: string[]; // JSON array
  allergens?: string[]; // Allergens present in the menu
  status: MenuStatus;
  created_by: number;
  approved_by?: number;
  approved_at?: Date;
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Subscription {
  id: number;
  student_id: number;
  start_date: Date;
  end_date: Date;
  type: SubscriptionType;
  amount: number;
  status: SubscriptionStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Payment {
  id: number;
  subscription_id: number;
  parent_id: number;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference?: string;
  paid_at?: Date;
  created_at: Date;
}

export interface Attendance {
  id: number;
  student_id: number;
  menu_id: number;
  date: Date;
  present: boolean;
  justified?: boolean; // Whether the absence is justified
  reason?: string; // Reason for a justified absence
  marked_by?: number;
  marked_at: Date;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: NotificationType;
  related_student_id?: number;
  related_menu_id?: number;
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
  admin_id?: number;
}

export interface CreateStudentDTO {
  first_name: string;
  last_name: string;
  class_name?: string;
  school_id: number;
  parent_id: number;
  photo_url?: string;
  allergies?: string[];
} 

export interface CreateMenuDTO {
  school_id: number;
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
  student_id: number;
  type: SubscriptionType;
  start_date: string;
  amount: number;
}

export interface CreatePaymentDTO {
  subscription_id: number;
  amount: number;
  method: PaymentMethod;
  phone?: string; // For mobile money payments
}

export interface MarkAttendanceDTO {
  student_id: number;
  menu_id: number;
  date: string;
  present: boolean;
  justified?: boolean;
  reason?: string;
}

// Response types 

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

// JWT payload structure
export interface JWTPayload {
  id: number;
  email: string;
  role: UserRole;
}

// Request with authenticated user
// Defined via Express module augmentation in src/types/express.d.ts
