
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  CANTEEN_MANAGER = 'CANTEEN_MANAGER',
  PARENT = 'PARENT'
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string; // Ajouté pour la gestion mockée
  role: UserRole;
  schoolId?: string;
  schoolName?: string;
  childrenCount?: number;
  avatar?: string;
  status: 'active' | 'blocked';
  createdAt: string;
}

export interface School {
  id: string;
  name: string;
  address: string;
  city: string;
  adminId?: string;
  adminName: string;
  studentCount: number;
  status: 'active' | 'inactive';
  lastPaymentDate?: string;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  class: string;
  studentCode?: string;
  birthDate?: string;
  parentPhone: string;
  parentId?: string;
  schoolId: string;
  subscriptionStatus: 'active' | 'warning' | 'expired' | 'none';
  qrCode: string;
}

export interface MenuItem {
  id: string;
  schoolId: string;
  date?: string;
  mealType?: 'BREAKFAST' | 'LUNCH' | 'DINNER';
  name?: string;
  items?: Array<{ name: string; emoji?: string }>;
  allergens?: string[];
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
  annual_key?: string;
  is_annual?: boolean;
  schoolName?: string;
  school_name?: string;
  // Champs hérités pour compatibilité
  day?: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi';
  mealName?: string;
  description?: string;
  calories?: string;
}

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  schoolId: string;
  amount: number;
  date: string;
  method: 'CASH' | 'ORANGE_MONEY' | 'MOOV_MONEY';
  status: 'completed' | 'pending' | 'failed';
  rawStatus?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'WAITING_ADMIN_VALIDATION' | string;
}

export interface SystemSettings {
  dailyRate: number;
  monthlyRate: number;
  appName: string;
  maintenanceMode: boolean;
}

export interface LoginResponse<T = JSON> {
  success: boolean;
  message?: string;
  data?: T;
}

