import React, { useMemo, useEffect, useState } from 'react';
import { TrendingUp, Clock, Utensils } from 'lucide-react';
import { UserRole, Student, Payment, School, MenuItem } from '../types';
import { attendanceApi, menuApi, paymentsApi, schoolsApi, studentsApi } from '../services/api';

interface DashboardProps {
  searchQuery?: string;
  userRole: UserRole;
  schoolId?: string;
}

type Activity = {
  id: string;
  user: string;
  action: string;
  time: string;
  amount?: string;
  schoolId?: string;
}

const toLocalDateKey = (value: string | Date): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toMenuPrimaryDishLabel = (menu: MenuItem | null): string => {
  if (!menu) return '';
  const itemNames = (menu.items || []).map((item) => item.name?.trim()).filter(Boolean) as string[];
  if (itemNames.length > 0) return itemNames[0];

  const description = (menu.description || '').trim();
  if (description) return description;

  return (menu.mealName || menu.name || '').trim();
};

const Dashboard: React.FC<DashboardProps> = ({ searchQuery = '', userRole, schoolId }) => {
  const isSuperAdmin = userRole === UserRole.SUPER_ADMIN;
  const isCanteenManager = userRole === UserRole.CANTEEN_MANAGER;
  const canSeePayments = userRole === UserRole.SUPER_ADMIN || userRole === UserRole.SCHOOL_ADMIN;

  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        // Charger les données selon le rôle
        const [
          studentsData,
          paymentsData,
          attendanceData,
          todayMenuData,
          menusData,
          schoolsData,
        ] = await Promise.all([
          isCanteenManager ? Promise.resolve([]) : studentsApi.getStudents(schoolId),
          canSeePayments ? paymentsApi.getPayments(schoolId) : Promise.resolve([]),
          isSuperAdmin ? Promise.resolve([]) : attendanceApi.getAttendance(schoolId),
          isCanteenManager ? menuApi.getTodayMenu(schoolId) : Promise.resolve(null),
          isCanteenManager ? menuApi.getMenus(schoolId) : Promise.resolve([]),
          isSuperAdmin ? schoolsApi.getSchools() : Promise.resolve([]),
        ]);

        if (cancelled) return;

        setStudents(studentsData);
        setPayments(paymentsData);
        setAttendanceLogs(attendanceData || []);
        setMenus(todayMenuData ? [todayMenuData] : (menusData || []));
        setSchools(schoolsData || []);
} catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };

    loadData();

    return () => { cancelled = true; };
  }, [schoolId, isSuperAdmin, isCanteenManager, canSeePayments]);

  const todayKey = toLocalDateKey(new Date());
  const todayUtcKey = new Date().toISOString().slice(0, 10);
  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const getWeekStart = (date: Date) => {
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const normalizedAttendance = useMemo(() => {
    return (attendanceLogs || []).map((log: any) => {
      const student = log.student_id || {};
      const menu = log.menu_id || {};
      const date = log.date ? new Date(log.date) : null;
      const studentId = student._id || student.id || student;
      return {
        id: log._id || log.id || Math.random().toString(36).slice(2),
        studentId: studentId ? studentId.toString() : '',
        name: `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Élève',
        className: student.class_name || student.grade || '',
        present: log.present !== false,
        date,
        menuName: menu.meal_name || menu.name || menu.description || '',
      };
    });
  }, [attendanceLogs]);

  const todayAttendance = useMemo(() => {
    return normalizedAttendance.filter((log) => {
      if (!log.present || !log.date) return false;
      const dateKey = toLocalDateKey(log.date);
      const utcKey = new Date(log.date).toISOString().slice(0, 10);
      return dateKey === todayKey || utcKey === todayUtcKey;
    });
  }, [normalizedAttendance, todayKey, todayUtcKey]);
  const dailyAttendance = useMemo(() => {
    return (attendanceLogs || []).filter((log: any) => {
      if (!log?.date) return false;
      const dateKey = toLocalDateKey(log.date);
      const utcKey = new Date(log.date).toISOString().slice(0, 10);
      return dateKey === todayKey || utcKey === todayUtcKey;
    });
  }, [attendanceLogs, todayKey, todayUtcKey]);
// Activités réelles (simulées à partir des paiements et abonnements pour rester exact)
  const realActivities = useMemo(() => {
    const acts: Activity[] = [];
    // Ajouter les 3 derniers paiements
    payments.slice(-3).forEach(p => {
      acts.push({
        id: `p-${p.id}`,
        user: p.studentName,
        action: `Paiement ${p.status === 'completed' ? 'valide' : 'en attente'}`,
        time: 'Recemment',
        amount: `${p.amount.toLocaleString()} FCFA`,
        schoolId: p.schoolId
      });
    });

    // Ajouter les derniers passages
    dailyAttendance.slice(-2).forEach((log: any) => {
      const student = log.student_id || {};
      const name = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Eleve';
      const time = log.date
        ? new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Recemment';
      acts.push({
        id: `l-${log._id || log.id || Math.random().toString(36).slice(2)}`,
        user: name,
        action: 'Passage cantine valide',
        time,
        schoolId: student.school_id ? student.school_id.toString() : undefined
      });
    });

    return acts.sort((a, b) => b.id.localeCompare(a.id));
  }, [payments, dailyAttendance]);

  const filteredActivities = realActivities.filter(act => {
    const matchesSearch = act.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         act.action.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });
  if (isCanteenManager) {
    const menuForToday = menus.find((menu) => menu.date === todayKey)
      || menus.find((menu) => menu.date === todayUtcKey)
      || null;
    const menuName = toMenuPrimaryDishLabel(menuForToday) || 'Menu du jour';
    const menuStatusLabel = menuForToday ? menuName : 'Aucun menu pour aujourd’hui';

    const recentLogs = [...todayAttendance]
      .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))
      .slice(0, 6);
    const lastLogTime = recentLogs[0]?.date
      ? recentLogs[0].date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '—';

    return (
      <div className="animate-in fade-in duration-500">
        <div className="surface-card p-6 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <Utensils size={12} />
                Tableau cantine
              </div>
              <h2 className="text-2xl font-black text-slate-900">Tableau de bord cantine</h2>
              <p className="mt-2 text-sm text-slate-500">{todayLabel}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1">
                <span className="font-black text-slate-800">{todayAttendance.length}</span>
                présences
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1">
                <Clock size={14} />
                Dernier passage {lastLogTime}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Menu du jour</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{menuStatusLabel}</p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h4 className="section-title">Derniers passages</h4>
              <span className="text-[10px] font-black uppercase text-slate-400">Aujourd'hui</span>
            </div>
            <div className="mt-4 space-y-3">
              {recentLogs.length > 0 ? recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{log.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                      {log.className || 'Classe'} • {log.date ? log.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </p>
                  </div>
                  <div className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                    Validé
                  </div>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                  Aucun passage enregistré pour le moment.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const headerTitle = isSuperAdmin ? 'Tableau de bord global' : 'Dashboard École';
  const headerSubtitle = isSuperAdmin
    ? 'Suivi centralisé des écoles partenaires, recettes et activité du réseau.'
    : 'Pilotez les abonnements, présences et revenus de votre établissement.';
  const headerBadge = isSuperAdmin ? 'Vue globale' : 'Vue école';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="page-hero">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 pill">
              <TrendingUp size={14} />
              {headerBadge}
            </div>
            <h2 className="page-title">{headerTitle}</h2>
            <p className="mt-2 page-subtitle">{headerSubtitle}</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-slate-100">
            {todayLabel}
          </div>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h4 className="section-title">Derniers Événements Système</h4>
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Données exactes</span>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredActivities.length > 0 ? filteredActivities.map((activity) => (
            <div key={activity.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{activity.user}</p>
                  <p className={`text-[10px] font-black uppercase text-slate-400`}>{activity.action}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase">{activity.time}</p>
                {activity.amount && <p className="text-sm font-black text-emerald-600 mt-0.5">{activity.amount}</p>}
              </div>
            </div>
          )) : (
            <div className="p-12 text-center text-slate-400 font-medium">Aucun événement récent enregistré.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;












