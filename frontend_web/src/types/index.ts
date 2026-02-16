export interface User {
  id: number;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface School {
  id: number;
  name: string;
  address?: string;
  city?: string;
  admin_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: number;
  first_name: string;
  last_name: string;
  class_name?: string;
  school_id: number;
  parent_id: number;
  photo_url?: string;
  allergies?: string[];
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: number;
  school_id: number;
  date: string;
  meal_type: string;
  meal_name?: string;
  name?: string;
  description?: string;
  items?: Array<{ name: string; emoji?: string }>;
  allergens?: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_by: number;
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  // Additional fields from API joins
  school_name?: string;
  creator_first_name?: string;
  creator_last_name?: string;
}

export interface Notification {
  id: string | number;
  _id?: string;
  user_id: string | number;
  title: string;
  message: string;
  type: 'MEAL_TAKEN' | 'MEAL_MISSED' | 'MENU_APPROVED' | 'MENU_REJECTED' | 'ABSENCE';
  related_student_id?: number;
  related_menu_id?: number;
  read: boolean;
  created_at: string;
  student_first_name?: string;
  student_last_name?: string;
  menu_description?: string;
  meal_type?: string;
}

export interface Payment {
  id: number;
  subscription_id: number;
  parent_id: number;
  amount: number;
  method: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'WAITING_ADMIN_VALIDATION';
  reference?: string;
  verification_code?: string;
  paid_at?: string;
  created_at: string;
  studentName?: string;
  schoolId?: string;
  date?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}
