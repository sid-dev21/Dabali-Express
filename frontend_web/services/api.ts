import { User, School, Student, Payment, MenuItem, UserRole, ParentOverview } from '../types';

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
  const schoolId = apiUser.school_id ? toId(apiUser.school_id) : (apiUser.schoolId || '');
  const schoolName = apiUser.schoolName || apiUser.school?.name || '';

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
    : apiSchool.adminName || '';

  return {
    id: toId(apiSchool),
    name: apiSchool.name || '',
    address: apiSchool.address || '',
    city: apiSchool.city || '',
    adminId,
    adminName: adminName || 'Non assigne',
    studentCount: apiSchool.studentCount || 0,
    status: 'active',
    lastPaymentDate: apiSchool.lastPaymentDate,
  };
};

const mapStudent = (apiStudent: any): Student => {
  const parent = apiStudent.parent_id;
  const parentId = parent ? toId(parent) : apiStudent.parent_id ? toId(apiStudent.parent_id) : undefined;
  const parentPhone = parent?.phone || apiStudent.parentPhone || '';
  const parentName = parent ? `${parent.first_name || ''} ${parent.last_name || ''}`.trim() : '';
  const parentEmail = parent?.email || '';
  const schoolId = apiStudent.school_id ? toId(apiStudent.school_id) : '';
  const id = toId(apiStudent);

  const activeSub = apiStudent.active_subscription;
  let subscriptionStatus: Student['subscriptionStatus'] = apiStudent.subscriptionStatus || 'none';
  if (activeSub?.end_date) {
    const end = new Date(activeSub.end_date);
    const now = new Date();
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    subscriptionStatus = diffDays <= 7 ? 'warning' : 'active';
  } else if (activeSub) {
    subscriptionStatus = 'active';
  }
  return {
    id,
    firstName: apiStudent.first_name || apiStudent.firstName || '',
    lastName: apiStudent.last_name || apiStudent.lastName || '',
    class: apiStudent.class_name || apiStudent.class || '',
    parentName,
    parentEmail,
    parentPhone,
    parentId,
    schoolId,
    subscriptionStatus,
    qrCode: apiStudent.qrCode || `QR_${id}`,
  };
};

const mapPayment = (apiPayment: any): Payment => {
  const status = apiPayment.status === 'SUCCESS' || apiPayment.status === 'COMPLETED'
    ? 'completed'
    : 'pending';
  const date = apiPayment.paid_at || apiPayment.created_at || new Date().toISOString();

  const subscription = apiPayment.subscription_id || {};
  const studentObj = subscription.student_id || {};
  const studentId = toId(studentObj) || toId(apiPayment.student_id) || apiPayment.studentId || '';
  const studentName = `${studentObj.first_name || ''} ${studentObj.last_name || ''}`.trim()
    || apiPayment.studentName
    || 'Élève';

  return {
    id: toId(apiPayment),
    studentId,
    studentName,
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

const mapParentOverview = (apiParent: any): ParentOverview => {
  const children = (apiParent.children || []).map((child: any) => ({
    id: child.id || toId(child),
    firstName: child.first_name || '',
    lastName: child.last_name || '',
    className: child.class_name || '',
    schoolName: child.school?.name || '',
    schoolCity: child.school?.city || '',
    subscriptionStatus: child.subscription?.status || 'NONE',
  }));

  return {
    id: apiParent.id || toId(apiParent),
    firstName: apiParent.first_name || '',
    lastName: apiParent.last_name || '',
    email: apiParent.email || '',
    phone: apiParent.phone || '',
    childrenCount: apiParent.children_count || children.length,
    activeChildrenCount: apiParent.active_children_count || children.filter((c: any) => c.subscriptionStatus === 'ACTIVE').length,
    children,
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

    // School creation requires SUPER_ADMIN token on backend.
    // At self-registration stage, only account is created.
    return {
      success: true,
      data: registerResult.data,
      message: "Compte créé. Demandez à un Super Admin de créer/assigner l'école.",
    };
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const result: ApiResult<any> = await apiRequest('/auth/me');
      if (!result?.data) return null;

      const user = mapUser(result.data);
      const enrichedUser = await enrichUserWithSchool(user);
      localStorage.setItem('current_user', JSON.stringify(enrichedUser));
      return enrichedUser;
    } catch (error) {
      localStorage.removeItem('auth_token');
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
      return result?.data ? mapSchool(result.data) : null;
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

  createStudent: async (studentData: {
    firstName: string;
    lastName: string;
    class: string;
    schoolId: string;
    parentId?: string;
    parentPhone?: string;
    parentFirstName?: string;
    parentLastName?: string;
    parentEmail?: string;
  }): Promise<Student | null> => {
    try {
      const result: ApiResult<any> = await apiRequest('/students', {
        method: 'POST',
        body: JSON.stringify({
          first_name: studentData.firstName,
          last_name: studentData.lastName,
          class_name: studentData.class,
          school_id: studentData.schoolId,
          parent_id: studentData.parentId,
          parent_first_name: studentData.parentFirstName,
          parent_last_name: studentData.parentLastName,
          parent_phone: studentData.parentPhone,
          parent_email: studentData.parentEmail,
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

  saveMenus: async (menus: MenuItem[], schoolId: string): Promise<boolean> => {
    try {
      const today = new Date();
      const dayOrder: MenuItem['day'][] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

      const results = await Promise.all(menus.map((menu) => {
        const dayIndex = dayOrder.indexOf(menu.day);
        const menuDate = new Date(monday);
        if (dayIndex >= 0) {
          menuDate.setDate(monday.getDate() + dayIndex);
        }
        return menuApi.createMenu({
          schoolId,
          date: menuDate.toISOString().split('T')[0],
          mealType: 'LUNCH',
          description: menu.mealName || menu.description || '',
          items: menu.description ? [menu.description] : [],
        });
      }));

      return results.every((result) => !!result);
    } catch (error) {
      console.error('Save menus error:', error);
      return false;
    }
  }
};

export const paymentsApi = {
  getPayments: async (schoolId?: string): Promise<Payment[]> => {
    try {
      const result: ApiResult<any[]> = await apiRequest('/payments');
      const payments = (result?.data || []).map(mapPayment);

      if (!schoolId) return payments;

      const students = await studentsApi.getStudents(schoolId);
      const studentIds = new Set(students.map((student) => student.id));
      return payments.filter((payment) => studentIds.has(payment.studentId));
    } catch (error) {
      console.error('Get payments error:', error);
      return [];
    }
  },

  refreshPaymentStatus: async (paymentId: string): Promise<Payment | null> => {
    try {
      const result: ApiResult<any> = await apiRequest(`/payments/${paymentId}/verify`);
      return result?.data ? mapPayment(result.data) : null;
    } catch (error) {
      console.error('Refresh payment status error:', error);
      return null;
    }
  },
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

  getParentsOverview: async (): Promise<ParentOverview[]> => {
    try {
      const result: ApiResult<any[]> = await apiRequest('/users/parents-overview');
      return (result?.data || []).map(mapParentOverview);
    } catch (error) {
      console.error('Get parents overview error:', error);
      return [];
    }
  },

  createUser: async (payload: {
    email: string;
    password: string;
    role: UserRole;
    first_name: string;
    last_name: string;
    phone?: string;
  }): Promise<User | null> => {
    try {
      const result: ApiResult<any> = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return result?.data ? mapUser(result.data) : null;
    } catch (error) {
      console.error('Create user error:', error);
      return null;
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
  },

  createSubscription: async (payload: {
    studentId: string;
    planType: 'weekly' | 'monthly';
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      const startDate = new Date();
      const endDate = new Date(startDate);
      if (payload.planType === 'weekly') {
        endDate.setDate(endDate.getDate() + 6);
      } else {
        endDate.setDate(endDate.getDate() + 29);
      }

      await apiRequest('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          student_id: payload.studentId,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          meal_plan: payload.planType === 'weekly' ? 'STANDARD' : 'PREMIUM',
          price: payload.planType === 'weekly' ? 2500 : 10000,
        }),
      });
      return { success: true };
    } catch (error: any) {
      console.error('Create subscription error:', error);
      return { success: false, message: error?.message || "Impossible de créer l'abonnement." };
    }
  },
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
