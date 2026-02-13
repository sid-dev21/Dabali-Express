import { User, School, Student, Payment, MenuItem, UserRole } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type ApiResult<T = any> = {
  success?: boolean;
  message?: string;
  data?: T;
  token?: string;
};

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token');

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.message || `HTTP error! status: ${response.status}`;
    throw new Error(message);
  }

  return payload;
};

const toId = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value._id?.toString?.() || value.id?.toString?.() || '';
  return String(value);
};

const toUserRole = (role?: string): UserRole => {
  if (role && Object.values(UserRole).includes(role as UserRole)) {
    return role as UserRole;
  }
  return UserRole.CANTEEN_MANAGER;
};

const capitalize = (value: string) => value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const toFrenchDay = (dateInput: string | Date): MenuItem['day'] => {
  const date = new Date(dateInput);
  const day = date.toLocaleDateString('fr-FR', { weekday: 'long' });
  return capitalize(day) as MenuItem['day'];
};

const mapUser = (apiUser: any): User => {
  const id = toId(apiUser);
  const firstName = apiUser.first_name || '';
  const lastName = apiUser.last_name || '';
  const name = `${firstName} ${lastName}`.trim() || apiUser.name || apiUser.email || 'Utilisateur';
  const schoolId = apiUser.schoolId
    || apiUser.school_id
    || apiUser.school?._id
    || apiUser.school?.id;
  const schoolName = apiUser.schoolName || apiUser.school?.name;

  return {
    id,
    name,
    email: apiUser.email || '',
    role: toUserRole(apiUser.role),
    schoolId,
    schoolName,
    avatar: apiUser.avatar || '',
    status: 'active',
    createdAt: apiUser.created_at ? new Date(apiUser.created_at).toISOString() : new Date().toISOString(),
  };
};

const mapSchool = (apiSchool: any): School => {
  const admin = apiSchool.admin_id;
  const adminId = admin ? toId(admin) : apiSchool.admin_id ? toId(apiSchool.admin_id) : undefined;
  const adminName = admin
    ? `${admin.first_name || ''} ${admin.last_name || ''}`.trim()
    : apiSchool.adminName || apiSchool.admin_name || '';

  return {
    id: toId(apiSchool),
    name: apiSchool.name || '',
    address: apiSchool.address || '',
    city: apiSchool.city || '',
    adminId,
    adminName: adminName || 'Non assignÃ©',
    studentCount: apiSchool.studentCount || apiSchool.student_count || 0,
    status: apiSchool.status || 'active',
    lastPaymentDate: apiSchool.lastPaymentDate,
  };
};

const mapStudent = (apiStudent: any): Student => {
  const parent = apiStudent.parent_id;
  const parentId = parent ? toId(parent) : apiStudent.parent_id ? toId(apiStudent.parent_id) : undefined;
  const parentPhone = parent?.phone || apiStudent.parentPhone || '';
  const schoolId = apiStudent.school_id ? toId(apiStudent.school_id) : '';
  const id = toId(apiStudent);

  return {
    id,
    firstName: apiStudent.first_name || apiStudent.firstName || '',
    lastName: apiStudent.last_name || apiStudent.lastName || '',
    class: apiStudent.class_name || apiStudent.class || '',
    parentPhone,
    parentId,
    schoolId,
    subscriptionStatus: apiStudent.subscriptionStatus || 'none',
    qrCode: apiStudent.qrCode || `QR_${id}`,
  };
};

const mapPayment = (apiPayment: any): Payment => {
  const status = apiPayment.status === 'SUCCESS' || apiPayment.status === 'COMPLETED'
    ? 'completed'
    : 'pending';
  const date = apiPayment.paid_at || apiPayment.created_at || new Date().toISOString();

  return {
    id: toId(apiPayment),
    studentId: apiPayment.studentId || '',
    studentName: apiPayment.studentName || 'Ã‰lÃ¨ve',
    schoolId: apiPayment.schoolId || '',
    amount: apiPayment.amount || 0,
    date: new Date(date).toISOString().split('T')[0],
    method: apiPayment.method || 'CASH',
    status,
  };
};

const mapMenu = (apiMenu: any): MenuItem => {
  const id = toId(apiMenu);
  const date = apiMenu.date || new Date().toISOString();
  const mealName = apiMenu.mealName || apiMenu.description || (apiMenu.items?.[0] ?? apiMenu.meal_type ?? '');

  return {
    id,
    schoolId: apiMenu.school_id ? toId(apiMenu.school_id) : '',
    day: toFrenchDay(date),
    mealName,
    description: apiMenu.description || '',
    calories: apiMenu.calories,
    date: new Date(date).toISOString().split('T')[0],
    mealType: apiMenu.meal_type,
  };
};

const fetchSchools = async (): Promise<School[]> => {
  const result: ApiResult<any[]> = await apiRequest('/schools');
  return (result?.data || []).map(mapSchool);
};

const enrichUserWithSchool = async (user: User): Promise<User> => {
  if (!user || user.role === UserRole.SUPER_ADMIN) return user;

  try {
    // Pour le SUPER_ADMIN, on ne cherche pas d'école associée
    // Pour les autres rôles, on pourrait chercher l'école mais sans bloquer
    // Pour l'instant, on retourne l'utilisateur tel quel
    return user;
  } catch (error) {
    console.error('Error enriching user with school:', error);
  }

  return user;
};

export const authApi = {
  login: async (email: string, password: string): Promise<{ success: boolean; data?: User; message?: string }> => {
    try {
      const result: ApiResult<any> = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (result?.token) {
        localStorage.setItem('auth_token', result.token);
      }

      const user = result?.data ? mapUser(result.data) : undefined;
      const enrichedUser = user ? await enrichUserWithSchool(user) : undefined;

      if (enrichedUser) {
        localStorage.setItem('current_user', JSON.stringify(enrichedUser));
      }

      return { success: !!result?.success, data: enrichedUser };
    } catch (error: any) {
      return { success: false, message: error.message || 'Login failed.' };
    }
  },

  register: async (userData: any): Promise<{ success: boolean; data?: User; token?: string; message?: string }> => {
    try {
      const result: ApiResult<any> = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      if (result?.token) {
        localStorage.setItem('auth_token', result.token);
      }

      const user = result?.data ? mapUser(result.data) : undefined;
      const enrichedUser = user ? await enrichUserWithSchool(user) : undefined;

      if (enrichedUser) {
        localStorage.setItem('current_user', JSON.stringify(enrichedUser));
      }

      return { success: !!result?.success, data: enrichedUser, token: result?.token };
    } catch (error: any) {
      return { success: false, message: error.message || 'Registration failed.' };
    }
  },

  registerSchool: async (data: { schoolName: string; adminName: string; email: string; password: string; city: string }): Promise<{ success: boolean; data?: User; message?: string }> => {
    const [first_name, ...rest] = data.adminName.trim().split(' ').filter(Boolean);
    const last_name = rest.join(' ') || 'Admin';

    const registerResult = await authApi.register({
      email: data.email,
      password: data.password,
      role: UserRole.SCHOOL_ADMIN,
      first_name: first_name || 'Admin',
      last_name,
    });

    if (!registerResult.success || !registerResult.data) {
      return { success: false, message: registerResult.message || 'Registration failed.' };
    }

    try {
      const schoolResult: ApiResult<any> = await apiRequest('/schools', {
        method: 'POST',
        body: JSON.stringify({
          name: data.schoolName,
          city: data.city,
          admin_id: registerResult.data.id,
        }),
      });

      const schoolPayload = schoolResult?.data?.school ?? schoolResult?.data;
      if (schoolPayload) {
        const mappedSchool = mapSchool(schoolPayload);
        const enrichedUser = { ...registerResult.data, schoolId: mappedSchool.id, schoolName: mappedSchool.name };
        localStorage.setItem('current_user', JSON.stringify(enrichedUser));
        return { success: true, data: enrichedUser };
      }

      return { success: true, data: registerResult.data };
    } catch (error: any) {
      return { success: false, message: error.message || 'School creation failed.' };
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const result: ApiResult<any> = await apiRequest('/auth/me');
      if (!result?.data) return null;

      const user = mapUser(result.data);
      const enrichedUser = await enrichUserWithSchool(user);
      localStorage.setItem('current_user', JSON.stringify(enrichedUser));
      return enrichedUser;
    } catch (error: any) {
      const message = error?.message || '';
      const shouldClearToken = /token|non autoris|not authenticated|unauthorized/i.test(message);

      if (shouldClearToken) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
      }

      return null;
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
  }
};

export const schoolsApi = {
  getSchools: async (): Promise<School[]> => {
    try {
      return await fetchSchools();
    } catch (error) {
      console.error('Get schools error:', error);
      return [];
    }
  },

  getSchoolById: async (id: string): Promise<School | null> => {
    try {
      const result: ApiResult<any> = await apiRequest(`/schools/${id}`);
      return result?.data ? mapSchool(result.data) : null;
    } catch (error) {
      console.error('Get school error:', error);
      return null;
    }
  },

  createSchool: async (schoolData: { name: string; address?: string; city?: string; admin_id?: string }): Promise<School | null> => {
    try {
      const result: ApiResult<any> = await apiRequest('/schools', {
        method: 'POST',
        body: JSON.stringify(schoolData),
      });
      const schoolPayload = result?.data?.school ?? result?.data;
      return schoolPayload ? mapSchool(schoolPayload) : null;
    } catch (error) {
      console.error('Create school error:', error);
      return null;
    }
  },

  updateSchool: async (id: string, schoolData: Partial<{ name: string; address: string; city: string; admin_id?: string }>): Promise<School | null> => {
    try {
      const result: ApiResult<any> = await apiRequest(`/schools/${id}`, {
        method: 'PUT',
        body: JSON.stringify(schoolData),
      });
      return result?.data ? mapSchool(result.data) : null;
    } catch (error) {
      console.error('Update school error:', error);
      return null;
    }
  },

  deleteSchool: async (id: string): Promise<boolean> => {
    try {
      await apiRequest(`/schools/${id}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Delete school error:', error);
      return false;
    }
  }
};

export const studentsApi = {
  getStudents: async (schoolId?: string): Promise<Student[]> => {
    try {
      const endpoint = schoolId ? `/students?school_id=${schoolId}` : '/students';
      const result: ApiResult<any[]> = await apiRequest(endpoint);
      return (result?.data || []).map(mapStudent);
    } catch (error) {
      console.error('Get students error:', error);
      return [];
    }
  },

  getStudentById: async (id: string): Promise<Student | null> => {
    try {
      const result: ApiResult<any> = await apiRequest(`/students/${id}`);
      return result?.data ? mapStudent(result.data) : null;
    } catch (error) {
      console.error('Get student error:', error);
      return null;
    }
  },

  createStudent: async (studentData: { firstName: string; lastName: string; class: string; schoolId: string; parentId: string; parentPhone?: string }): Promise<Student | null> => {
    try {
      const result: ApiResult<any> = await apiRequest('/students', {
        method: 'POST',
        body: JSON.stringify({
          first_name: studentData.firstName,
          last_name: studentData.lastName,
          class_name: studentData.class,
          school_id: studentData.schoolId,
          parent_id: studentData.parentId,
        }),
      });
      return result?.data ? mapStudent(result.data) : null;
    } catch (error) {
      console.error('Create student error:', error);
      return null;
    }
  },

  updateStudent: async (id: string, studentData: Partial<{ firstName: string; lastName: string; class: string; parentId?: string }>): Promise<Student | null> => {
    try {
      const result: ApiResult<any> = await apiRequest(`/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...(studentData.firstName && { first_name: studentData.firstName }),
          ...(studentData.lastName && { last_name: studentData.lastName }),
          ...(studentData.class && { class_name: studentData.class }),
          ...(studentData.parentId && { parent_id: studentData.parentId }),
        }),
      });
      return result?.data ? mapStudent(result.data) : null;
    } catch (error) {
      console.error('Update student error:', error);
      return null;
    }
  },

  deleteStudent: async (id: string): Promise<boolean> => {
    try {
      await apiRequest(`/students/${id}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Delete student error:', error);
      return false;
    }
  }
};

export const menuApi = {
  getMenus: async (schoolId?: string): Promise<MenuItem[]> => {
    try {
      const endpoint = schoolId ? `/menus?school_id=${schoolId}` : '/menus';
      const result: ApiResult<any[]> = await apiRequest(endpoint);
      return (result?.data || []).map(mapMenu);
    } catch (error) {
      console.error('Get menus error:', error);
      return [];
    }
  },

  createMenu: async (menuData: { schoolId: string; date: string; mealType: string; description?: string; items?: string[] }): Promise<MenuItem | null> => {
    try {
      const result: ApiResult<any> = await apiRequest('/menus', {
        method: 'POST',
        body: JSON.stringify({
          school_id: menuData.schoolId,
          date: menuData.date,
          meal_type: menuData.mealType,
          description: menuData.description,
          items: menuData.items || [],
        }),
      });
      return result?.data ? mapMenu(result.data) : null;
    } catch (error) {
      console.error('Create menu error:', error);
      return null;
    }
  },

  updateMenu: async (id: string, menuData: Partial<{ date: string; mealType: string; description?: string; items?: string[] }>): Promise<MenuItem | null> => {
    try {
      const result: ApiResult<any> = await apiRequest(`/menus/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...(menuData.date && { date: menuData.date }),
          ...(menuData.mealType && { meal_type: menuData.mealType }),
          ...(menuData.description !== undefined && { description: menuData.description }),
          ...(menuData.items && { items: menuData.items }),
        }),
      });
      return result?.data ? mapMenu(result.data) : null;
    } catch (error) {
      console.error('Update menu error:', error);
      return null;
    }
  },

  deleteMenu: async (id: string): Promise<boolean> => {
    try {
      await apiRequest(`/menus/${id}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Delete menu error:', error);
      return false;
    }
  },

  deleteWeek: async (schoolId: string, startDate: string): Promise<boolean> => {
    try {
      await apiRequest(`/menus/week?school_id=${schoolId}&start_date=${startDate}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Delete week menus error:', error);
      return false;
    }
  },

  saveMenus: async (menus: MenuItem[], schoolId: string): Promise<boolean> => {
    try {
      const today = new Date();
      const dayOrder: MenuItem['day'][] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

      await Promise.all(menus.map((menu) => {
        const dayIndex = dayOrder.indexOf(menu.day);
        const menuDate = new Date(monday);
        if (dayIndex >= 0) {
          menuDate.setDate(monday.getDate() + dayIndex);
        }
        const payload = {
          schoolId,
          date: menuDate.toISOString().split('T')[0],
          mealType: menu.mealType || 'LUNCH',
          description: menu.mealName || menu.description || '',
          items: menu.description ? [menu.description] : [],
        };
        const isPersisted = typeof menu.id === 'string' && /^[a-f0-9]{24}$/i.test(menu.id);
        return isPersisted
          ? menuApi.updateMenu(menu.id, payload)
          : menuApi.createMenu(payload);
      }));

      return true;
    } catch (error) {
      console.error('Save menus error:', error);
      return false;
    }
  }
};

export const paymentsApi = {
  getPayments: async (_schoolId?: string): Promise<Payment[]> => {
    try {
      const result: ApiResult<any[]> = await apiRequest('/payments');
      return (result?.data || []).map(mapPayment);
    } catch (error) {
      console.error('Get payments error:', error);
      return [];
    }
  }
};

export const usersApi = {
  getUsers: async (): Promise<User[]> => {
    try {
      const result: ApiResult<any[]> = await apiRequest('/users');
      return (result?.data || []).map(mapUser);
    } catch (error) {
      console.error('Get users error:', error);
      return [];
    }
  },

  updateUser: async (id: string, updates: { first_name?: string; last_name?: string; phone?: string }): Promise<User | null> => {
    try {
      const result: ApiResult<any> = await apiRequest(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return result?.data ? mapUser(result.data) : null;
    } catch (error) {
      console.error('Update user error:', error);
      return null;
    }
  },

  deleteUser: async (id: string): Promise<boolean> => {
    try {
      await apiRequest(`/users/${id}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Delete user error:', error);
      return false;
    }
  }
};

export const subscriptionsApi = {
  getSubscriptions: async (): Promise<any[]> => {
    try {
      const result: ApiResult<any[]> = await apiRequest('/subscriptions');
      return result?.data || [];
    } catch (error) {
      console.error('Get subscriptions error:', error);
      return [];
    }
  },

  updateSubscriptionStatus: async (id: string, status: string): Promise<boolean> => {
    try {
      await apiRequest(`/subscriptions/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      return true;
    } catch (error) {
      console.error('Update subscription status error:', error);
      return false;
    }
  }
};

export const attendanceApi = {
  getAttendance: async (schoolId?: string): Promise<any[]> => {
    try {
      const endpoint = schoolId ? `/attendance?school_id=${schoolId}` : '/attendance';
      const result: ApiResult<any[]> = await apiRequest(endpoint);
      return result?.data || [];
    } catch (error) {
      console.error('Get attendance error:', error);
      return [];
    }
  },

  markAttendance: async (payload: { student_id: string; menu_id: string; present: boolean; justified?: boolean; reason?: string }): Promise<boolean> => {
    try {
      await apiRequest('/attendance/mark', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return true;
    } catch (error) {
      console.error('Mark attendance error:', error);
      return false;
    }
  }
};

export const reportsApi = {
  getDashboard: async (schoolId?: string): Promise<any | null> => {
    try {
      const endpoint = schoolId ? `/reports/dashboard?school_id=${schoolId}` : '/reports/dashboard';
      const result: ApiResult<any> = await apiRequest(endpoint);
      return result?.data || null;
    } catch (error) {
      console.error('Get dashboard report error:', error);
      return null;
    }
  }
};

export const notificationsApi = {
  getNotifications: async (unreadOnly?: boolean): Promise<any[]> => {
    try {
      const endpoint = unreadOnly ? '/notifications?unread_only=true' : '/notifications';
      const result: ApiResult<any[]> = await apiRequest(endpoint);
      return result?.data || [];
    } catch (error) {
      console.error('Get notifications error:', error);
      return [];
    }
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    try {
      const result: ApiResult<any> = await apiRequest('/notifications/unread-count');
      return result?.data || { count: 0 };
    } catch (error) {
      console.error('Get unread count error:', error);
      return { count: 0 };
    }
  },

  markAsRead: async (notificationId: number): Promise<boolean> => {
    try {
      await apiRequest(`/notifications/${notificationId}/read`, { method: 'PUT' });
      return true;
    } catch (error) {
      console.error('Mark notification as read error:', error);
      return false;
    }
  },

  markAllAsRead: async (): Promise<boolean> => {
    try {
      await apiRequest('/notifications/read-all', { method: 'PUT' });
      return true;
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      return false;
    }
  }
};

// Generic API helpers
export const api = {
  get: async (endpoint: string) => apiRequest(endpoint),
  post: async (endpoint: string, data: any) => apiRequest(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: async (endpoint: string, data?: any) => apiRequest(endpoint, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  delete: async (endpoint: string) => apiRequest(endpoint, { method: 'DELETE' }),
};

export default {
  authApi,
  schoolsApi,
  studentsApi,
  menuApi,
  paymentsApi,
  usersApi,
  subscriptionsApi,
  attendanceApi,
  reportsApi,
  notificationsApi,
};
