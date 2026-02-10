import { User, School, Student, Payment, MenuItem, LoginResponse } from '../types';

const API_BASE_URL = 'http://localhost:5000/api';

// Create a base fetch function with common headers
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token');
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Authentication API functions
export const authApi = {
  login: async (email: string, password: string): Promise<{ success: boolean; data?: LoginResponse; message?: string }> => {
    try {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (result.success && result.token) {
        localStorage.setItem('auth_token', result.token);
      }

      return result;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed. Please check your credentials.'
      };
    }
  },

  register: async (userData: any): Promise<{ success: boolean; data?: User; token?: string; message?: string }> => {
    try {
      const result = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      if (result.success && result.token) {
        localStorage.setItem('auth_token', result.token);
      }

      return result;
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Registration failed.'
      };
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const result = await apiRequest('/auth/me');
      return result.data || null;
    } catch (error) {
      console.error('Get current user error:', error);
      localStorage.removeItem('auth_token'); // Remove invalid token
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token');
  }
};

// Schools API functions
export const schoolsApi = {
  getSchools: async (): Promise<School[]> => {
    try {
      const result = await apiRequest('/schools');
      return result.data || [];
    } catch (error) {
      console.error('Get schools error:', error);
      return [];
    }
  },

  getSchoolById: async (id: string): Promise<School | null> => {
    try {
      const result = await apiRequest(`/schools/${id}`);
      return result.data || null;
    } catch (error) {
      console.error('Get school error:', error);
      return null;
    }
  },

  createSchool: async (schoolData: Omit<School, 'id'>): Promise<School | null> => {
    try {
      const result = await apiRequest('/schools', {
        method: 'POST',
        body: JSON.stringify(schoolData),
      });
      return result.data || null;
    } catch (error) {
      console.error('Create school error:', error);
      return null;
    }
  },

  updateSchool: async (id: string, schoolData: Partial<School>): Promise<School | null> => {
    try {
      const result = await apiRequest(`/schools/${id}`, {
        method: 'PUT',
        body: JSON.stringify(schoolData),
      });
      return result.data || null;
    } catch (error) {
      console.error('Update school error:', error);
      return null;
    }
  },

  deleteSchool: async (id: string): Promise<boolean> => {
    try {
      await apiRequest(`/schools/${id}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      console.error('Delete school error:', error);
      return false;
    }
  }
};

// Students API functions
export const studentsApi = {
  getStudents: async (schoolId?: string): Promise<Student[]> => {
    try {
      const endpoint = schoolId ? `/students/school/${schoolId}` : '/students';
      const result = await apiRequest(endpoint);
      return result.data || [];
    } catch (error) {
      console.error('Get students error:', error);
      return [];
    }
  },

  getStudentById: async (id: string): Promise<Student | null> => {
    try {
      const result = await apiRequest(`/students/${id}`);
      return result.data || null;
    } catch (error) {
      console.error('Get student error:', error);
      return null;
    }
  },

  createStudent: async (studentData: Omit<Student, 'id'>): Promise<Student | null> => {
    try {
      const result = await apiRequest('/students', {
        method: 'POST',
        body: JSON.stringify(studentData),
      });
      return result.data || null;
    } catch (error) {
      console.error('Create student error:', error);
      return null;
    }
  },

  updateStudent: async (id: string, studentData: Partial<Student>): Promise<Student | null> => {
    try {
      const result = await apiRequest(`/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(studentData),
      });
      return result.data || null;
    } catch (error) {
      console.error('Update student error:', error);
      return null;
    }
  },

  deleteStudent: async (id: string): Promise<boolean> => {
    try {
      await apiRequest(`/students/${id}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      console.error('Delete student error:', error);
      return false;
    }
  }
};

// Menu API functions
export const menuApi = {
  getMenus: async (schoolId?: string): Promise<MenuItem[]> => {
    try {
      const endpoint = schoolId ? `/menus/school/${schoolId}` : '/menus';
      const result = await apiRequest(endpoint);
      return result.data || [];
    } catch (error) {
      console.error('Get menus error:', error);
      return [];
    }
  },

  getWeeklyMenu: async (schoolId: string): Promise<MenuItem[]> => {
    try {
      const result = await apiRequest(`/menus/week/${schoolId}`);
      return result.data || [];
    } catch (error) {
      console.error('Get weekly menu error:', error);
      return [];
    }
  },

  createMenu: async (menuData: { date: string; meal_type: string; description: string; school_id: string; price?: number; status?: string; mealName?: string }): Promise<MenuItem | null> => {
    try {
      const result = await apiRequest('/menus', {
        method: 'POST',
        body: JSON.stringify(menuData),
      });
      return result.data || null;
    } catch (error) {
      console.error('Create menu error:', error);
      return null;
    }
  },

  updateMenu: async (id: string, menuData: Partial<MenuItem>): Promise<MenuItem | null> => {
    try {
      const result = await apiRequest(`/menus/${id}`, {
        method: 'PUT',
        body: JSON.stringify(menuData),
      });
      return result.data || null;
    } catch (error) {
      console.error('Update menu error:', error);
      return null;
    }
  },

  deleteMenu: async (id: string): Promise<boolean> => {
    try {
      await apiRequest(`/menus/${id}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      console.error('Delete menu error:', error);
      return false;
    }
  },

  saveMenus: async (menus: MenuItem[], schoolId?: string): Promise<boolean> => {
    try {
      // This would typically be a batch save operation
      // For now, we'll just return true to satisfy the type
      return true;
    } catch (error) {
      console.error('Save menus error:', error);
      return false;
    }
  }
};

// Payments API functions
export const paymentsApi = {
  getPayments: async (schoolId?: string): Promise<Payment[]> => {
    try {
      const endpoint = schoolId ? `/payments/school/${schoolId}` : '/payments';
      const result = await apiRequest(endpoint);
      return result.data || [];
    } catch (error) {
      console.error('Get payments error:', error);
      return [];
    }
  }
};

// Notifications API functions
export const notificationsApi = {
  getNotifications: async (unreadOnly?: boolean): Promise<any[]> => {
    try {
      const endpoint = unreadOnly ? '/notifications?unread_only=true' : '/notifications';
      const result = await apiRequest(endpoint);
      return result.data || [];
    } catch (error) {
      console.error('Get notifications error:', error);
      return [];
    }
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    try {
      const result = await apiRequest('/notifications/unread-count');
      return result.data || { count: 0 };
    } catch (error) {
      console.error('Get unread count error:', error);
      return { count: 0 };
    }
  },

  markAsRead: async (notificationId: number): Promise<boolean> => {
    try {
      await apiRequest(`/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
      return true;
    } catch (error) {
      console.error('Mark notification as read error:', error);
      return false;
    }
  },

  markAllAsRead: async (): Promise<boolean> => {
    try {
      await apiRequest('/notifications/read-all', {
        method: 'PUT',
      });
      return true;
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      return false;
    }
  }
};

// Generic API functions for backward compatibility
export const api = {
  get: async (endpoint: string) => {
    return await apiRequest(endpoint);
  },
  post: async (endpoint: string, data: any) => {
    return await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  put: async (endpoint: string, data?: any) => {
    return await apiRequest(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
  delete: async (endpoint: string) => {
    return await apiRequest(endpoint, {
      method: 'DELETE',
    });
  }
};

export default {
  authApi,
  schoolsApi,
  studentsApi,
  menuApi,
  paymentsApi
};