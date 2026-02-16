import { User, School, Student, Payment, MenuItem, UserRole } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type ApiResult<T = any> = {
  success: boolean;
  message: string;
  data: T;
  token: string;
};

const AUTH_PUBLIC_ENDPOINTS = ['/auth/login', '/auth/register'];

let unauthorizedEventQueued = false;

const clearStoredSession = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('current_user');
};

const dispatchUnauthorizedEvent = (endpoint: string, message: string) => {
  if (unauthorizedEventQueued) return;
  unauthorizedEventQueued = true;
  window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { endpoint, message } }));
  window.setTimeout(() => {
    unauthorizedEventQueued = false;
  }, 0);
};

const handleUnauthorized = (endpoint: string, message: string) => {
  clearStoredSession();
  dispatchUnauthorizedEvent(endpoint, message);
};

const isPublicEndpoint = (endpoint: string) =>
  AUTH_PUBLIC_ENDPOINTS.some((prefix) => endpoint.startsWith(prefix));

const parseJwtExpiry = (token: string): number | null => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
};

const isTokenExpired = (token: string): boolean => {
  const expiry = parseJwtExpiry(token);
  if (!expiry) return false;
  const now = Math.floor(Date.now() / 1000);
  return now >= (expiry - 30);
};

const isUnauthorizedError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error || '');
  return /401|non autoris|unauthorized|non authentifi/i.test(message);
};

const getStoredToken = (): string | null => {
  const directToken = localStorage.getItem('auth_token');
  if (directToken) return directToken;

  const rawUser = localStorage.getItem('current_user');
  if (!rawUser) return null;

  try {
    const parsed = JSON.parse(rawUser);
    const tokenFromUser = parsed.token;
    if (typeof tokenFromUser === 'string' && tokenFromUser.trim()) {
      localStorage.setItem('auth_token', tokenFromUser);
      return tokenFromUser;
    }
  } catch (error) {
    // Ignore malformed localStorage payloads.
  }

  return null;
};

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const requiresAuth = !isPublicEndpoint(endpoint);
  const token = requiresAuth ? getStoredToken() : null;

  if (requiresAuth && token && isTokenExpired(token)) {
    const message = 'Session expirée. Veuillez vous reconnecter.';
    handleUnauthorized(endpoint, message);
    throw new Error(message);
  }

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
  let payload: any = null;
  let rawText = '';
  if (contentType.includes('application/json')) {
    payload = await response.json();
  } else {
    rawText = await response.text();
  }

  if (!response.ok) {
    const message = payload.message || rawText || `HTTP error! status: ${response.status}`;
    if (response.status === 401) {
      handleUnauthorized(endpoint, message);
    }
    throw new Error(message);
  }

  return payload;
};

const apiFileRequest = async (endpoint: string, data: FormData) => {
  const token = getStoredToken();
  if (token && isTokenExpired(token)) {
    const message = 'Session expirée. Veuillez vous reconnecter.';
    handleUnauthorized(endpoint, message);
    throw new Error(message);
  }
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: data,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message = payload.message || `HTTP error! status: ${response.status}`;
    if (response.status === 401) {
      handleUnauthorized(endpoint, message);
    }
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

const toUserRole = (role: string): UserRole => {
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
  const schoolIdRaw = apiUser.schoolId
    || apiUser.school_id
    || apiUser.school?._id
    || apiUser.school?.id;
  const schoolId = toId(schoolIdRaw) || undefined;
  const schoolName = apiUser.schoolName || apiUser.school?.name || apiUser.school_name || apiUser.school_id?.name;

  return {
    id,
    name,
    email: apiUser.email || '',
    phone: apiUser.phone || '',
    role: toUserRole(apiUser.role),
    schoolId,
    schoolName,
    childrenCount: apiUser.children_count ?? apiUser.childrenCount ?? undefined,
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
    adminName: adminName || 'Non assigné',
    studentCount: apiSchool.studentCount || apiSchool.student_count || 0,
    status: apiSchool.status || 'active',
    lastPaymentDate: apiSchool.lastPaymentDate,
  };
};

const mapStudent = (apiStudent: any): Student => {
  const parent = apiStudent.parent_id;
  const parentId = parent ? toId(parent) : apiStudent.parent_id ? toId(apiStudent.parent_id) : undefined;
  const parentPhone = (
    parent?.phone
    || apiStudent.parentPhone
    || apiStudent.parent_phone
    || apiStudent.phone
    || parent?.email
    || ''
  );
  const rawSubscriptionStatus = String(
    apiStudent.subscriptionStatus
    || apiStudent.subscription_status
    || apiStudent.payment_status
    || apiStudent.status
    || ''
  ).toUpperCase();
  const subscriptionStatus: Student['subscriptionStatus'] =
    rawSubscriptionStatus === 'ACTIVE' || rawSubscriptionStatus === 'APPROVED'
      ? 'active'
      : rawSubscriptionStatus === 'PENDING' || rawSubscriptionStatus === 'PENDING_PAYMENT' || rawSubscriptionStatus === 'WAITING_ADMIN_VALIDATION'
        ? 'warning'
        : rawSubscriptionStatus === 'EXPIRED' || rawSubscriptionStatus === 'CANCELLED' || rawSubscriptionStatus === 'FAILED' || rawSubscriptionStatus === 'REJECTED'
          ? 'expired'
          : 'none';
  const schoolId = apiStudent.school_id ? toId(apiStudent.school_id) : '';
  const id = toId(apiStudent);

  return {
    id,
    firstName: apiStudent.first_name || apiStudent.firstName || '',
    lastName: apiStudent.last_name || apiStudent.lastName || '',
    class: apiStudent.class_name || apiStudent.class || '',
    studentCode: apiStudent.student_code || apiStudent.studentCode || undefined,
    birthDate: apiStudent.birth_date
      ? new Date(apiStudent.birth_date).toISOString().slice(0, 10)
      : apiStudent.birthDate,
    parentPhone,
    parentId,
    schoolId,
    subscriptionStatus,
    qrCode: apiStudent.qrCode || `QR_${id}`,
  };
};

const mapPayment = (apiPayment: any): Payment => {
  const rawStatus = String(apiPayment.status || '').toUpperCase();
  const status: Payment['status'] = rawStatus === 'SUCCESS' || rawStatus === 'COMPLETED'
    ? 'completed'
    : rawStatus === 'FAILED' || rawStatus === 'REFUNDED'
      ? 'failed'
      : 'pending';
  const child = apiPayment.child_id || apiPayment.child || null;
  const subscription = apiPayment.subscription_id || apiPayment.subscription || null;
  const subscriptionStudent = subscription?.student_id || subscription?.child_id || subscription?.student || null;
  const resolvedStudentId = toId(
    apiPayment.studentId
    || apiPayment.student_id
    || apiPayment.childId
    || apiPayment.child_id
    || subscriptionStudent
    || apiPayment.child?.id
    || child
  );
  const resolvedStudentName = (
    apiPayment.studentName
    || apiPayment.student_name
    || apiPayment.childName
    || apiPayment.child_name
    || apiPayment.subscriptionStudentName
    || (subscriptionStudent
      ? `${subscriptionStudent.first_name || subscriptionStudent.firstName || ''} ${subscriptionStudent.last_name || subscriptionStudent.lastName || ''}`.trim()
      : '')
    || (child
      ? `${child.first_name || child.firstName || ''} ${child.last_name || child.lastName || ''}`.trim()
      : '')
    || 'Eleve'
  );
  const date = apiPayment.paid_at || apiPayment.paidAt || apiPayment.payment_date || apiPayment.paymentDate || apiPayment.created_at || apiPayment.createdAt || new Date().toISOString();
  const parsedDate = new Date(date);
  const normalizedDate = Number.isNaN(parsedDate.getTime())
    ? new Date().toISOString().split('T')[0]
    : parsedDate.toISOString().split('T')[0];
  const resolvedSchoolId = toId(
    apiPayment.schoolId
    || apiPayment.school_id
    || apiPayment.childSchoolId
    || apiPayment.child_school_id
    || apiPayment.school?.id
    || apiPayment.school?._id
    || subscriptionStudent?.school_id
    || subscriptionStudent?.schoolId
    || child?.school_id
  );

  return {
    id: toId(apiPayment),
    studentId: resolvedStudentId,
    studentName: resolvedStudentName,
    schoolId: resolvedSchoolId,
    amount: apiPayment.amount || 0,
    date: normalizedDate,
    method: apiPayment.method || apiPayment.payment_method || 'CASH',
    status,
    rawStatus,
  };
};

const mapMenu = (apiMenu: any): MenuItem => {
  const id = toId(apiMenu);
  const rawDate = apiMenu.date || new Date().toISOString();
  // Keep menu date stable across timezones (avoid UTC midnight shifting to previous day on client)
  const normalizedDate = typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rawDate)
    ? rawDate.slice(0, 10)
    : new Date(rawDate).toISOString().slice(0, 10);

  const parseItemName = (item: any): string => {
    if (!item) return '';
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (!trimmed || trimmed === '[object Object]') return '';
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          return (parsed?.name || '').toString().trim();
        } catch {
          return trimmed;
        }
      }
      return trimmed;
    }
    if (typeof item === 'object') {
      return (item.name || '').toString().trim();
    }
    return '';
  };

  const rawItems = Array.isArray(apiMenu.items) ? apiMenu.items : [];
  const items = rawItems
    .map((item: any) => {
      const itemName = parseItemName(item);
      if (!itemName) return null;
      return { name: itemName, emoji: typeof item === 'object' ? (item.emoji || '?') : '?' };
    })
    .filter(Boolean) as Array<{ name: string; emoji?: string }>;

  const description = (apiMenu.description || '').toString().trim();
  const explicitName = (apiMenu.meal_name || apiMenu.name || apiMenu.mealName || '').toString().trim();
  const primaryDish = items[0]?.name || description || explicitName;

  return {
    id,
    schoolId: apiMenu.school_id ? toId(apiMenu.school_id) : '',
    schoolName: apiMenu.school_name || apiMenu.schoolName || apiMenu.school?.name || '',
    date: normalizedDate,
    mealType: apiMenu.meal_type || apiMenu.mealType,
    name: primaryDish,
    items,
    allergens: apiMenu.allergens || [],
    status: apiMenu.status,
    rejection_reason: apiMenu.rejection_reason,
    annual_key: apiMenu.annual_key,
    is_annual: apiMenu.is_annual,
    // Compatibilite legacy
    day: toFrenchDay(rawDate),
    mealName: primaryDish,
    description,
    calories: apiMenu.calories,
  };
};

const fetchSchools = async (): Promise<School[]> => {
  const result: ApiResult<any[]> = await apiRequest('/schools');
  return (result.data || []).map(mapSchool);
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
  login: async (email: string, password: string): Promise<{ success: boolean; data: User; message: string }> => {
    try {
      const result: ApiResult<any> = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const authToken = result.token || result.data.token;
      if (!authToken) {
        return { success: false, message: 'Token de session absent dans la reponse login.' };
      }
      localStorage.setItem('auth_token', authToken);

      const user = result.data ? mapUser(result.data) : undefined;
      const enrichedUser = user ? await enrichUserWithSchool(user) : undefined;

      if (enrichedUser) {
        localStorage.setItem('current_user', JSON.stringify({ ...enrichedUser, token: authToken }));
      }

      return { success: !!result.success, data: enrichedUser };
    } catch (error: any) {
      return { success: false, message: error.message || 'Login failed.' };
    }
  },

  register: async (userData: any): Promise<{ success: boolean; data: User; token: string; message: string }> => {
    try {
      const result: ApiResult<any> = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      const authToken = result.token || result.data.token;
      if (authToken) {
        localStorage.setItem('auth_token', authToken);
      }

      const user = result.data ? mapUser(result.data) : undefined;
      const enrichedUser = user ? await enrichUserWithSchool(user) : undefined;

      if (enrichedUser) {
        localStorage.setItem('current_user', JSON.stringify(authToken ? { ...enrichedUser, token: authToken } : enrichedUser));
      }

      return { success: !!result.success, data: enrichedUser, token: authToken };
    } catch (error: any) {
      return { success: false, message: error.message || 'Registration failed.' };
    }
  },

  registerSchool: async (data: { schoolName: string; adminName: string; email: string; password: string; city: string }): Promise<{ success: boolean; data: User; message: string }> => {
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

      const schoolPayload = schoolResult.data?.school ?? schoolResult.data;
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
      if (!result.data) return null;

      const user = mapUser(result.data);
      const enrichedUser = await enrichUserWithSchool(user);
      const currentToken = getStoredToken();
      localStorage.setItem('current_user', JSON.stringify(currentToken ? { ...enrichedUser, token: currentToken } : enrichedUser));
      return enrichedUser;
    } catch (error: any) {
      const message = error.message || '';
      const shouldClearToken = /token|non autoris|not authenticated|unauthorized/i.test(message);

      if (shouldClearToken) {
        handleUnauthorized('/auth/me', message);
      }

      return null;
    }
  },

  updateCredentials: async (payload: {
    currentPassword: string;
    newEmail?: string;
    newPassword?: string;
    confirmNewPassword?: string;
  }): Promise<{ success: boolean; data?: User; message: string }> => {
    try {
      const result: ApiResult<any> = await apiRequest('/auth/update-credentials', {
        method: 'POST',
        body: JSON.stringify({
          current_password: payload.currentPassword,
          ...(payload.newEmail !== undefined ? { new_email: payload.newEmail } : {}),
          ...(payload.newPassword !== undefined ? { new_password: payload.newPassword } : {}),
          ...(payload.confirmNewPassword !== undefined ? { confirm_new_password: payload.confirmNewPassword } : {}),
        }),
      });

      const authToken = result.token || result.data?.token || getStoredToken();
      if (authToken) {
        localStorage.setItem('auth_token', authToken);
      }

      const user = result.data ? mapUser(result.data) : undefined;
      const enrichedUser = user ? await enrichUserWithSchool(user) : undefined;

      if (enrichedUser) {
        localStorage.setItem(
          'current_user',
          JSON.stringify(authToken ? { ...enrichedUser, token: authToken } : enrichedUser)
        );
      }

      return {
        success: !!result.success,
        message: result.message || 'Identifiants mis a jour.',
        data: enrichedUser,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Echec de la mise a jour des identifiants.',
      };
    }
  },

  logout: () => {
    clearStoredSession();
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
      return result.data ? mapSchool(result.data) : null;
    } catch (error) {
      console.error('Get school error:', error);
      return null;
    }
  },

  createSchool: async (schoolData: { name: string; address: string; city: string; admin_id: string }): Promise<School | null> => {
    try {
      const result: ApiResult<any> = await apiRequest('/schools', {
        method: 'POST',
        body: JSON.stringify(schoolData),
      });
      const schoolPayload = result.data?.school ?? result.data;
      return schoolPayload ? mapSchool(schoolPayload) : null;
    } catch (error) {
      console.error('Create school error:', error);
      return null;
    }
  },

  updateSchool: async (id: string, schoolData: Partial<{ name: string; address: string; city: string; admin_id: string }>): Promise<School | null> => {
    try {
      const result: ApiResult<any> = await apiRequest(`/schools/${id}`, {
        method: 'PUT',
        body: JSON.stringify(schoolData),
      });
      return result.data ? mapSchool(result.data) : null;
    } catch (error) {
      console.error('Update school error:', error);
      throw error;
    }
  },

  deleteSchool: async (id: string): Promise<boolean> => {
    try {
      await apiRequest(`/schools/${id}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Delete school error:', error);
      throw error;
    }
  }
};

export const studentsApi = {
  getStudents: async (schoolId: string): Promise<Student[]> => {
    try {
      const endpoint = schoolId ? `/students?school_id=${schoolId}` : '/students';
      const result: ApiResult<any[]> = await apiRequest(endpoint);
      return (result.data || []).map(mapStudent);
    } catch (error) {
      console.error('Get students error:', error);
      return [];
    }
  },

  getStudentById: async (id: string): Promise<Student | null> => {
    try {
      const result: ApiResult<any> = await apiRequest(`/students/${id}`);
      return result.data ? mapStudent(result.data) : null;
    } catch (error) {
      console.error('Get student error:', error);
      return null;
    }
  },

  createStudent: async (studentData: { firstName: string; lastName: string; class: string; schoolId: string; parentId?: string; parentPhone?: string; birthDate?: string }): Promise<Student | null> => {
    try {
      const result: ApiResult<any> = await apiRequest('/students', {
        method: 'POST',
        body: JSON.stringify({
          first_name: studentData.firstName,
          last_name: studentData.lastName,
          class_name: studentData.class,
          school_id: studentData.schoolId,
          parent_id: studentData.parentId,
          birth_date: studentData.birthDate,
        }),
      });
      return result.data ? mapStudent(result.data) : null;
    } catch (error) {
      console.error('Create student error:', error);
      return null;
    }
  },

  updateStudent: async (id: string, studentData: Partial<{ firstName: string; lastName: string; class: string; parentId: string; birthDate: string }>): Promise<Student | null> => {
    try {
      const result: ApiResult<any> = await apiRequest(`/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...(studentData.firstName && { first_name: studentData.firstName }),
          ...(studentData.lastName && { last_name: studentData.lastName }),
          ...(studentData.class && { class_name: studentData.class }),
          ...(studentData.parentId && { parent_id: studentData.parentId }),
          ...(studentData.birthDate && { birth_date: studentData.birthDate }),
        }),
      });
      return result.data ? mapStudent(result.data) : null;
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
  },

  importStudentsPdf: async (file: File, schoolId: string): Promise<{ success: boolean; message: string; data: any }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (schoolId) {
        formData.append('school_id', schoolId);
      }

      const result: ApiResult<any> = await apiFileRequest('/students/import', formData);
      return { success: !!result.success, message: result.message, data: result.data };
    } catch (error: any) {
      return { success: false, message: error.message || 'Import failed.' };
    }
  }
};

export const menuApi = {
  getTodayMenu: async (schoolId: string): Promise<MenuItem | null> => {
    if (!schoolId) return null;
    try {
      const result: ApiResult<any> = await apiRequest(`/menus/today?school_id=${schoolId}`);
      return result.data ? mapMenu(result.data) : null;
    } catch (error) {
      console.error('Get today menu error:', error);
      return null;
    }
  },

  getMenus: async (schoolId: string): Promise<MenuItem[]> => {
    try {
      const endpoint = schoolId ? `/menus?school_id=${schoolId}` : '/menus';
      const result: ApiResult<any[]> = await apiRequest(endpoint);
      return (result.data || []).map(mapMenu);
    } catch (error) {
      console.error('Get menus error:', error);
      return [];
    }
  },

  createMenu: async (menuData: { schoolId: string; date: string; mealType: string; name: string; description?: string; items: Array<{ name: string; emoji?: string }>; allergens: string[] }): Promise<MenuItem | null> => {
    try {
      const normalizedItems = (menuData.items || [])
        .map((item) => item?.name?.trim())
        .filter(Boolean) as string[];
      const normalizedDescription = (menuData.description || '').trim() || normalizedItems[0] || menuData.name.trim();
      const result: ApiResult<any> = await apiRequest('/menus', {
        method: 'POST',
        body: JSON.stringify({
          school_id: menuData.schoolId,
          date: menuData.date,
          meal_type: menuData.mealType,
          meal_name: menuData.name,
          name: menuData.name,
          description: normalizedDescription,
          items: normalizedItems,
          allergens: menuData.allergens || [],
        }),
      });
      return result.data ? mapMenu(result.data) : null;
    } catch (error) {
      console.error('Create menu error:', error);
      throw error;
    }
  },

  updateMenu: async (id: string, menuData: Partial<{ date: string; mealType: string; name: string; description: string; items: Array<{ name: string; emoji?: string }>; allergens: string[] }>): Promise<MenuItem | null> => {
    try {
      const normalizedItems = menuData.items
        ? menuData.items.map((item) => item?.name?.trim()).filter(Boolean) as string[]
        : undefined;
      const normalizedDescription = menuData.description !== undefined
        ? menuData.description.trim()
        : (normalizedItems && normalizedItems.length > 0 ? normalizedItems[0] : undefined);
      const result: ApiResult<any> = await apiRequest(`/menus/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...(menuData.date && { date: menuData.date }),
          ...(menuData.mealType && { meal_type: menuData.mealType }),
          ...(menuData.name !== undefined && { meal_name: menuData.name, name: menuData.name }),
          ...(normalizedDescription !== undefined && { description: normalizedDescription }),
          ...(normalizedItems !== undefined && { items: normalizedItems }),
          ...(menuData.allergens !== undefined && { allergens: menuData.allergens }),
        }),
      });
      return result.data ? mapMenu(result.data) : null;
    } catch (error) {
      console.error('Update menu error:', error);
      throw error;
    }
  },

  deleteMenu: async (id: string): Promise<boolean> => {
    try {
      await apiRequest(`/menus/${id}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Delete menu error:', error);
      throw error;
    }
  },

  deleteWeek: async (schoolId: string | undefined, startDate: string): Promise<boolean> => {
    try {
      const params = new URLSearchParams({ start_date: startDate });
      if (schoolId) {
        params.set('school_id', schoolId);
      }
      await apiRequest(`/menus/week?${params.toString()}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Delete week menus error:', error);
      throw error;
    }
  },
  submitWeek: async (schoolId: string, startDate: string): Promise<boolean> => {
    try {
      await apiRequest('/menus/submit-week', {
        method: 'POST',
        body: JSON.stringify({ school_id: schoolId, start_date: startDate }),
      });
      return true;
    } catch (error) {
      console.error('Submit week menus error:', error);
      throw error;
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
          name: menu.name || menu.mealName || '',
          description: menu.description || '',
          items: menu.items || [],
          allergens: menu.allergens || [],
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
  getPayments: async (schoolId: string): Promise<Payment[]> => {
    try {
      const endpoint = schoolId ? `/payments?school_id=${schoolId}` : '/payments';
      const result: ApiResult<any[]> = await apiRequest(endpoint);
      return (result.data || []).map(mapPayment);
    } catch (error) {
      console.error('Get payments error:', error);
      return [];
    }
  },

  validatePayment: async (paymentId: string, status: 'COMPLETED' | 'FAILED' = 'COMPLETED'): Promise<boolean> => {
    try {
      await apiRequest(`/payments/${paymentId}/validate`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      return true;
    } catch (error) {
      console.error('Validate payment error:', error);
      return false;
    }
  }
};

export const usersApi = {
  getUsers: async (): Promise<User[]> => {
    try {
      const result: ApiResult<any[]> = await apiRequest('/users');
      return (result.data || []).map(mapUser);
    } catch (error) {
      console.error('Get users error:', error);
      throw error;
    }
  },

  createUser: async (payload: {
    first_name: string;
    last_name: string;
    email?: string;
    role: UserRole;
    school_id?: string;
  }): Promise<{ user: User | null; temporary_password: string }> => {
    try {
      const result: ApiResult<any> = await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const rawUser = result.data?.user ?? result.data;
      return {
        user: rawUser ? mapUser(rawUser) : null,
        temporary_password: result.data.temporary_password,
      };
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  },

  updateUser: async (
    id: string,
    updates: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      role: UserRole;
      school_id?: string;
    }
  ): Promise<User | null> => {
    try {
      const result: ApiResult<any> = await apiRequest(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return result.data ? mapUser(result.data) : null;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  },

  deleteUser: async (id: string): Promise<boolean> => {
    try {
      await apiRequest(`/users/${id}`, { method: 'DELETE' });
      return true;
    } catch (errorPrimary) {
      try {
        await apiRequest(`/users/${id}/delete`, { method: 'DELETE' });
        return true;
      } catch (errorFallback) {
        console.error('Delete user error:', errorFallback || errorPrimary);
        throw (errorFallback || errorPrimary);
      }
    }
  }
};

export const subscriptionsApi = {
  getSubscriptions: async (schoolId: string): Promise<any[]> => {
    try {
      const endpoint = schoolId ? `/subscriptions?school_id=${schoolId}` : '/subscriptions';
      const result: ApiResult<any[]> = await apiRequest(endpoint);
      return result.data || [];
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
  getAttendance: async (schoolId: string): Promise<any[]> => {
    try {
      const endpoint = schoolId ? `/attendance?school_id=${schoolId}` : '/attendance';
      const result: ApiResult<any[]> = await apiRequest(endpoint);
      return result.data || [];
    } catch (error) {
      console.error('Get attendance error:', error);
      return [];
    }
  },

  markAttendance: async (payload: { student_id: string; menu_id: string; present: boolean; justified: boolean; reason: string }): Promise<boolean> => {
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
  getDashboard: async (schoolId: string): Promise<any | null> => {
    try {
      const endpoint = schoolId ? `/reports/dashboard?school_id=${schoolId}` : '/reports/dashboard';
      const result: ApiResult<any> = await apiRequest(endpoint);
      return result.data || null;
    } catch (error) {
      console.error('Get dashboard report error:', error);
      return null;
    }
  }
};

export const notificationsApi = {
  getNotifications: async (unreadOnly: boolean = false): Promise<any[]> => {
    try {
      const endpoint = unreadOnly ? '/notifications?unread_only=true' : '/notifications';
      const result: ApiResult<any[]> = await apiRequest(endpoint);
      return (result.data || []).map((item: any) => {
        const normalizedId = toId(item?.id || item?._id || item);
        return {
          ...item,
          id: normalizedId,
          _id: item?._id || normalizedId,
          created_at: item?.created_at || item?.createdAt || null,
          createdAt: item?.createdAt || item?.created_at || null,
          read: !!item?.read,
        };
      }).filter((item: any) => !!item.id);
    } catch (error) {
      if (!isUnauthorizedError(error)) {
        console.error('Get notifications error:', error);
      }
      return [];
    }
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    try {
      const result: ApiResult<any> = await apiRequest('/notifications/unread-count');
      return result.data || { count: 0 };
    } catch (error) {
      if (!isUnauthorizedError(error)) {
        console.error('Get unread count error:', error);
      }
      return { count: 0 };
    }
  },

  markAsRead: async (notificationId: string | number): Promise<boolean> => {
    try {
      await apiRequest(`/notifications/${notificationId}/read`, { method: 'PUT' });
      return true;
    } catch (error) {
      if (!isUnauthorizedError(error)) {
        console.error('Mark notification as read error:', error);
      }
      return false;
    }
  },

  markAllAsRead: async (): Promise<boolean> => {
    try {
      await apiRequest('/notifications/read-all', { method: 'PUT' });
      return true;
    } catch (error) {
      if (!isUnauthorizedError(error)) {
        console.error('Mark all notifications as read error:', error);
      }
      return false;
    }
  },

  deleteNotification: async (notificationId: string | number): Promise<boolean> => {
    try {
      await apiRequest(`/notifications/${notificationId}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      if (!isUnauthorizedError(error)) {
        console.error('Delete notification error:', error);
      }
      return false;
    }
  }
};

// Generic API helpers
export const api = {
  get: async (endpoint: string) => apiRequest(endpoint),
  post: async (endpoint: string, data: any) => apiRequest(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: async (endpoint: string, data: any) => apiRequest(endpoint, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
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

