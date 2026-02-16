import React from 'react';

import { 

  LayoutDashboard, 

  School as SchoolIcon, 

  Users, 

  UserCircle, 

  Utensils, 

  CreditCard, 

  CheckCircle, 

  Settings,

  Calendar,

  UserPlus,

  Archive,

  FileText,

  History

} from 'lucide-react';

import { UserRole, Student, School } from './types';



export const COLORS = {
  primary: '#2b2a27',
  secondary: '#c9a227',
  danger: '#dc2626', // Red 600
  info: '#0f766e', // Teal 700
};



export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: [UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.CANTEEN_MANAGER] },
  { id: 'schools', label: 'Écoles', icon: <SchoolIcon size={20} />, roles: [UserRole.SUPER_ADMIN] },
  { id: 'users', label: 'Utilisateurs', icon: <Users size={20} />, roles: [UserRole.SUPER_ADMIN] },
  { id: 'canteen-managers', label: 'Gestionnaires', icon: <UserPlus size={20} />, roles: [UserRole.SCHOOL_ADMIN] },
  { id: 'students', label: 'Élèves', icon: <UserCircle size={20} />, roles: [UserRole.SCHOOL_ADMIN] },
  { id: 'menus', label: 'Menus', icon: <Utensils size={20} />, roles: [UserRole.SCHOOL_ADMIN, UserRole.CANTEEN_MANAGER, UserRole.SUPER_ADMIN] },
  { id: 'stock', label: 'Stock', icon: <Archive size={20} />, roles: [UserRole.CANTEEN_MANAGER] },
  { id: 'canteen-history', label: 'Historique', icon: <History size={20} />, roles: [UserRole.CANTEEN_MANAGER] },
  { id: 'canteen-reports', label: 'Rapports cantine', icon: <FileText size={20} />, roles: [UserRole.SCHOOL_ADMIN] },
  { id: 'school-admin-reports', label: 'Rapports écoles', icon: <FileText size={20} />, roles: [UserRole.SUPER_ADMIN] },
  { id: 'subscriptions', label: 'Abonnements', icon: <Calendar size={20} />, roles: [UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN] },
  { id: 'payments', label: 'Paiements', icon: <CreditCard size={20} />, roles: [UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN] },
  { id: 'attendance', label: 'Présences', icon: <CheckCircle size={20} />, roles: [UserRole.CANTEEN_MANAGER] },
  { id: 'settings', label: 'Paramètres', icon: <Settings size={20} />, roles: [UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.CANTEEN_MANAGER] },
];



export const MOCK_SCHOOLS: School[] = [
  { id: '1', name: 'Lycée Philippe Zinda Kaboré', address: 'Avenue de la Liberté', city: 'Ouagadougou', adminName: 'M. Kaboré Jean-Baptiste', studentCount: 1248, status: 'active' },

  { id: '2', name: 'Groupe Scolaire Horizon', address: 'Quartier Ouaga 2000', city: 'Ouagadougou', adminName: 'Mme Sawadogo Mariam', studentCount: 452, status: 'active' },

  { id: '3', name: 'École Primaire de Bobo', address: 'Secteur 25', city: 'Bobo-Dioulasso', adminName: 'M. Sanon Pierre-Marie', studentCount: 315, status: 'inactive' },

  { id: '4', name: 'Collège de Koudougou', address: 'Secteur 2', city: 'Koudougou', adminName: 'Mme Yaméogo Félicité', studentCount: 580, status: 'active' },

];



export const MOCK_STUDENTS: Student[] = [

  { id: 'S1', firstName: 'Issa', lastName: 'Ouédraogo', class: 'CM2', parentPhone: '70 12 34 56', schoolId: '1', subscriptionStatus: 'active', qrCode: 'QR-ISS-001' },

  { id: 'S2', firstName: 'Awa', lastName: 'Traoré', class: '3ème', parentPhone: '76 54 32 10', schoolId: '1', subscriptionStatus: 'expired', qrCode: 'QR-AWA-002' },

  { id: 'S3', firstName: 'Boureima', lastName: 'Cissé', class: '6ème', parentPhone: '78 90 12 34', schoolId: '2', subscriptionStatus: 'warning', qrCode: 'QR-BOU-003' },

  { id: 'S4', firstName: 'Fatoumata', lastName: 'Kabré', class: '4ème', parentPhone: '71 22 33 44', schoolId: '1', subscriptionStatus: 'active', qrCode: 'QR-FAT-004' },

  { id: 'S5', firstName: 'Abdoul', lastName: 'Zongo', class: 'CP1', parentPhone: '75 88 99 00', schoolId: '4', subscriptionStatus: 'none', qrCode: 'QR-ABD-005' },

];

