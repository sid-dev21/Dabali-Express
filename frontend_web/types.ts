
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  CANTEEN_MANAGER = 'CANTEEN_MANAGER'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Ajouté pour la gestion mockée
  role: UserRole;
  schoolId?: string;
  schoolName?: string;
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
  parentPhone: string;
  parentId?: string;
  schoolId: string;
  subscriptionStatus: 'active' | 'warning' | 'expired' | 'none';
  qrCode: string;
}

export interface MenuItem {
  id: string;
  schoolId: string;
  day: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi';
  mealName: string;
  description: string;
  calories?: string;
  date?: string;
  mealType?: string;
}

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  schoolId: string;
  amount: number;
  date: string;
  method: 'CASH' | 'ORANGE_MONEY' | 'MOOV_MONEY';
  status: 'completed' | 'pending';
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
