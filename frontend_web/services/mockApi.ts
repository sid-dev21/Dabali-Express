
import { MOCK_SCHOOLS, MOCK_STUDENTS } from '../constants';
import { School, Student, Payment, User, UserRole, MenuItem, SystemSettings } from '../types';
import { simulateNetworkDelay } from '../utils/helpers';

// Configuration de la persistance locale
const STORAGE_KEYS = {
  SCHOOLS: 'dabali_schools',
  STUDENTS: 'dabali_students',
  USERS: 'dabali_users',
  USER: 'dabali_current_user',
  MENUS: 'dabali_menus',
  SETTINGS: 'dabali_settings',
  ATTENDANCE: 'dabali_attendance'
};

const DEFAULT_USERS: User[] = [
  { id: 'U1', name: 'Mme Sawadogo Mariam', email: 'mariam@ecole.bf', password: 'password123', role: UserRole.SCHOOL_ADMIN, schoolId: '1', schoolName: 'Lycée Philippe Zinda Kaboré', status: 'active', createdAt: '2023-01-15', avatar: '' },
  { id: 'U2', name: 'Alidou Barry', email: 'alidou@canteen.bf', password: 'password123', role: UserRole.CANTEEN_MANAGER, schoolId: '1', schoolName: 'Lycée Philippe Zinda Kaboré', status: 'active', createdAt: '2023-02-10', avatar: '' },
  { id: 'U3', name: 'Pierre-Marie Sanon', email: 'pierre@boboschool.bf', password: 'password123', role: UserRole.SCHOOL_ADMIN, schoolId: '3', schoolName: 'École Primaire de Bobo', status: 'blocked', createdAt: '2023-05-20', avatar: '' },
  { id: 'U-ADMIN', name: 'Superviseur Dabali', email: 'admin@dabali.bf', password: 'password123', role: UserRole.SUPER_ADMIN, status: 'active', createdAt: '2023-01-01', avatar: '' }
];

const DEFAULT_SETTINGS: SystemSettings = {
  dailyRate: 500,
  monthlyRate: 10000,
  appName: 'Dabali Express',
  maintenanceMode: false
};

const MOCK_PAYMENTS: Payment[] = [
  { id: 'P1', studentId: 'S1', studentName: 'Issa Ouédraogo', schoolId: '1', amount: 15000, date: '2023-11-01', method: 'ORANGE_MONEY', status: 'completed' },
  { id: 'P2', studentId: 'S2', studentName: 'Awa Traoré', schoolId: '1', amount: 5000, date: '2023-11-02', method: 'CASH', status: 'pending' },
  { id: 'P3', studentId: 'S3', studentName: 'Boureima Cissé', schoolId: '2', amount: 15000, date: '2023-11-03', method: 'MOOV_MONEY', status: 'completed' },
];

/**
 * MOCK API SERVICE
 * Cette couche devra être remplacée par des appels fetch/axios
 * une fois que le backend Node/Python sera déployé.
 */
export const mockApi = {
  loginWithCredentials: (email: string, pass: string, role?: UserRole): User | null => {
    const users = mockApi.getUsers();
    const user = users.find(u => {
      const matchEmail = u.email === email;
      const matchPass = u.password === pass;
      const matchRole = role ? u.role === role : true;
      return matchEmail && matchPass && matchRole;
    });

    if (user && user.status === 'active') {
      const { password, ...userWithoutPass } = user;
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userWithoutPass));
      return user;
    }
    return null;
  },

  registerSchool: (data: any): User => {
    const schools = mockApi.getSchools();
    const users = mockApi.getUsers();
    
    const newSchoolId = `SCH-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const newSchool: School = {
      id: newSchoolId,
      name: data.schoolName,
      address: 'Secteur à définir',
      city: data.city,
      adminName: data.adminName,
      studentCount: 0,
      status: 'active'
    };
    
    const newUser: User = {
      id: 'U' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      name: data.adminName,
      email: data.email,
      password: data.password,
      role: UserRole.SCHOOL_ADMIN,
      schoolId: newSchoolId,
      schoolName: data.schoolName,
      status: 'active',
      createdAt: new Date().toISOString(),
      avatar: ''
    };

    schools.push(newSchool);
    users.push(newUser);
    
    localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    
    return newUser;
  },

  getSettings: (): SystemSettings => {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  },

  saveSettings: (settings: SystemSettings) => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  getUsers: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : DEFAULT_USERS;
  },

  saveUser: (user: User) => {
    const users = mockApi.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index > -1) {
      const existingPassword = users[index].password;
      users[index] = { ...user, password: user.password || existingPassword };
    } else {
      users.push({ 
        ...user, 
        id: 'U' + Math.random().toString(36).substr(2, 5).toUpperCase(), 
        createdAt: user.createdAt || new Date().toISOString(),
        avatar: user.avatar || '',
        password: user.password || 'password123'
      });
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  getSchools: (): School[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SCHOOLS);
    return data ? JSON.parse(data) : MOCK_SCHOOLS;
  },

  saveSchool: (school: School) => {
    const schools = mockApi.getSchools();
    const index = schools.findIndex(s => s.id === school.id);
    if (index > -1) {
      schools[index] = school;
    } else {
      schools.push({ 
        ...school, 
        id: 'SCH' + Math.random().toString(36).substr(2, 5).toUpperCase() 
      });
    }
    localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
  },

  deleteSchool: (id: string) => {
    const schools = mockApi.getSchools();
    const filtered = schools.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(filtered));
  },

  getStudents: (schoolId?: string): Student[] => {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    const students = data ? JSON.parse(data) : MOCK_STUDENTS;
    return schoolId ? students.filter((s: Student) => s.schoolId === schoolId) : students;
  },

  saveStudent: (student: Student) => {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    const students = data ? JSON.parse(data) : [...MOCK_STUDENTS];
    const index = students.findIndex((s: Student) => s.id === student.id);
    if (index > -1) students[index] = student;
    else students.push({ ...student, id: 'S' + Math.random().toString(36).substr(2, 5).toUpperCase() });
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  },

  deleteStudent: (id: string) => {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    const students = data ? JSON.parse(data) : [...MOCK_STUDENTS];
    const filtered = students.filter((s: Student) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(filtered));
  },

  getMenus: (schoolId?: string): MenuItem[] => {
    const data = localStorage.getItem(STORAGE_KEYS.MENUS);
    const menus: MenuItem[] = data ? JSON.parse(data) : [];
    return schoolId ? menus.filter(m => m.schoolId === schoolId) : menus;
  },

  saveMenus: (menus: MenuItem[], schoolId: string) => {
    const allMenus = mockApi.getMenus();
    const otherSchoolsMenus = allMenus.filter(m => m.schoolId !== schoolId);
    localStorage.setItem(STORAGE_KEYS.MENUS, JSON.stringify([...otherSchoolsMenus, ...menus]));
  },

  getPayments: (schoolId?: string): Payment[] => {
    return schoolId ? MOCK_PAYMENTS.filter(p => p.schoolId === schoolId) : MOCK_PAYMENTS;
  },

  getAttendanceLogs: (schoolId?: string): any[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    const logs = data ? JSON.parse(data) : [];
    const today = new Date().toLocaleDateString();
    return logs.filter((l: any) => l.date === today && (!schoolId || l.schoolId === schoolId));
  },

  saveAttendanceLog: (log: any) => {
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    const logs = data ? JSON.parse(data) : [];
    const today = new Date().toLocaleDateString();
    logs.push({ ...log, date: today });
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(logs));
  },

  removeAttendanceLog: (logId: string) => {
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    const logs = data ? JSON.parse(data) : [];
    const filtered = logs.filter((l: any) => l.id !== logId);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(filtered));
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
};
