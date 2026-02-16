import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Users,
  Sparkles,
} from 'lucide-react';
import { attendanceApi, menuApi, studentsApi, subscriptionsApi } from '../services/api';
import { MenuItem, Student } from '../types';

interface AttendanceRecord {
  id: string;
  studentId: string;
  name: string;
  time: string;
  className: string;
  present: boolean;
}

interface AttendanceProps {
  schoolId?: string;
  initialSearch?: string;
}

const toLocalDateKey = (value: string | Date): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toStringId = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return String(value._id || value.id || '');
  return String(value);
};

const getSubscriptionStatus = (subscription: any): Student['subscriptionStatus'] => {
  if (!subscription) return 'none';
  const status = String(subscription.status || '').toUpperCase();
  if (status !== 'ACTIVE' && status !== 'ACTIF') return 'expired';

  const endRaw = subscription.endDate || subscription.end_date || subscription.end_date;
  const endDate = endRaw ? new Date(endRaw) : null;
  if (endDate && !Number.isNaN(endDate.getTime())) {
    const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7) return 'warning';
  }

  return 'active';
};

const toMenuItemsLabel = (menu: MenuItem | null): string => {
  if (!menu?.items || menu.items.length === 0) return 'Non renseigné';
  return menu.items.map((item) => item.name).filter(Boolean).join(', ') || 'Non renseigné';
};

const toMenuPrimaryDishLabel = (menu: MenuItem | null): string => {
  if (!menu) return '';
  const itemNames = (menu.items || []).map((item) => item.name?.trim()).filter(Boolean) as string[];
  if (itemNames.length > 0) return itemNames[0];

  const description = (menu.description || '').trim();
  if (description) return description;

  const explicitName = (menu.mealName || menu.name || '').trim();
  return explicitName;
};

const toMenuDateKey = (menu: MenuItem | null): string => {
  if (!menu?.date) return '';
  if (typeof menu.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(menu.date)) return menu.date;
  return toLocalDateKey(menu.date);
};

const toMenuTime = (menu: MenuItem): number => {
  const menuDateKey = toMenuDateKey(menu);
  if (menuDateKey) {
    const keyBasedTime = new Date(`${menuDateKey}T12:00:00`).getTime();
    if (!Number.isNaN(keyBasedTime)) return keyBasedTime;
  }
  if (!menu.date) return Number.NaN;
  const parsed = new Date(menu.date).getTime();
  return Number.isNaN(parsed) ? Number.NaN : parsed;
};

const isMenuUsable = (menu: MenuItem): boolean => {
  const status = String(menu.status || '').toUpperCase();
  return status !== 'REJECTED' && status !== 'ARCHIVED';
};

const resolveEffectiveMenu = (
  menus: MenuItem[],
  todayKey: string,
  todayUtcKey: string
): { menu: MenuItem | null; usingFallback: boolean } => {
  const unique = new Map<string, MenuItem>();
  menus.forEach((menu) => {
    if (!menu?.id) return;
    if (!unique.has(menu.id)) unique.set(menu.id, menu);
  });

  const usableMenus = Array.from(unique.values()).filter(isMenuUsable);
  if (usableMenus.length === 0) return { menu: null, usingFallback: false };

  const todayMenu = usableMenus.find((menu) => {
    const menuDateKey = toMenuDateKey(menu);
    return !!menuDateKey && (menuDateKey === todayKey || menuDateKey === todayUtcKey);
  });
  if (todayMenu) return { menu: todayMenu, usingFallback: false };

  const todayAnchor = new Date(`${todayKey}T12:00:00`).getTime();
  const datedMenus = usableMenus
    .map((menu) => ({ menu, time: toMenuTime(menu) }))
    .filter(({ time }) => !Number.isNaN(time));

  const previousMenus = datedMenus
    .filter(({ time }) => time <= todayAnchor)
    .sort((a, b) => b.time - a.time);
  if (previousMenus.length > 0) return { menu: previousMenus[0].menu, usingFallback: true };

  const nextMenus = datedMenus
    .filter(({ time }) => time > todayAnchor)
    .sort((a, b) => a.time - b.time);
  if (nextMenus.length > 0) return { menu: nextMenus[0].menu, usingFallback: true };

  return { menu: usableMenus[0], usingFallback: true };
};

const Attendance: React.FC<AttendanceProps> = ({ schoolId, initialSearch = '' }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [menuForToday, setMenuForToday] = useState<MenuItem | null>(null);
  const [usingFallbackMenu, setUsingFallbackMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [absentSelection, setAbsentSelection] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const todayKey = toLocalDateKey(new Date());
  const todayUtcKey = new Date().toISOString().slice(0, 10);
  const menuIdForToday = menuForToday?.id || null;
  const menuDateKeyForPointing = toMenuDateKey(menuForToday);
  const menuLabelForToday = toMenuPrimaryDishLabel(menuForToday);
  const menuItemsLabel = toMenuItemsLabel(menuForToday);
  const menuDisplayLabel = menuItemsLabel !== 'Non renseigné' ? menuItemsLabel : (menuLabelForToday || 'Menu du jour');
  const menuDateLabelForPointing = menuDateKeyForPointing
    ? new Date(`${menuDateKeyForPointing}T12:00:00`).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';
  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const loadData = async () => {
    try {
      const [attendanceData, subscriptionsData, todayMenuData, menusData, studentsData] = await Promise.all([
        attendanceApi.getAttendance(schoolId || ''),
        subscriptionsApi.getSubscriptions(schoolId || ''),
        menuApi.getTodayMenu(schoolId || ''),
        menuApi.getMenus(schoolId || ''),
        studentsApi.getStudents(schoolId || ''),
      ]);

      const studentMap = new Map<string, Student>();
      (studentsData || []).forEach((student) => {
        if (student?.id) studentMap.set(student.id, student);
      });

      const paidMap = new Map<string, Student>();
      (subscriptionsData || []).forEach((sub: any) => {
        const normalizedStatus = getSubscriptionStatus(sub);
        if (normalizedStatus !== 'active' && normalizedStatus !== 'warning') return;

        const child = sub.child || sub.student || sub.student_id || sub.child_id || {};
        const childId = toStringId(
          sub.childId
          || sub.child_id
          || sub.studentId
          || sub.student_id
          || child
        );
        if (!childId) return;

        const linkedStudent = studentMap.get(childId);
        const childSchoolId = toStringId(child?.school_id || sub?.school_id);

        if (schoolId) {
          const linkedSchoolId = linkedStudent?.schoolId || '';
          if (linkedSchoolId && linkedSchoolId !== schoolId) return;
          if (!linkedSchoolId && childSchoolId && childSchoolId !== schoolId) return;
          if (!linkedSchoolId && !childSchoolId) return;
        }

        const firstName = child.first_name || child.firstName || linkedStudent?.firstName || '';
        const lastName = child.last_name || child.lastName || linkedStudent?.lastName || '';
        const className = child.class_name || child.grade || child.class || linkedStudent?.class || '';
        const parentPhone = linkedStudent?.parentPhone || '';

        paidMap.set(childId.toString(), {
          id: childId.toString(),
          firstName,
          lastName,
          class: className,
          parentPhone,
          schoolId: schoolId || linkedStudent?.schoolId || childSchoolId || '',
          qrCode: linkedStudent?.qrCode || `QR_${childId}`,
          subscriptionStatus: normalizedStatus,
        });
      });

      const paidStudents = Array.from(paidMap.values())
        .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
      setStudents(paidStudents);

      const records = (attendanceData || [])
        .filter((log: any) => {
          if (!log?.date) return false;
          const localKey = toLocalDateKey(log.date);
          const utcKey = new Date(log.date).toISOString().slice(0, 10);
          return localKey === todayKey || utcKey === todayUtcKey;
        })
        .map((log: any) => {
          const student = log.student_id || {};
          return {
            id: log._id || log.id || Math.random().toString(36).slice(2),
            studentId: (student._id || student.id || student || '').toString(),
            name: `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Eleve',
            time: new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            className: student.class_name || student.grade || '',
            present: log.present !== false,
          } as AttendanceRecord;
        });
      setTodayRecords(records.sort((a, b) => b.time.localeCompare(a.time)));

      const menuPool = [todayMenuData, ...(menusData || [])].filter(Boolean) as MenuItem[];
      const { menu: resolvedMenu, usingFallback } = resolveEffectiveMenu(menuPool, todayKey, todayUtcKey);
      setMenuForToday(resolvedMenu);
      setUsingFallbackMenu(usingFallback);
    } catch (error) {
      console.error('Attendance load error:', error);
      setStudents([]);
      setTodayRecords([]);
      setMenuForToday(null);
      setUsingFallbackMenu(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  useEffect(() => {
    setSearchTerm(initialSearch);
  }, [initialSearch]);

  const paidStudents = useMemo(
    () => students.filter((student) => student.subscriptionStatus === 'active' || student.subscriptionStatus === 'warning'),
    [students]
  );

  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    todayRecords.forEach((record) => {
      if (record.studentId) map.set(record.studentId, record);
    });
    return map;
  }, [todayRecords]);

  const filteredStudents = useMemo(() => {
    return paidStudents.filter((student) => {
      const query = searchTerm.toLowerCase();
      const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
      return fullName.includes(query) || student.class.toLowerCase().includes(query);
    });
  }, [paidStudents, searchTerm]);

  const totals = useMemo(() => {
    let present = 0;
    let absent = 0;
    let pending = 0;

    paidStudents.forEach((student) => {
      const record = attendanceMap.get(student.id);
      if (!record) {
        pending += 1;
        return;
      }
      if (record.present) present += 1;
      else absent += 1;
    });

    return {
      total: paidStudents.length,
      present,
      absent,
      pending,
      validated: paidStudents.length > 0 && pending === 0,
    };
  }, [paidStudents, attendanceMap]);

  const toggleAbsent = (studentId: string) => {
    setAbsentSelection((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const handleSaveRollCall = async () => {
    if (!menuIdForToday) {
      alert("Aucun menu disponible pour aujourd'hui. Impossible d'enregistrer l'appel.");
      return;
    }

    if (paidStudents.length === 0) {
      alert('Aucun eleve abonne actif trouve pour cette ecole.');
      return;
    }

    const pendingStudents = paidStudents.filter((student) => !attendanceMap.has(student.id));
    if (pendingStudents.length === 0) {
      alert("Tous les eleves payants ont deja ete enregistres aujourd'hui.");
      return;
    }

    try {
      setIsSaving(true);
      const results = await Promise.all(
        pendingStudents.map((student) => {
          const isAbsent = !!absentSelection[student.id];
          return attendanceApi.markAttendance({
            student_id: student.id,
            menu_id: menuIdForToday,
            present: !isAbsent,
            justified: false,
            reason: isAbsent ? 'Absence signalee au pointage' : '',
          });
        })
      );

      const failedCount = results.filter((ok) => !ok).length;
      if (failedCount > 0) {
        alert(`${failedCount} enregistrement(s) ont echoue. Verifiez puis reessayez.`);
      }

      setAbsentSelection({});
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <Sparkles size={12} />
              Service du jour
            </div>
            <h2 className="text-2xl font-black text-slate-900">Pointage de la Cantine</h2>
            <p className="mt-2 text-sm text-slate-500">{todayLabel}</p>
          </div>
          <div
            className={`inline-flex items-center rounded-full border px-3 py-2 text-xs font-black uppercase tracking-widest ${
              menuIdForToday && !usingFallbackMenu
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : menuIdForToday
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {menuIdForToday && !usingFallbackMenu
              ? 'Menu du jour disponible'
              : menuIdForToday
                ? 'Menu de secours actif'
                : 'Menu du jour manquant'}
          </div>
        </div>

        {menuIdForToday && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
            <p>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plat du jour:</span>{' '}
              <span className="font-semibold text-slate-900">{menuDisplayLabel}</span>
            </p>
            {menuDateLabelForPointing && (
              <p>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date menu:</span>{' '}
                <span className="font-medium">{menuDateLabelForPointing}</span>
              </p>
            )}
            <p>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type:</span>{' '}
              <span className="font-medium">{menuForToday?.mealType || '-'}</span>
            </p>
            <p>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Composition:</span>{' '}
              <span className="font-medium">{menuItemsLabel}</span>
            </p>
            {usingFallbackMenu && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                Aucun menu cree exactement pour aujourd'hui. Le pointage utilise ce menu de secours.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
              placeholder="Rechercher un eleve ou une classe..."
            />
          </div>

          <button
            onClick={handleSaveRollCall}
            disabled={!menuIdForToday || isSaving}
            className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-[11px] font-black uppercase tracking-widest transition ${
              menuIdForToday && !isSaving
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 size={14} />
            {isSaving ? 'Enregistrement...' : "Valider l'appel du jour"}
          </button>
        </div>
      </div>

      {totals.validated && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total eleves pointes</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{totals.total}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Total presents</p>
            <p className="mt-2 text-2xl font-black text-emerald-700">{totals.present}</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">Total absents</p>
            <p className="mt-2 text-2xl font-black text-rose-700">{totals.absent}</p>
          </div>
        </div>
      )}

      {!totals.validated && totals.total > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
          Appel en cours: {totals.pending} eleve(s) restant(s) a enregistrer aujourd'hui.
        </div>
      )}

      <div className="space-y-4">
        {!menuIdForToday && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <AlertCircle size={18} />
            Aucun menu pour aujourd'hui. Le pointage est desactive.
          </div>
        )}

        <div className="table-shell">
          <div className="p-6 border-b border-slate-100 bg-slate-100/60 flex justify-between items-center">
            <div>
              <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Appel journalier</h4>
              <p className="text-xs text-slate-400 mt-1">Cochez uniquement les absents, puis validez l'appel.</p>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg font-black uppercase tracking-tighter">
              {filteredStudents.length} eleves payants
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[620px] custom-scrollbar">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => {
                const record = attendanceMap.get(student.id);
                const isAbsentChecked = record ? !record.present : !!absentSelection[student.id];
                const isDisabled = !!record || !menuIdForToday || isSaving;
                const statusLabel = record ? (record.present ? 'Present' : 'Absent') : 'En attente';
                const statusStyle = record
                  ? (record.present ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200')
                  : 'bg-slate-100 text-slate-500 border-slate-200';

                return (
                  <div key={student.id} className="p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between transition-colors hover:bg-slate-100/60">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all shadow-sm bg-emerald-50 text-emerald-600">
                        {`${student.firstName[0] || ''}${student.lastName[0] || ''}`}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-slate-800">{student.firstName} {student.lastName}</p>
                          <span className={`text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-md border ${statusStyle}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Classe: {student.class}</p>
                        {record && (
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Enregistre a {record.time}</p>
                        )}
                      </div>
                    </div>

                    <label
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-widest transition ${
                        isAbsentChecked ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 text-slate-500'
                      } ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-rose-200 hover:bg-rose-50'}`}
                    >
                      <input
                        type="checkbox"
                        checked={isAbsentChecked}
                        disabled={isDisabled}
                        onChange={() => toggleAbsent(student.id)}
                        className="h-4 w-4 rounded border-slate-300 text-rose-500"
                      />
                      Absent
                    </label>
                  </div>
                );
              })
            ) : (
              <div className="p-24 text-center text-slate-400 font-medium">
                <Users size={64} className="mx-auto mb-4 opacity-10" />
                <p className="font-black uppercase tracking-widest text-sm">Aucun eleve payant</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
