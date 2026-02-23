import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, School as SchoolIcon, TrendingUp, Users, Utensils, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { UserRole, Student, Payment, School, MenuItem } from '../types';
import { attendanceApi, menuApi, paymentsApi, schoolsApi, studentsApi, subscriptionsApi } from '../services/api';

interface DashboardProps {
  searchQuery?: string;
  userRole: UserRole;
  schoolId?: string;
  onNavigateTab?: (tab: string) => void;
}

type Activity = {
  id: string;
  user: string;
  action: string;
  time: string;
  amount?: string;
  timestamp: string;
};

type SubLite = {
  id: string;
  childId: string;
  schoolId: string;
  status: string;
  amount: number;
  startDate: string;
};

const toLocalDateKey = (value: string | Date): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toMonthKey = (value: string | Date): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const toId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const fromFields = source._id || source.id;
    if (fromFields) return String(fromFields);
    const fromToString = (value as { toString?: () => string }).toString?.();
    if (fromToString && fromToString !== '[object Object]') return String(fromToString);
    return '';
  }
  return String(value);
};

const toMenuPrimaryDishLabel = (menu: MenuItem | null): string => {
  if (!menu) return '';
  const itemNames = (menu.items || []).map((item) => item.name?.trim()).filter(Boolean) as string[];
  if (itemNames.length > 0) return itemNames[0];
  const description = (menu.description || '').trim();
  if (description) return description;
  return (menu.mealName || menu.name || '').trim();
};

const normalizeSubscription = (raw: any): SubLite => {
  const child = raw?.child || raw?.child_id || {};
  const start = raw?.start_date || raw?.startDate || raw?.created_at || raw?.createdAt || new Date().toISOString();
  const parsed = new Date(start);
  return {
    id: toId(raw),
    childId: toId(raw?.childId || raw?.child_id || raw?.studentId || raw?.student_id || child),
    schoolId: toId(raw?.school_id || raw?.schoolId || child?.school_id || child?.schoolId),
    status: String(raw?.status || '').toUpperCase(),
    amount: Number(raw?.amount || 0),
    startDate: Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString(),
  };
};

const isActiveSub = (status: string): boolean => ['ACTIVE', 'COMPLETED', 'APPROVED'].includes(status);
const formatFcfa = (value: number): string => `${Math.round(value || 0).toLocaleString('fr-FR')} FCFA`;
const formatCompactFcfa = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M FCFA`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K FCFA`;
  return formatFcfa(value);
};
const pctChange = (current: number, previous: number): number => (previous <= 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100);
const pctLabel = (value: number): string => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
const parseAnyDate = (value: any): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const hasTimePrecision = (value: string): boolean => /T\d{2}:\d{2}/.test(value);

const Dashboard: React.FC<DashboardProps> = ({ searchQuery = '', userRole, schoolId, onNavigateTab }) => {
  const isSuperAdmin = userRole === UserRole.SUPER_ADMIN;
  const isSchoolAdmin = userRole === UserRole.SCHOOL_ADMIN;
  const isCanteenManager = userRole === UserRole.CANTEEN_MANAGER;
  const canSeePayments = userRole === UserRole.SUPER_ADMIN || userRole === UserRole.SCHOOL_ADMIN;

  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        const sid = schoolId || '';
        const shouldLoadMenuToday = isCanteenManager || isSchoolAdmin;
        const shouldLoadMenus = isCanteenManager || isSuperAdmin || isSchoolAdmin;
        const [studentsData, paymentsData, attendanceData, todayMenuData, menusData, schoolsData, subscriptionsData] = await Promise.all([
          studentsApi.getStudents(sid),
          canSeePayments ? paymentsApi.getPayments(sid) : Promise.resolve([] as Payment[]),
          attendanceApi.getAttendance(sid),
          shouldLoadMenuToday ? menuApi.getTodayMenu(sid) : Promise.resolve(null as MenuItem | null),
          shouldLoadMenus ? menuApi.getMenus(sid) : Promise.resolve([] as MenuItem[]),
          isSuperAdmin
            ? schoolsApi.getSchools()
            : ((isSchoolAdmin || isCanteenManager) && sid ? schoolsApi.getSchoolById(sid).then((school) => (school ? [school] : [])) : Promise.resolve([] as School[])),
          subscriptionsApi.getSubscriptions(sid),
        ]);
        if (cancelled) return;
        setStudents(studentsData || []);
        setPayments(paymentsData || []);
        setAttendanceLogs(attendanceData || []);
        const normalizedMenus = menusData || [];
        if ((isCanteenManager || isSchoolAdmin) && todayMenuData) {
          const alreadyListed = normalizedMenus.some((menu) => menu.id === todayMenuData.id);
          setMenus(alreadyListed ? normalizedMenus : [todayMenuData, ...normalizedMenus]);
        } else {
          setMenus(normalizedMenus);
        }
        setSchools(schoolsData || []);
        setSubscriptions(subscriptionsData || []);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };
    loadData();
    return () => {
      cancelled = true;
    };
  }, [schoolId, isSuperAdmin, isSchoolAdmin, isCanteenManager, canSeePayments]);

  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const todayUtcKey = today.toISOString().slice(0, 10);
  const todayLabel = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const refreshedAt = today.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const normalizedAttendance = useMemo(() => (attendanceLogs || []).map((log: any) => {
    const student = log.student_id || {};
    const date = log.date ? new Date(log.date) : null;
    return {
      id: log._id || log.id || Math.random().toString(36).slice(2),
      name: `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Eleve',
      className: student.class_name || student.grade || '',
      present: log.present !== false,
      date,
    };
  }), [attendanceLogs]);

  const todayAttendance = useMemo(() => normalizedAttendance.filter((log) => {
    if (!log.present || !log.date) return false;
    const local = toLocalDateKey(log.date);
    const utc = new Date(log.date).toISOString().slice(0, 10);
    return local === todayKey || utc === todayUtcKey;
  }), [normalizedAttendance, todayKey, todayUtcKey]);

  const dailyAttendance = useMemo(() => (attendanceLogs || []).filter((log: any) => {
    if (!log?.date) return false;
    const local = toLocalDateKey(log.date);
    const utc = new Date(log.date).toISOString().slice(0, 10);
    return local === todayKey || utc === todayUtcKey;
  }), [attendanceLogs, todayKey, todayUtcKey]);

  const subsLite = useMemo(() => (subscriptions || []).map(normalizeSubscription), [subscriptions]);
  const completedPayments = useMemo(() => payments.filter((p) => p.status === 'completed'), [payments]);

  const monthWindow = useMemo(() => {
    const points: Array<{ key: string; label: string }> = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      points.push({
        key: toMonthKey(d),
        label: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').slice(0, 3).toUpperCase(),
      });
    }
    return points;
  }, []);

  const monthlyData = useMemo(() => {
    const byMonth = new Map(monthWindow.map((m) => [m.key, { key: m.key, label: m.label, revenue: 0, registrations: 0 }]));
    completedPayments.forEach((p) => {
      const key = toMonthKey(p.date);
      const current = byMonth.get(key);
      if (current) current.revenue += Number(p.amount || 0);
    });
    subsLite.forEach((s) => {
      const key = toMonthKey(s.startDate);
      const current = byMonth.get(key);
      if (current) current.registrations += 1;
    });
    return monthWindow.map((m) => byMonth.get(m.key) || { key: m.key, label: m.label, revenue: 0, registrations: 0 });
  }, [monthWindow, completedPayments, subsLite]);

  const schoolStats = useMemo(() => {
    const studentsBySchool = students.reduce<Record<string, number>>((acc, s) => {
      const key = String(s.schoolId || '').trim();
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const revenueBySchool = completedPayments.reduce<Record<string, number>>((acc, p) => {
      const key = String(p.schoolId || '').trim();
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + Number(p.amount || 0);
      return acc;
    }, {});
    const activeBySchool = subsLite.reduce<Record<string, number>>((acc, s) => {
      if (!isActiveSub(s.status)) return acc;
      const key = String(s.schoolId || '').trim();
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return schools.map((school) => {
      const studentCount = studentsBySchool[school.id] ?? school.studentCount ?? 0;
      const active = activeBySchool[school.id] ?? 0;
      const usage = studentCount > 0 ? (active / studentCount) * 100 : 0;
      return {
        id: school.id,
        name: school.name,
        studentCount,
        revenue: revenueBySchool[school.id] || 0,
        activeSubscriptions: active,
        usageRate: usage,
      };
    }).sort((a, b) => b.usageRate - a.usageRate);
  }, [schools, students, completedPayments, subsLite]);

  const paymentSplit = useMemo(() => {
    const data = [
      { key: 'ORANGE_MONEY', name: 'Orange Money', value: 0, color: '#f59e0b' },
      { key: 'MOOV_MONEY', name: 'Moov Money', value: 0, color: '#3b82f6' },
      { key: 'CASH', name: 'Especes', value: 0, color: '#22c55e' },
    ];
    completedPayments.forEach((p) => {
      const method = String(p.method || 'CASH').toUpperCase();
      const item = data.find((d) => d.key === method) || data[2];
      item.value += 1;
    });
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return { data, total };
  }, [completedPayments]);

  const activities = useMemo(() => {
    const list: Activity[] = [];
    payments.slice(-4).forEach((p) => {
      const date = new Date(p.date || new Date().toISOString());
      list.push({
        id: `p-${p.id}`,
        user: p.studentName || 'Eleve',
        action: `Paiement ${p.status === 'completed' ? 'valide' : p.status === 'failed' ? 'echoue' : 'en attente'}`,
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        amount: formatFcfa(p.amount),
        timestamp: date.toISOString(),
      });
    });
    dailyAttendance.slice(-3).forEach((log: any) => {
      const student = log.student_id || {};
      const date = log.date ? new Date(log.date) : new Date();
      const name = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Eleve';
      list.push({ id: `a-${log._id || log.id || Math.random().toString(36).slice(2)}`, user: name, action: 'Passage cantine valide', time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), timestamp: date.toISOString() });
    });
    subsLite.slice().sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).slice(0, 3).forEach((s) => {
      const date = new Date(s.startDate);
      list.push({ id: `s-${s.id}`, user: 'Abonnement', action: isActiveSub(s.status) ? 'Abonnement active' : 'Abonnement mis a jour', time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), amount: s.amount > 0 ? formatFcfa(s.amount) : undefined, timestamp: date.toISOString() });
    });
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [payments, dailyAttendance, subsLite]);

  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter((a) => a.user.toLowerCase().includes(q) || a.action.toLowerCase().includes(q));
  }, [activities, searchQuery]);

  const totalRevenue = completedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const activeSubs = subsLite.filter((s) => isActiveSub(s.status)).length;
  const currentMonth = monthlyData[monthlyData.length - 1] || { revenue: 0, registrations: 0 };
  const previousMonth = monthlyData[monthlyData.length - 2] || { revenue: 0, registrations: 0 };
  const revenueDelta = pctChange(currentMonth.revenue, previousMonth.revenue);
  const regDelta = pctChange(currentMonth.registrations, previousMonth.registrations);
  const usageAverage = schoolStats.length ? schoolStats.reduce((sum, school) => sum + school.usageRate, 0) / schoolStats.length : 0;
  const subRate = students.length > 0 ? (activeSubs / students.length) * 100 : 0;
  const pendingPayments = payments.filter((p) => p.status === 'pending').length;
  const pendingMenus = menus.filter((m) => String(m.status || '').toUpperCase() === 'PENDING').length;
  const schoolName = schools[0]?.name || 'Mon ecole';

  const schoolMenuForToday = useMemo(() => {
    const getMenuDateKey = (menu: MenuItem): string => {
      if (!menu?.date) return '';
      if (typeof menu.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(menu.date)) return menu.date.slice(0, 10);
      return toLocalDateKey(menu.date);
    };

    const direct = menus.find((menu) => {
      const key = getMenuDateKey(menu);
      return key === todayKey || key === todayUtcKey;
    });
    if (direct) return direct;

    const sorted = [...menus].sort((a, b) => {
      const aDate = parseAnyDate(a.date)?.getTime() || 0;
      const bDate = parseAnyDate(b.date)?.getTime() || 0;
      return bDate - aDate;
    });
    return sorted[0] || null;
  }, [menus, todayKey, todayUtcKey]);

  const schoolMenuDate = parseAnyDate(
    schoolMenuForToday?.date && typeof schoolMenuForToday.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(schoolMenuForToday.date)
      ? `${schoolMenuForToday.date}T12:00:00`
      : schoolMenuForToday?.date
  ) || today;
  const schoolMenuDateLabel = schoolMenuDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const mealTypeLabelMap: Record<string, string> = {
    BREAKFAST: 'PETIT DEJEUNER',
    LUNCH: 'DEJEUNER',
    DINNER: 'DINER',
  };
  const schoolMenuMealType = mealTypeLabelMap[String(schoolMenuForToday?.mealType || 'LUNCH').toUpperCase()] || 'DEJEUNER';
  const schoolMenuItems = schoolMenuForToday?.items || [];
  const schoolMenuAllergens = schoolMenuForToday?.allergens?.length ? schoolMenuForToday.allergens.join(', ') : 'Aucun';

  const schoolMonthlyStudents = currentMonth.registrations;
  const schoolActiveRate = students.length > 0 ? (activeSubs / students.length) * 100 : 0;
  const schoolPresenceRate = activeSubs > 0 ? (todayAttendance.length / activeSubs) * 100 : 0;
  const schoolPresenceLevel = schoolPresenceRate >= 90 ? 'Excellent' : schoolPresenceRate >= 75 ? 'Stable' : 'A renforcer';

  const recentMonthlyData = monthlyData.slice(-6);
  const schoolRevenueDelta = pctChange(currentMonth.revenue, previousMonth.revenue);
  const schoolRegDelta = pctChange(currentMonth.registrations, previousMonth.registrations);

  const expiringSoonCount = (subscriptions || []).filter((sub: any) => {
    const status = String(sub?.status || '').toUpperCase();
    if (!isActiveSub(status)) return false;
    const endDate = parseAnyDate(sub?.endDate || sub?.end_date);
    if (!endDate) return false;
    const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft >= 0 && daysLeft <= 3;
  }).length;

  const pendingCashPayments = payments.filter((payment) => payment.status === 'pending' && String(payment.method || '').toUpperCase() === 'CASH');
  const pendingCashAmount = pendingCashPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const weekAgoDate = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    value.setDate(value.getDate() - 7);
    return value;
  }, []);

  const weeklyNewStudentIds = useMemo(() => {
    const ids = subsLite
      .filter((subscription) => {
        const startedAt = parseAnyDate(subscription.startDate);
        if (!startedAt) return false;
        return startedAt.getTime() >= weekAgoDate.getTime();
      })
      .map((subscription) => subscription.childId)
      .filter(Boolean);
    return Array.from(new Set(ids));
  }, [subsLite, weekAgoDate]);

  const weeklyNewStudents = useMemo(() => {
    const mapped = weeklyNewStudentIds
      .map((studentId) => students.find((student) => student.id === studentId))
      .filter(Boolean) as Student[];
    if (mapped.length > 0) return mapped.slice(0, 3);
    return students.slice(0, 3);
  }, [weeklyNewStudentIds, students]);

  const reportDueDate = new Date(today.getFullYear(), today.getMonth() + 1, 1).toLocaleDateString('fr-FR');

  const schoolActions = [
    {
      id: 'expiring',
      className: 'border-red-200 bg-red-50 text-red-700',
      title: `${expiringSoonCount} abonnements expirent dans 3 jours`,
      detail: 'Envoyer des rappels aux parents.',
      cta: 'Gerer',
      tab: 'subscriptions',
    },
    {
      id: 'cash',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      title: `${pendingCashPayments.length} paiements en especes a valider`,
      detail: `Total: ${formatFcfa(pendingCashAmount)}`,
      cta: 'Valider',
      tab: 'payments',
    },
    {
      id: 'report',
      className: 'border-yellow-200 bg-yellow-50 text-yellow-700',
      title: 'Rapport mensuel a envoyer au Super Admin',
      detail: `Echeance: ${reportDueDate}`,
      cta: 'Creer rapport',
      tab: 'canteen-reports',
    },
    {
      id: 'new-students',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      title: `${weeklyNewStudentIds.length || weeklyNewStudents.length} nouveaux eleves cette semaine`,
      detail: 'Creer leurs abonnements.',
      cta: 'Voir',
      tab: 'students',
    },
  ];

  const schoolRecentPayments = useMemo(() => {
    const todayList = payments
      .filter((payment) => {
        const paymentDate = parseAnyDate(payment.date);
        if (!paymentDate) return false;
        const local = toLocalDateKey(paymentDate);
        const utc = paymentDate.toISOString().slice(0, 10);
        return local === todayKey || utc === todayUtcKey;
      })
      .sort((a, b) => {
        const aTime = parseAnyDate(a.date)?.getTime() || 0;
        const bTime = parseAnyDate(b.date)?.getTime() || 0;
        return bTime - aTime;
      });

    const fallbackList = [...payments].sort((a, b) => {
      const aTime = parseAnyDate(a.date)?.getTime() || 0;
      const bTime = parseAnyDate(b.date)?.getTime() || 0;
      return bTime - aTime;
    });

    return (todayList.length > 0 ? todayList : fallbackList).slice(0, 4);
  }, [payments, todayKey, todayUtcKey]);

  const schoolClassStats = useMemo(() => {
    const totalByClass = students.reduce<Record<string, number>>((acc, student) => {
      const key = String(student.class || 'Sans classe');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const subscribedByClass = students.reduce<Record<string, number>>((acc, student) => {
      const key = String(student.class || 'Sans classe');
      const isSubscribed = student.subscriptionStatus === 'active' || student.subscriptionStatus === 'warning';
      if (!isSubscribed) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const presentByClass = todayAttendance.reduce<Record<string, number>>((acc, log) => {
      const key = String(log.className || 'Sans classe');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const classes = Array.from(new Set([
      ...Object.keys(totalByClass),
      ...Object.keys(subscribedByClass),
      ...Object.keys(presentByClass),
    ]));

    const orderMap: Record<string, number> = { CP: 1, CE1: 2, CE2: 3, CM1: 4, CM2: 5 };
    classes.sort((a, b) => (orderMap[a] || 99) - (orderMap[b] || 99) || a.localeCompare(b, 'fr'));

    return classes.map((className) => {
      const total = totalByClass[className] || 0;
      const subscribed = subscribedByClass[className] || 0;
      const present = presentByClass[className] || 0;
      const subscriptionRate = total > 0 ? (subscribed / total) * 100 : 0;
      const presenceRate = subscribed > 0 ? (present / subscribed) * 100 : 0;
      return { className, total, subscribed, present, subscriptionRate, presenceRate };
    });
  }, [students, todayAttendance]);

  if (isCanteenManager) {
    const capitalizeFirst = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);
    const activeStudentsCount = activeSubs > 0 ? activeSubs : students.length;
    const presentStudentsCount = todayAttendance.length;
    const todayMarkedLogs = (attendanceLogs || []).filter((log: any) => {
      if (!log?.date) return false;
      const local = toLocalDateKey(log.date);
      const utc = new Date(log.date).toISOString().slice(0, 10);
      return local === todayKey || utc === todayUtcKey;
    });
    const markedTodayCount = todayMarkedLogs.length;
    const pendingTodayCount = Math.max(activeStudentsCount - markedTodayCount, 0);
    const attendanceRateToday = activeStudentsCount > 0 ? (presentStudentsCount / activeStudentsCount) * 100 : 0;

    const allergyCount = students.filter((student) => Array.isArray(student.allergies) && student.allergies.length > 0).length;

    const menuForToday = schoolMenuForToday;
    const todayMenuTitle = menuForToday ? `${schoolMenuMealType} - ${toMenuPrimaryDishLabel(menuForToday) || 'Menu du jour'}` : 'Aucun menu planifie';
    const plannedPortions = activeStudentsCount;
    const servedPortions = presentStudentsCount;
    const remainingPortions = Math.max(plannedPortions - servedPortions, 0);

    const monday = new Date(today);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

    const weekMenuRows = Array.from({ length: 5 }, (_, index) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + index);
      const dayKey = toLocalDateKey(dayDate);
      const dayLabel = capitalizeFirst(dayDate.toLocaleDateString('fr-FR', { weekday: 'long' }));
      const dayShortDate = dayDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      const dayMenu = menus.find((menu) => {
        if (!menu?.date) return false;
        const menuKey = typeof menu.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(menu.date)
          ? menu.date.slice(0, 10)
          : toLocalDateKey(menu.date);
        return menuKey === dayKey;
      }) || null;

      return {
        key: dayKey,
        dayLabel,
        dayShortDate,
        menu: dayMenu,
        menuLabel: dayMenu ? (toMenuPrimaryDishLabel(dayMenu) || 'Menu saisi') : 'Non planifie',
        isPlanned: !!dayMenu,
      };
    });

    const weeklyAttendanceRows = weekMenuRows.map((day) => {
      const dayLogs = (attendanceLogs || []).filter((log: any) => {
        if (!log?.date) return false;
        const local = toLocalDateKey(log.date);
        const utc = new Date(log.date).toISOString().slice(0, 10);
        return local === day.key || utc === day.key;
      });
      const present = dayLogs.filter((log: any) => log?.present !== false).length;
      const rate = activeStudentsCount > 0 ? (present / activeStudentsCount) * 100 : 0;
      return {
        ...day,
        present,
        total: activeStudentsCount,
        rate,
      };
    });

    const weeklyAverage = weeklyAttendanceRows.length > 0
      ? weeklyAttendanceRows.reduce((sum, row) => sum + row.rate, 0) / weeklyAttendanceRows.length
      : 0;
    const weeklyLevel = weeklyAverage >= 98 ? 'Excellent' : weeklyAverage >= 90 ? 'Correct' : 'A renforcer';

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="surface-card p-6">
          <h2 className="section-title">DASHBOARD CANTINE - {schoolName}</h2>
          <p className="mt-2 text-sm text-slate-500">Pilotage quotidien de la cantine, présences, allergies, menu et coûts.</p>
        </div>

        <div className="surface-card p-6">
          <h3 className="section-title text-base">AUJOURD HUI - {todayLabel}</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="card-muted p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Actifs</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{activeStudentsCount.toLocaleString('fr-FR')}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Avec abonnement</p>
            </div>
            <div className="card-muted p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Presents</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{presentStudentsCount.toLocaleString('fr-FR')}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Ont mange</p>
              <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-emerald-600">{attendanceRateToday.toFixed(0)}%</p>
            </div>
            <div className="card-muted p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">En attente</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{pendingTodayCount.toLocaleString('fr-FR')}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Pas encore marques</p>
            </div>
            <div className="card-muted p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Allergies</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{allergyCount.toLocaleString('fr-FR')}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">A surveiller</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-6">
          <h3 className="section-title text-base">MENU D AUJOURD HUI</h3>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <p className="text-base font-black text-slate-900">{todayMenuTitle}</p>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Composition</p>
              <div className="mt-2 space-y-1 text-sm text-slate-700">
                {schoolMenuItems.length > 0 ? schoolMenuItems.map((item, index) => (
                  <p key={`${item.name}-${index}`}>- {item.emoji ? `${item.emoji} ` : ''}{item.name}</p>
                )) : <p>- Composition non renseignee</p>}
              </div>
            </div>
            <p className="text-sm text-slate-700"><strong>Allergenes :</strong> {schoolMenuAllergens}</p>
            <p className="text-sm text-slate-700"><strong>Portions prevues :</strong> {plannedPortions.toLocaleString('fr-FR')}</p>
            <p className="text-sm text-slate-700"><strong>Portions servies :</strong> {servedPortions.toLocaleString('fr-FR')}</p>
            <p className="text-sm text-slate-700"><strong>Stock restant :</strong> {remainingPortions.toLocaleString('fr-FR')} portions</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={() => onNavigateTab?.('menus')} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">Modifier menu</button>
              <button type="button" onClick={() => onNavigateTab?.('attendance')} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">Marquer presences</button>
            </div>
          </div>
        </div>

        <div className="surface-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="section-title text-base">MENU DE LA SEMAINE</h3>
            <button type="button" onClick={() => onNavigateTab?.('menus')} className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide text-emerald-600 hover:text-emerald-700">
              Planifier <ArrowRight size={14} />
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {weekMenuRows.map((row) => (
              <div key={row.key} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
                <p className="font-bold text-slate-700">{row.dayLabel} {row.dayShortDate}</p>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${row.isPlanned ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {row.isPlanned ? 'Planifie' : 'Non planifie'}
                  </span>
                  <p className="text-slate-600">{row.menuLabel}</p>
                  <button type="button" onClick={() => onNavigateTab?.('menus')} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">
                    {row.isPlanned ? 'Modifier' : 'Creer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-6">
          <h3 className="section-title text-base">STATISTIQUES DE LA SEMAINE</h3>
          <div className="mt-4 space-y-3">
            {weeklyAttendanceRows.map((row) => (
              <div key={row.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-semibold text-slate-700">{row.dayLabel}</p>
                  <p className="font-black text-slate-700">{row.present}/{row.total} ({row.rate.toFixed(0)}%)</p>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${row.rate >= 98 ? 'bg-emerald-500' : row.rate >= 90 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.max(0, Math.min(100, row.rate))}%` }} />
                </div>
              </div>
            ))}
            <div className="pt-2 text-sm font-semibold text-slate-700">
              Moyenne : <strong>{weeklyAverage.toFixed(0)}%</strong> {weeklyAverage >= 98 ? '🟢' : weeklyAverage >= 90 ? '🟡' : '🔴'} {weeklyLevel}
            </div>
          </div>
        </div>

        <div className="surface-card p-6">
          <h3 className="section-title text-base">ACTIONS RAPIDES</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <button type="button" onClick={() => onNavigateTab?.('attendance')} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">Saisie presences</button>
            <button type="button" onClick={() => onNavigateTab?.('menus')} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">Creer menu</button>
            <button type="button" onClick={() => onNavigateTab?.('canteen-reports')} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">Rapport semaine</button>
            <button type="button" onClick={() => onNavigateTab?.('menus')} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">Planifier semaine</button>
          </div>
        </div>
      </div>
    );
  }

  if (isSuperAdmin) {
    const alerts = [
      ...(schoolStats.filter((s) => s.usageRate < 75).slice(0, 2).map((s) => ({ id: `u-${s.id}`, tone: s.usageRate < 65 ? 'danger' : 'warning', title: `${s.name} : taux faible (${s.usageRate.toFixed(0)}%)`, detail: 'Action: verifier les abonnements et contacter le School Admin.', label: 'Voir details', tab: 'schools' }))),
      ...(pendingPayments > 0 ? [{ id: 'p', tone: 'warning', title: `${pendingPayments} paiements en attente`, detail: 'Action: valider rapidement les paiements en attente.', label: 'Gerer', tab: 'payments' }] : []),
      ...(pendingMenus > 0 ? [{ id: 'm', tone: 'info', title: `${pendingMenus} menus en attente`, detail: 'Action: ouvrir Menus pour validation.', label: 'Examiner', tab: 'menus' }] : []),
    ];
    const tones: Record<string, string> = {
      danger: 'border-red-200 bg-red-50 text-red-700',
      warning: 'border-amber-200 bg-amber-50 text-amber-700',
      info: 'border-blue-200 bg-blue-50 text-blue-700',
      success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
    const cards = [
      { title: 'Ecoles', value: schools.length.toLocaleString('fr-FR'), sub: `${schools.filter((s) => s.status === 'active').length} actives`, trend: pctLabel(pctChange(schools.filter((s) => s.status === 'active').length, Math.max(schools.length - 1, 1))), icon: <SchoolIcon size={18} /> },
      { title: 'Eleves', value: students.length.toLocaleString('fr-FR'), sub: `${currentMonth.registrations.toLocaleString('fr-FR')} ce mois`, trend: pctLabel(regDelta), icon: <Users size={18} /> },
      { title: 'Revenus', value: formatCompactFcfa(totalRevenue), sub: `${formatCompactFcfa(currentMonth.revenue)} ce mois`, trend: pctLabel(revenueDelta), icon: <Wallet size={18} /> },
      { title: 'Abonnements', value: activeSubs.toLocaleString('fr-FR'), sub: `${subRate.toFixed(1)}% actifs`, trend: subRate >= 85 ? 'Excellent' : subRate >= 70 ? 'Stable' : 'A renforcer', icon: <CheckCircle2 size={18} /> },
    ];
    const quickActions = [
      { label: '+ Creer une ecole', tab: 'schools' },
      { label: '+ Creer un School Admin', tab: 'users' },
      { label: 'Rapport global', tab: 'school-admin-reports' },
      { label: 'Gerer utilisateurs', tab: 'users' },
      { label: 'Parametres systeme', tab: 'settings' },
    ];
    const pieData = paymentSplit.total ? paymentSplit.data : [{ key: 'NONE', name: 'Aucun paiement', value: 1, color: '#cbd5e1' }];
    const goals = [
      { id: 'g1', label: 'Revenus', current: currentMonth.revenue, target: Math.max(previousMonth.revenue * 1.12, 5_000_000), c: formatFcfa(currentMonth.revenue), t: formatFcfa(Math.max(previousMonth.revenue * 1.12, 5_000_000)) },
      { id: 'g2', label: 'Nouvelles inscriptions', current: currentMonth.registrations, target: Math.max(previousMonth.registrations, 1), c: `${currentMonth.registrations}`, t: `${Math.max(previousMonth.registrations, 1)}` },
      { id: 'g3', label: 'Taux utilisation', current: usageAverage, target: 90, c: `${usageAverage.toFixed(1)}%`, t: '90%' },
      { id: 'g4', label: 'Ecoles actives', current: schools.filter((s) => s.status === 'active').length, target: Math.max(schools.length, 1), c: `${schools.filter((s) => s.status === 'active').length}`, t: `${Math.max(schools.length, 1)}` },
    ];
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="page-hero">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 pill"><TrendingUp size={14} />Dashboard Super Admin</div>
              <h2 className="page-title">Vue d ensemble globale</h2>
              <p className="mt-2 page-subtitle">Suivi de toutes les ecoles, revenus, abonnements et activites recentes.</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-slate-100">Mise a jour : {refreshedAt}</div>
          </div>
        </div>

        <div className="surface-card p-6">
          <div className="mb-5 flex items-center justify-between"><h4 className="section-title">Vue globale</h4><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Temps reel</span></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div key={card.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{card.title}</span><div className="rounded-lg bg-white p-2 text-slate-500">{card.icon}</div></div>
                <p className="mt-3 text-2xl font-black text-slate-900">{card.value}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{card.sub}</p>
                <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-600">{card.trend}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-6 space-y-6">
          <h4 className="section-title">Graphiques principaux</h4>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-xs font-black uppercase tracking-widest text-slate-500">Revenus par mois</p><p className="text-[10px] font-semibold text-emerald-600">{pctLabel(revenueDelta)} vs mois precedent</p><div className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={monthlyData}><CartesianGrid strokeDasharray="4 4" stroke="#e8e0d6" /><XAxis dataKey="label" tick={{ fontSize: 11, fill: '#7b746d' }} /><YAxis tick={{ fontSize: 11, fill: '#7b746d' }} tickFormatter={(v) => `${Math.round(v / 1000000)}M`} /><Tooltip formatter={(v: any) => formatFcfa(Number(v || 0))} /><Line type="monotone" dataKey="revenue" stroke="#c9a227" strokeWidth={3} dot={{ r: 2 }} /></LineChart></ResponsiveContainer></div></div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-xs font-black uppercase tracking-widest text-slate-500">Inscriptions par mois</p><p className="text-[10px] font-semibold text-emerald-600">{pctLabel(regDelta)} vs mois precedent</p><div className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={monthlyData}><CartesianGrid strokeDasharray="4 4" stroke="#e8e0d6" /><XAxis dataKey="label" tick={{ fontSize: 11, fill: '#7b746d' }} /><YAxis tick={{ fontSize: 11, fill: '#7b746d' }} /><Tooltip formatter={(v: any) => Number(v || 0).toLocaleString('fr-FR')} /><Line type="monotone" dataKey="registrations" stroke="#2b2a27" strokeWidth={3} dot={{ r: 2 }} /></LineChart></ResponsiveContainer></div></div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-xs font-black uppercase tracking-widest text-slate-500">Taux utilisation par ecole</p><p className="text-[10px] font-semibold text-slate-500">Moyenne : {usageAverage.toFixed(1)}%</p><div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={schoolStats.slice(0, 5).map((s) => ({ name: s.name.length > 20 ? `${s.name.slice(0, 20)}...` : s.name, value: Number(s.usageRate.toFixed(1)) }))} layout="vertical" margin={{ left: 10, right: 10 }}><CartesianGrid strokeDasharray="3 3" stroke="#efe6da" /><XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#7b746d' }} /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10, fill: '#5e544c' }} /><Tooltip formatter={(v: any) => `${Number(v || 0).toFixed(1)}%`} /><Bar dataKey="value" radius={[0, 8, 8, 0]} fill="#c9a227" /></BarChart></ResponsiveContainer></div></div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-xs font-black uppercase tracking-widest text-slate-500">Repartition paiements</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-center"><div className="h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={72}>{pieData.map((entry) => (<Cell key={entry.key} fill={entry.color} />))}</Pie><Tooltip formatter={(v: any) => Number(v || 0).toLocaleString('fr-FR')} /></PieChart></ResponsiveContainer></div><div className="space-y-2">{paymentSplit.data.map((item) => { const ratio = paymentSplit.total ? ((item.value / paymentSplit.total) * 100).toFixed(0) : '0'; return <div key={item.key} className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} /><span className="font-semibold text-slate-700">{item.name}</span><span className="ml-auto font-black text-slate-500">{ratio}%</span></div>; })}</div></div></div>
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4"><h4 className="section-title">Apercu des ecoles</h4><button type="button" onClick={() => onNavigateTab?.('schools')} className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide text-emerald-600 hover:text-emerald-700">Voir tout <ArrowRight size={14} /></button></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead className="table-head"><tr><th className="px-6 py-4">Ecole</th><th className="px-6 py-4">Eleves</th><th className="px-6 py-4">Revenus mois</th><th className="px-6 py-4">Actifs</th><th className="px-6 py-4">Performance</th></tr></thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {schoolStats.slice(0, 5).map((school) => (
                  <tr key={school.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-800">{school.name}</td>
                    <td className="px-6 py-4 text-slate-600">{school.studentCount.toLocaleString('fr-FR')}</td>
                    <td className="px-6 py-4 text-slate-600">{formatCompactFcfa(school.revenue)}</td>
                    <td className="px-6 py-4 text-slate-600">{school.activeSubscriptions}/{school.studentCount || 0}</td>
                    <td className="px-6 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${school.usageRate >= 85 ? 'bg-emerald-50 text-emerald-700' : school.usageRate >= 70 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{school.usageRate.toFixed(0)}%</span></td>
                  </tr>
                ))}
                {schoolStats.length === 0 && <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">Aucune ecole disponible pour le moment.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="surface-card p-6">
          <h4 className="section-title">Alertes et notifications</h4>
          <div className="mt-4 space-y-3">
            {alerts.length > 0 ? alerts.map((alert) => (
              <div key={alert.id} className={`rounded-2xl border px-4 py-3 ${tones[alert.tone] || tones.success}`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-sm font-black">{alert.title}</p><p className="text-xs font-semibold opacity-80">{alert.detail}</p></div>
                  <button type="button" onClick={() => onNavigateTab?.(alert.tab)} className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide">{alert.label}<ArrowRight size={13} /></button>
                </div>
              </div>
            )) : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700"><p className="text-sm font-black">Aucune alerte bloquante</p><p className="text-xs font-semibold opacity-80">Le reseau fonctionne normalement.</p></div>}
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4"><h4 className="section-title">Activite recente</h4><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Temps reel</span></div>
          <div className="divide-y divide-slate-100">
            {filteredActivities.length > 0 ? filteredActivities.slice(0, 6).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-400"><Clock size={16} /></div><div><p className="text-sm font-bold text-slate-800">{activity.action}</p><p className="text-xs text-slate-500">{activity.user}</p></div></div>
                <div className="text-right"><p className="text-[10px] font-black uppercase text-slate-400">{activity.time}</p>{activity.amount && <p className="text-xs font-bold text-emerald-600">{activity.amount}</p>}</div>
              </div>
            )) : <div className="px-6 py-10 text-center text-sm text-slate-400">Aucune activite recente avec le filtre actuel.</div>}
          </div>
        </div>

        <div className="surface-card p-6">
          <h4 className="section-title">Objectifs mensuels</h4>
          <div className="mt-4 space-y-4">
            {goals.map((goal) => {
              const raw = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
              const width = Math.max(0, Math.min(raw, 100));
              const reached = goal.current >= goal.target;
              return (
                <div key={goal.id}>
                  <div className="mb-1 flex items-center justify-between text-sm"><span className="font-bold text-slate-700">{goal.label}</span><span className="font-semibold text-slate-500">{goal.c} / {goal.t}</span></div>
                  <div className="h-2 w-full rounded-full bg-slate-100"><div className={`h-full rounded-full ${reached ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${width}%` }} /></div>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400">{raw.toFixed(0)}% {reached ? 'atteint' : 'en cours'}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="surface-card p-6">
          <h4 className="section-title">Actions rapides</h4>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => (
              <button key={action.label} type="button" onClick={() => onNavigateTab?.(action.tab)} className="inline-flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50">
                <span>{action.label}</span><ArrowRight size={15} className="text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="page-hero">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 pill"><TrendingUp size={14} />Dashboard School Admin</div>
            <h2 className="page-title">Dashboard - {schoolName}</h2>
            <p className="mt-2 page-subtitle">Vue d ensemble de votre ecole: eleves, abonnements, menu, paiements et actions urgentes.</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-slate-100">Mise a jour : {refreshedAt}</div>
        </div>
      </div>

      <div className="surface-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <h4 className="section-title">Vue d ensemble de mon ecole</h4>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Temps reel</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Eleves</p>
            <p className="mt-3 text-2xl font-black text-slate-900">{students.length.toLocaleString('fr-FR')}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Tous inscrits</p>
            <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-600">+{schoolMonthlyStudents.toLocaleString('fr-FR')} ce mois</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Actifs</p>
            <p className="mt-3 text-2xl font-black text-slate-900">{activeSubs.toLocaleString('fr-FR')}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Avec abonnement</p>
            <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-600">{schoolActiveRate.toFixed(1)}% taux</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Revenus</p>
            <p className="mt-3 text-2xl font-black text-slate-900">{formatCompactFcfa(currentMonth.revenue)}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Ce mois</p>
            <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-600">{pctLabel(schoolRevenueDelta)} vs mois precedent</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Presence</p>
            <p className="mt-3 text-2xl font-black text-slate-900">{schoolPresenceRate.toFixed(1)}%</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Moyenne du jour</p>
            <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-600">{schoolPresenceLevel}</p>
          </div>
        </div>
      </div>

      <div className="surface-card p-6">
        <h4 className="section-title mb-4">Evolution mensuelle</h4>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Inscriptions (6 derniers mois)</p>
            <p className="text-[10px] font-semibold text-emerald-600">{pctLabel(schoolRegDelta)} vs mois precedent</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recentMonthlyData}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e8e0d6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#7b746d' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#7b746d' }} />
                  <Tooltip formatter={(value: any) => Number(value || 0).toLocaleString('fr-FR')} />
                  <Line type="monotone" dataKey="registrations" stroke="#2b2a27" strokeWidth={3} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Revenus (6 derniers mois)</p>
            <p className="text-[10px] font-semibold text-emerald-600">{pctLabel(schoolRevenueDelta)} vs mois precedent</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recentMonthlyData}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e8e0d6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#7b746d' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#7b746d' }} tickFormatter={(value) => `${Math.round(Number(value || 0) / 1_000_000)}M`} />
                  <Tooltip formatter={(value: any) => formatFcfa(Number(value || 0))} />
                  <Line type="monotone" dataKey="revenue" stroke="#c9a227" strokeWidth={3} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="surface-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="section-title">Menu d aujourd hui</h4>
          <button type="button" onClick={() => onNavigateTab?.('menus')} className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide text-emerald-600 hover:text-emerald-700">
            Modifier le menu <ArrowRight size={14} />
          </button>
        </div>
        {schoolMenuForToday ? (
          <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-sm font-bold text-slate-700">{schoolMenuDateLabel} - {schoolMenuMealType}</p>
            <div>
              <p className="text-base font-black text-slate-900">{toMenuPrimaryDishLabel(schoolMenuForToday) || 'Menu du jour'}</p>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                {schoolMenuItems.length > 0 ? schoolMenuItems.map((item, index) => (
                  <p key={`${item.name}-${index}`}>• {item.emoji ? `${item.emoji} ` : ''}{item.name}</p>
                )) : <p>• Composition non renseignee</p>}
              </div>
            </div>
            <p className="text-sm font-semibold text-slate-600">Allergenes : <span className="font-bold text-slate-800">{schoolMenuAllergens}</span></p>
            <p className="text-sm font-semibold text-slate-600">Repas servis aujourd hui : <span className="font-bold text-slate-800">{todayAttendance.length}</span> / {activeSubs}</p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => onNavigateTab?.('menus')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">Voir menu semaine</button>
              <button type="button" onClick={() => onNavigateTab?.('attendance')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">Marquer les presences</button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
            <p className="text-sm font-bold">Aucun menu renseigne pour aujourd hui.</p>
            <button type="button" onClick={() => onNavigateTab?.('menus')} className="mt-3 inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide">
              Creer le menu <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="surface-card p-6">
        <h4 className="section-title mb-4">Actions requises ({schoolActions.length})</h4>
        <div className="space-y-3">
          {schoolActions.map((action) => (
            <div key={action.id} className={`rounded-2xl border px-4 py-3 ${action.className}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black">{action.title}</p>
                  <p className="text-xs font-semibold opacity-80">{action.detail}</p>
                </div>
                <button type="button" onClick={() => onNavigateTab?.(action.tab)} className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide">
                  {action.cta} <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4">
          <h4 className="section-title">Nouveaux eleves (cette semaine)</h4>
          <button type="button" onClick={() => onNavigateTab?.('students')} className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide text-emerald-600 hover:text-emerald-700">
            Voir tous ({weeklyNewStudentIds.length || students.length}) <ArrowRight size={14} />
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {weeklyNewStudents.length > 0 ? weeklyNewStudents.map((student) => (
            <div key={student.id} className="flex flex-col gap-2 px-6 py-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm font-semibold text-slate-700">
                {student.firstName} {student.lastName} - {student.class} - Parent: {student.parentPhone || '--'}
              </p>
              <button type="button" onClick={() => onNavigateTab?.('subscriptions')} className="inline-flex w-fit items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">
                Creer abonnement
              </button>
            </div>
          )) : (
            <div className="px-6 py-8 text-sm text-slate-500">Aucun nouvel eleve detecte cette semaine.</div>
          )}
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4">
          <h4 className="section-title">Paiements recents</h4>
          <button type="button" onClick={() => onNavigateTab?.('payments')} className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide text-emerald-600 hover:text-emerald-700">
            Voir tous <ArrowRight size={14} />
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {schoolRecentPayments.length > 0 ? schoolRecentPayments.map((payment) => {
            const parsedDate = parseAnyDate(payment.date);
            const timeLabel = parsedDate && hasTimePrecision(payment.date)
              ? parsedDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
              : '--:--';
            const methodLabel = payment.method === 'ORANGE_MONEY' ? 'Orange Money' : payment.method === 'MOOV_MONEY' ? 'Moov Money' : 'Especes';
            const statusLabel = payment.status === 'completed' ? 'Confirme' : payment.status === 'pending' ? 'En attente' : 'Echoue';
            const statusClass = payment.status === 'completed'
              ? 'bg-emerald-50 text-emerald-700'
              : payment.status === 'pending'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-rose-50 text-rose-700';

            return (
              <div key={payment.id} className="grid grid-cols-1 gap-2 px-6 py-4 text-sm md:grid-cols-[70px_1fr_auto_auto] md:items-center md:gap-4">
                <p className="font-black text-slate-500">{timeLabel}</p>
                <p className="font-semibold text-slate-700">{payment.studentName}</p>
                <p className="font-black text-slate-900">{formatFcfa(payment.amount)} - {methodLabel}</p>
                <span className={`inline-flex w-fit rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${statusClass}`}>{statusLabel}</span>
              </div>
            );
          }) : (
            <div className="px-6 py-8 text-sm text-slate-500">Aucun paiement recent.</div>
          )}
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4">
          <h4 className="section-title">Statistiques par classe</h4>
        </div>
        <div className="divide-y divide-slate-100">
          {schoolClassStats.length > 0 ? schoolClassStats.map((item) => (
            <div key={item.className} className="grid grid-cols-1 gap-2 px-6 py-4 text-sm md:grid-cols-[90px_1fr_1fr] md:items-center">
              <p className="font-black text-slate-800">{item.className}</p>
              <p className="font-semibold text-slate-600">
                Total: {item.total} - Inscrits: {item.subscribed} ({item.subscriptionRate.toFixed(0)}%)
              </p>
              <p className="font-semibold text-slate-600">
                Presence: {item.present} ({item.presenceRate.toFixed(0)}%)
              </p>
            </div>
          )) : (
            <div className="px-6 py-8 text-sm text-slate-500">Aucune statistique de classe disponible.</div>
          )}
        </div>
      </div>

      <div className="surface-card p-6">
        <h4 className="section-title">Actions rapides</h4>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <button type="button" onClick={() => onNavigateTab?.('students')} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">+ Inscrire eleve</button>
          <button type="button" onClick={() => onNavigateTab?.('users')} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">+ Creer parent</button>
          <button type="button" onClick={() => onNavigateTab?.('payments')} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">Valider paiements</button>
          <button type="button" onClick={() => onNavigateTab?.('subscriptions')} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">Creer abonnement</button>
          <button type="button" onClick={() => onNavigateTab?.('menus')} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">Gerer menus</button>
          <button type="button" onClick={() => onNavigateTab?.('canteen-reports')} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">Rapport mensuel</button>
          <button type="button" onClick={() => onNavigateTab?.('users')} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">Gerer utilisateurs</button>
          <button type="button" onClick={() => onNavigateTab?.('tariffs')} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">Tarifs</button>
          <button type="button" onClick={() => onNavigateTab?.('students')} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">Exporter liste eleves</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
