
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Check,
  Edit2,
  FileText,
  Info,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  School as SchoolIcon,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { menuApi, paymentsApi, schoolsApi, studentsApi, subscriptionsApi } from '../services/api';
import { MenuItem, Payment, School, Student } from '../types';
import { authStorage } from '../utils/authStorage';

interface SchoolsProps {
  initialSearch?: string;
  onNavigateTab?: (tab: string) => void;
}

type PerformanceBand = 'high' | 'medium' | 'low';
type OperationalStatus = 'ACTIVE' | 'INACTIVE';

type SchoolView = School & {
  activeCanteenStudents: number;
  monthlyRevenue: number;
  usageRate: number;
  performanceBand: PerformanceBand;
  operationalStatus: OperationalStatus;
  needsAttention: boolean;
  contactPhone: string;
  contactEmail: string;
  createdLabel: string;
  warningNote?: string;
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['ACTIVE', 'APPROVED', 'COMPLETED']);
const ITEMS_PER_PAGE = 3;

const RATE_KEYS = ['daily', 'weekly', 'monthly', 'quarterly'] as const;
type RateKey = typeof RATE_KEYS[number];
type TariffRates = Record<RateKey, number>;

type TariffHistoryEntry = {
  id?: string;
  date?: string;
  message?: string;
  by?: string;
};

const RATE_LABELS: Record<RateKey, string> = {
  daily: 'Journalier',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
};

const DEFAULT_TARIFF_RATES: TariffRates = {
  daily: 500,
  weekly: 3000,
  monthly: 15000,
  quarterly: 40000,
};

const MEAL_TYPE_LABELS: Record<string, string> = {
  BREAKFAST: 'PETIT DEJEUNER',
  LUNCH: 'DEJEUNER',
  DINNER: 'DINER',
};

const formatFcfa = (value: number): string => `${Math.round(value).toLocaleString('fr-FR')} FCFA`;

const toEntityId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const source = value as Record<string, unknown>;
    return String(source._id || source.id || '');
  }
  return String(value);
};

const toMonthKey = (dateValue: string | Date): string => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

const buildFallbackPhone = (schoolId: string, index: number): string => {
  const seed = (schoolId.replace(/[^0-9]/g, '').slice(-6) || `${100000 + index}`).padStart(6, '0');
  return `+226 ${seed.slice(0, 2)} ${seed.slice(2, 4)} ${seed.slice(4, 6)} 00`;
};

const toSubSchoolId = (raw: any): string => {
  const child = raw?.child || raw?.child_id || null;
  return toEntityId(raw?.school_id || raw?.schoolId || child?.school_id || child?.schoolId);
};

const toSubStatus = (raw: any): string => String(raw?.status || '').toUpperCase();

const toSubDate = (raw: any): string => {
  const source = raw?.start_date || raw?.startDate || raw?.created_at || raw?.createdAt || new Date().toISOString();
  const parsed = new Date(source);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const toCreatedLabel = (school: School): string => {
  const source = school.createdAt || school.lastPaymentDate;
  if (!source) return '--';
  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleDateString('fr-FR');
};

const toPerformanceBand = (usageRate: number): PerformanceBand => {
  if (usageRate >= 85) return 'high';
  if (usageRate >= 75) return 'medium';
  return 'low';
};

const toMealTypeLabel = (mealType?: string): string => {
  const key = String(mealType || '').toUpperCase().trim();
  return MEAL_TYPE_LABELS[key] || (mealType || '--');
};

const Schools: React.FC<SchoolsProps> = ({ initialSearch = '', onNavigateTab }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<SchoolView | null>(null);
  const [showCredentials, setShowCredentials] = useState<{ email: string; password: string } | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [performanceFilter, setPerformanceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = async () => {
    try {
      const [schoolsData, studentsData, paymentsData, subscriptionsData, menusData] = await Promise.all([
        schoolsApi.getSchools(),
        studentsApi.getStudents(''),
        paymentsApi.getPayments(''),
        subscriptionsApi.getSubscriptions(''),
        menuApi.getMenus(''),
      ]);

      setSchools(schoolsData || []);
      setStudents(studentsData || []);
      setPayments(paymentsData || []);
      setSubscriptions(subscriptionsData || []);
      setMenus(menusData || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des ecoles:', error);
      setSchools([]);
      setStudents([]);
      setPayments([]);
      setSubscriptions([]);
      setMenus([]);
    }
  };

  useEffect(() => {
    loadData();

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        closeDeleteModal();
        setSelectedSchool(null);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSchool(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const closeCredentialsModal = () => {
    setShowCredentials(null);
    closeModal();
    loadData();
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSchoolToDelete(null);
  };

  const openDeleteModal = (school: School) => {
    setSchoolToDelete(school);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!schoolToDelete) return;
    try {
      const deleted = await schoolsApi.deleteSchool(schoolToDelete.id);
      if (!deleted) {
        alert('Suppression impossible.');
        return;
      }
      await loadData();
      closeDeleteModal();
    } catch (error: any) {
      alert(error?.message || "Erreur lors de la suppression de l'ecole.");
    }
  };

  const handleEdit = (school: School) => {
    setEditingSchool(school);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      if (editingSchool) {
        const schoolData = {
          name: String(formData.get('schoolName') || ''),
          address: String(formData.get('schoolAddress') || ''),
          city: String(formData.get('schoolCity') || ''),
          adminName: String(formData.get('adminName') || ''),
          studentCount: parseInt(String(formData.get('count') || '0'), 10) || 0,
          status: String(formData.get('status') || 'active') as 'active' | 'inactive',
          lastPaymentDate: editingSchool.lastPaymentDate || new Date().toISOString(),
        };

        const updated = await schoolsApi.updateSchool(editingSchool.id, schoolData as any);
        if (!updated) {
          alert('Impossible de modifier cette ecole.');
          return;
        }

        closeModal();
        await loadData();
      } else {
        const schoolAdminData = {
          schoolName: String(formData.get('schoolName') || ''),
          schoolAddress: String(formData.get('schoolAddress') || ''),
          schoolCity: String(formData.get('schoolCity') || ''),
          adminFirstName: String(formData.get('adminFirstName') || ''),
          adminLastName: String(formData.get('adminLastName') || ''),
          adminPhone: String(formData.get('adminPhone') || '') || undefined,
        };

        const token = authStorage.getToken();
        if (!token) {
          alert("Erreur: Vous n'etes pas connecte. Veuillez vous reconnecter.");
          return;
        }

        const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/schools`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: schoolAdminData.schoolName,
            address: schoolAdminData.schoolAddress,
            city: schoolAdminData.schoolCity,
            adminName: `${schoolAdminData.adminFirstName} ${schoolAdminData.adminLastName}`,
            createWithAdmin: true,
            adminFirstName: schoolAdminData.adminFirstName,
            adminLastName: schoolAdminData.adminLastName,
            adminPhone: schoolAdminData.adminPhone,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          try {
            const errorJson = JSON.parse(errorText);
            alert(`Erreur ${response.status}: ${errorJson.message || 'Erreur inconnue'}`);
          } catch {
            alert(`Erreur ${response.status}: ${errorText || 'Erreur reseau'}`);
          }
          return;
        }

        const result = await response.json();
        if (result?.success) {
          const credentials = result?.data?.credentials || result?.credentials;
          if (credentials?.email && credentials?.temporaryPassword) {
            setShowCredentials({
              email: credentials.email,
              password: credentials.temporaryPassword,
            });
          } else {
            alert("Ecole creee, mais aucun identifiant admin n'a ete renvoye par le serveur.");
            closeModal();
            await loadData();
          }
        } else {
          alert(`Erreur: ${result?.message || 'Impossible de creer le School Admin'}`);
        }
      }
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert(error?.message || 'Erreur reseau lors de la sauvegarde. Veuillez reessayer.');
    }
  };

  const schoolViews = useMemo<SchoolView[]>(() => {
    const currentMonthKey = toMonthKey(new Date());

    const studentsBySchool = students.reduce<Record<string, number>>((acc, student) => {
      const schoolId = String(student.schoolId || '').trim();
      if (!schoolId) return acc;
      acc[schoolId] = (acc[schoolId] || 0) + 1;
      return acc;
    }, {});
    const studentSchoolByStudentId = students.reduce<Record<string, string>>((acc, student) => {
      const studentId = String(student.id || '').trim();
      const schoolId = String(student.schoolId || '').trim();
      if (!studentId || !schoolId) return acc;
      acc[studentId] = schoolId;
      return acc;
    }, {});

    const activeStudentsBySchool = students.reduce<Record<string, number>>((acc, student) => {
      if (student.subscriptionStatus !== 'active') return acc;
      const schoolId = String(student.schoolId || '').trim();
      if (!schoolId) return acc;
      acc[schoolId] = (acc[schoolId] || 0) + 1;
      return acc;
    }, {});

    const activeSubscriptionsBySchool = (subscriptions || []).reduce<Record<string, number>>((acc, sub: any) => {
      const schoolId = toSubSchoolId(sub);
      if (!schoolId) return acc;
      if (!ACTIVE_SUBSCRIPTION_STATUSES.has(toSubStatus(sub))) return acc;
      acc[schoolId] = (acc[schoolId] || 0) + 1;
      return acc;
    }, {});
    const subscriptionSchoolBySubscriptionId = (subscriptions || []).reduce<Record<string, string>>((acc, sub: any) => {
      const subscriptionId = toEntityId(sub);
      const schoolId = toSubSchoolId(sub);
      if (!subscriptionId || !schoolId) return acc;
      acc[subscriptionId] = schoolId;
      return acc;
    }, {});

    const monthlyRevenueBySchool = (payments || []).reduce<Record<string, number>>((acc, payment) => {
      if (payment.status !== 'completed') return acc;
      if (toMonthKey(payment.date) !== currentMonthKey) return acc;
      const schoolId = String(
        payment.schoolId
        || studentSchoolByStudentId[String(payment.studentId || '').trim()]
        || subscriptionSchoolBySubscriptionId[String(payment.subscriptionId || '').trim()]
        || ''
      ).trim();
      if (!schoolId) return acc;
      acc[schoolId] = (acc[schoolId] || 0) + Number(payment.amount || 0);
      return acc;
    }, {});

    const lastSubDateBySchool = (subscriptions || []).reduce<Record<string, string>>((acc, sub: any) => {
      const schoolId = toSubSchoolId(sub);
      if (!schoolId) return acc;
      const date = toSubDate(sub);
      if (!acc[schoolId] || new Date(date).getTime() > new Date(acc[schoolId]).getTime()) {
        acc[schoolId] = date;
      }
      return acc;
    }, {});

    return schools.map((school, index) => {
      const fallbackEmail = school.email || '--';
      const fallbackPhone = school.phone || '--';
      const studentCount = studentsBySchool[school.id] ?? school.studentCount ?? 0;
      const activeFromSubs = activeSubscriptionsBySchool[school.id] ?? 0;
      const activeFromStudents = activeStudentsBySchool[school.id] ?? 0;
      const activeCanteenStudents = Math.max(activeFromSubs, activeFromStudents);
      const monthlyRevenue = monthlyRevenueBySchool[school.id] ?? 0;
      const usageRate = studentCount > 0 ? (activeCanteenStudents / studentCount) * 100 : 0;
      const performanceBand = toPerformanceBand(usageRate);

      const operationalStatus: OperationalStatus = school.status === 'inactive'
        ? 'INACTIVE'
        : 'ACTIVE';

      const staleReport = lastSubDateBySchool[school.id]
        ? (Date.now() - new Date(lastSubDateBySchool[school.id]).getTime()) / (1000 * 60 * 60 * 24) > 15
        : true;

      const needsAttention = performanceBand === 'low' || staleReport;
      const warningNote = needsAttention
        ? staleReport
          ? 'Rapport mensuel non recu depuis plus de 15 jours.'
          : "Taux d'utilisation en baisse."
        : undefined;

      return {
        ...school,
        studentCount,
        activeCanteenStudents,
        monthlyRevenue,
        usageRate,
        performanceBand,
        operationalStatus,
        needsAttention,
        contactPhone: fallbackPhone,
        contactEmail: fallbackEmail,
        createdLabel: toCreatedLabel(school),
        warningNote,
      };
    });
  }, [schools, students, payments, subscriptions]);

  const cityOptions = useMemo(() => {
    return Array.from(new Set(schoolViews.map((school) => school.city).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'fr')
    );
  }, [schoolViews]);

  const filteredSchools = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return schoolViews.filter((school) => {
      const matchStatus = statusFilter === 'all' || school.status === statusFilter;
      const matchCity = cityFilter === 'all' || school.city === cityFilter;
      const matchPerformance = performanceFilter === 'all' || school.performanceBand === performanceFilter;
      const matchSearch = !query
        || school.name.toLowerCase().includes(query)
        || school.city.toLowerCase().includes(query)
        || school.adminName.toLowerCase().includes(query)
        || school.contactEmail.toLowerCase().includes(query);

      return matchStatus && matchCity && matchPerformance && matchSearch;
    });
  }, [schoolViews, statusFilter, cityFilter, performanceFilter, searchQuery]);

  const selectedSchoolMenus = useMemo(() => {
    if (!selectedSchool) return [];

    return menus
      .filter((menu) => String(menu.schoolId || '').trim() === selectedSchool.id)
      .sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [menus, selectedSchool]);
  const selectedSchoolTariffs = useMemo(() => {
    if (!selectedSchool) return null;

    try {
      const keyCandidates = Array.from(
        new Set(
          [
            String(selectedSchool.id || '').trim(),
            slugify(String(selectedSchool.name || '').trim()),
          ].filter(Boolean)
        )
      );

      const raw = keyCandidates
        .map((key) => localStorage.getItem(`tariffs:${key}`))
        .find((item) => Boolean(item));
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      const ratesRaw = parsed?.rates || {};
      const rates: TariffRates = {
        daily: Number(ratesRaw.daily ?? DEFAULT_TARIFF_RATES.daily) || DEFAULT_TARIFF_RATES.daily,
        weekly: Number(ratesRaw.weekly ?? DEFAULT_TARIFF_RATES.weekly) || DEFAULT_TARIFF_RATES.weekly,
        monthly: Number(ratesRaw.monthly ?? DEFAULT_TARIFF_RATES.monthly) || DEFAULT_TARIFF_RATES.monthly,
        quarterly: Number(ratesRaw.quarterly ?? DEFAULT_TARIFF_RATES.quarterly) || DEFAULT_TARIFF_RATES.quarterly,
      };

      const history = Array.isArray(parsed?.history) ? parsed.history : [];
      const lastEntry = history.length > 0 ? (history[0] as TariffHistoryEntry) : null;

      return { rates, lastEntry };
    } catch {
      return null;
    }
  }, [selectedSchool]);
  const totalPages = Math.max(1, Math.ceil(filteredSchools.length / ITEMS_PER_PAGE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const paginatedSchools = filteredSchools.slice(
    (currentPageSafe - 1) * ITEMS_PER_PAGE,
    currentPageSafe * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, cityFilter, performanceFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = schoolViews.length;
    const active = schoolViews.filter((school) => school.status === 'active').length;
    const inactive = schoolViews.filter((school) => school.status === 'inactive').length;

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = schoolViews.filter((school) => {
      const source = school.createdAt;
      if (!source) return false;
      const parsed = new Date(source);
      if (Number.isNaN(parsed.getTime())) return false;
      return parsed.getTime() >= thirtyDaysAgo;
    }).length;

    return { total, active, inactive, recent };
  }, [schoolViews]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="surface-card p-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <SchoolIcon size={12} />
            Gestion des ecoles
          </div>
          <h2 className="section-title">Gestion des Ecoles</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Pilotage des etablissements, performances et actions administratives.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingSchool(null);
            setIsModalOpen(true);
          }}
          className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold"
        >
          <Plus size={16} />
          <span>Creer ecole</span>
        </button>
      </div>

      <div className="surface-card p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[180px_180px_200px_1fr] lg:items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <option value="all">Toutes</option>
            <option value="active">Actives</option>
            <option value="inactive">Inactives</option>
          </select>

          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <option value="all">Ville</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          <select
            value={performanceFilter}
            onChange={(e) => setPerformanceFilter(e.target.value as 'all' | 'high' | 'medium' | 'low')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <option value="all">Performance</option>
            <option value="high">Elevee</option>
            <option value="medium">Moyenne</option>
            <option value="low">A surveiller</option>
          </select>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une ecole..."
              className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="surface-card p-5">
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600">
          <span>Total ecoles : <strong className="text-slate-900">{stats.total}</strong></span>
          <span>|</span>
          <span>Actives : <strong className="text-emerald-700">{stats.active}</strong></span>
          <span>|</span>
          <span>Inactives : <strong className="text-rose-700">{stats.inactive}</strong></span>
          <span>|</span>
          <span>Nouvelles (30j) : <strong className="text-amber-700">{stats.recent}</strong></span>
        </div>
      </div>

      <div className="surface-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="section-title">Liste des Ecoles</h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Affichage {paginatedSchools.length} sur {filteredSchools.length}
          </span>
        </div>

        <div className="space-y-4">
          {paginatedSchools.length > 0 ? paginatedSchools.map((school) => {
            const statusTone = school.operationalStatus === 'ACTIVE'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-50 text-slate-600 border-slate-200';

            const usageTone = school.usageRate >= 85
              ? 'text-emerald-700'
              : school.usageRate >= 75
                ? 'text-amber-700'
                : 'text-rose-700';

            return (
              <div key={school.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2">
                    <SchoolIcon size={18} className="text-slate-500" />
                    <h4 className="text-lg font-black text-slate-800">{school.name}</h4>
                  </div>
                  <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusTone}`}>
                    {school.operationalStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 text-sm text-slate-600 md:grid-cols-2 lg:grid-cols-3">
                  <p className="inline-flex items-center gap-2"><MapPin size={14} className="text-slate-400" /> {school.city}, {school.address}</p>
                  <p className="inline-flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {school.contactPhone}</p>
                  <p className="inline-flex items-start gap-2"><Mail size={14} className="text-slate-400 mt-0.5" /> <span className="break-all">{school.contactEmail}</span></p>
                  <p className="inline-flex items-center gap-2"><Users size={14} className="text-slate-400" /> School Admin : {school.adminName}</p>
                  <p>Eleves inscrits : <strong>{school.studentCount}</strong> ({school.activeCanteenStudents} actifs cantine)</p>
                  <p>Revenus mois : <strong>{school.monthlyRevenue.toLocaleString('fr-FR')} FCFA</strong></p>
                  <p className={usageTone}>Taux utilisation : <strong>{school.usageRate.toFixed(0)}%</strong></p>
                  <p>Creee le : <strong>{school.createdLabel}</strong></p>
                </div>

                {school.warningNote && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                    <AlertTriangle size={14} />
                    <span>{school.warningNote}</span>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button onClick={() => setSelectedSchool(school)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1"><BarChart3 size={13} /> Voir plus</button>
                  <button onClick={() => handleEdit(school)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1"><Edit2 size={13} /> Modifier</button>
                  <button onClick={() => openDeleteModal(school)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-red-700 hover:bg-red-100 inline-flex items-center gap-1"><Trash2 size={13} /> Supprimer</button>
                  {school.needsAttention ? (
                    <>
                      <button
                        onClick={() => {
                          window.location.href = `mailto:${school.contactEmail}`;
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1"
                      >
                        <Mail size={13} /> Contacter
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => onNavigateTab?.('users')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1"><Users size={13} /> Utilisateurs</button>
                      <button onClick={() => onNavigateTab?.('school-admin-reports')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1"><FileText size={13} /> Rapports</button>
                    </>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
              <Search size={44} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-bold text-slate-500">Aucune ecole ne correspond aux filtres.</p>
            </div>
          )}
        </div>

        {filteredSchools.length > ITEMS_PER_PAGE && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-9 w-9 rounded-lg border text-sm font-black ${page === currentPageSafe
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  {page}
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-slate-500">
              Page {currentPageSafe} / {totalPages}
            </p>
          </div>
        )}
      </div>

      {selectedSchool && (
        <div
          className="fixed inset-0 z-[95] overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
          onClick={(e) => e.currentTarget === e.target && setSelectedSchool(null)}
        >
          <div className="mx-auto my-4 w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="section-title">Details ecole</h3>
              <button onClick={() => setSelectedSchool(null)} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm text-slate-600 md:grid-cols-2">
              <p><strong>Nom :</strong> {selectedSchool.name}</p>
              <p><strong>Ville :</strong> {selectedSchool.city}</p>
              <p><strong>Adresse :</strong> {selectedSchool.address}</p>
              <p><strong>Admin :</strong> {selectedSchool.adminName}</p>
              <p className="md:col-span-2"><strong>Email :</strong> <span className="break-all">{selectedSchool.contactEmail}</span></p>
              <p><strong>Telephone :</strong> {selectedSchool.contactPhone}</p>
              <p><strong>Eleves :</strong> {selectedSchool.studentCount}</p>
              <p><strong>Actifs cantine :</strong> {selectedSchool.activeCanteenStudents}</p>
              <p><strong>Revenus mensuels :</strong> {selectedSchool.monthlyRevenue.toLocaleString('fr-FR')} FCFA</p>
              <p><strong>Taux utilisation :</strong> {selectedSchool.usageRate.toFixed(1)}%</p>
              <p><strong>Creee le :</strong> {selectedSchool.createdLabel}</p>
              <p><strong>Statut :</strong> {selectedSchool.operationalStatus}</p>
            </div>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <h4 className="text-sm font-black text-slate-700 mb-3">Menus proposes par l'ecole</h4>
              {selectedSchoolMenus.length > 0 ? (
                <div className="space-y-2">
                  {selectedSchoolMenus.map((menu) => (
                    <div key={menu.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      <p className="font-black text-slate-800">{menu.name || menu.description || menu.mealName || 'Menu'}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {(menu.date ? new Date(menu.date).toLocaleDateString('fr-FR') : '--')} - {toMealTypeLabel(menu.mealType)} - {(menu.status || 'PENDING')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-medium text-slate-500">Aucun menu propose pour cette ecole.</p>
              )}
            </div>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <h4 className="text-sm font-black text-slate-700 mb-3">Tarifs proposes par l'ecole</h4>
              {selectedSchoolTariffs ? (
                <>
                  <div className="grid grid-cols-1 gap-2 text-xs text-slate-700 sm:grid-cols-2">
                    {RATE_KEYS.map((key) => (
                      <p key={key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <strong>{RATE_LABELS[key]} :</strong> {formatFcfa(selectedSchoolTariffs.rates[key])}
                      </p>
                    ))}
                  </div>
                  {selectedSchoolTariffs.lastEntry && (
                    <p className="mt-3 text-[11px] text-slate-500">
                      Derniere mise a jour : {selectedSchoolTariffs.lastEntry.date ? new Date(selectedSchoolTariffs.lastEntry.date).toLocaleDateString('fr-FR') : '--'}
                      {selectedSchoolTariffs.lastEntry.by ? ` par ${selectedSchoolTariffs.lastEntry.by}` : ''}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs font-medium text-slate-500">Aucun tarif configure pour cette ecole.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
          onClick={(e) => e.target === e.currentTarget && closeDeleteModal()}
        >
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border-4 border-red-500/10">
            <div className="p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6">
                <AlertTriangle size={40} />
              </div>
              <h3 className="section-title mb-2">Supprimer l'ecole ?</h3>
              <p className="text-slate-500 font-medium mb-6">
                Vous allez supprimer <span className="text-red-600 font-bold">"{schoolToDelete?.name}"</span>.
                Cette action est irreversible.
              </p>

              <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-left mb-8">
                <p className="text-[10px] font-black text-red-800 uppercase tracking-widest mb-2 inline-flex items-center gap-1">
                  <Info size={12} /> Consequences
                </p>
                <ul className="text-xs text-red-700 font-bold space-y-1 opacity-80">
                  <li>� Suppression des comptes eleves relies</li>
                  <li>� Perte de l'historique de paiements</li>
                  <li>� Suppression des menus de l'ecole</li>
                  <li>� Desactivation des acces gestionnaires</li>
                </ul>
              </div>

              <div className="flex flex-col space-y-3">
                <button
                  onClick={confirmDelete}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-black hover:bg-red-700 uppercase text-xs tracking-widest"
                >
                  Supprimer definitivement
                </button>
                <button
                  onClick={closeDeleteModal}
                  className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 uppercase text-xs tracking-widest"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className={`p-6 flex justify-between items-center text-white shrink-0 ${editingSchool ? 'bg-slate-800' : 'bg-emerald-600'}`}>
              <div>
                <h3 className="font-black text-2xl">{editingSchool ? 'Modifier Ecole' : 'Nouvelle Ecole'}</h3>
                <p className="text-xs text-white/70 font-bold uppercase tracking-widest mt-1">Dabali Express Administration</p>
              </div>
              <button onClick={closeModal} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-all">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom de l'etablissement</label>
                <input name="schoolName" required defaultValue={editingSchool?.name} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse</label>
                <input name="schoolAddress" required defaultValue={editingSchool?.address} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ville</label>
                <input name="schoolCity" required defaultValue={editingSchool?.city} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none" />
              </div>

              {!editingSchool && (
                <>
                  <div className="border-t border-slate-200 pt-6">
                    <h4 className="text-sm font-black text-slate-700 mb-4 inline-flex items-center gap-2">
                      <UserPlus size={16} /> Informations du School Admin
                    </h4>
                    <p className="text-xs text-slate-500 mb-4">Les identifiants seront generes automatiquement apres la creation.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prenom admin</label>
                      <input name="adminFirstName" required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom admin</label>
                      <input name="adminLastName" required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telephone admin (optionnel)</label>
                    <input name="adminPhone" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none" />
                  </div>
                </>
              )}

              {editingSchool && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom School Admin</label>
                    <input name="adminName" required defaultValue={editingSchool.adminName} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Effectif total</label>
                    <input name="count" type="number" required defaultValue={editingSchool.studentCount} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Statut</label>
                    <select name="status" defaultValue={editingSchool.status || 'active'} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none">
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                    </select>
                  </div>
                </>
              )}

              <div className="pt-6 flex space-x-4 shrink-0 pb-2">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-4 border-2 border-slate-100 rounded-2xl font-black text-slate-400 hover:bg-slate-50 uppercase text-xs tracking-widest">Annuler</button>
                <button type="submit" className={`flex-1 px-4 py-4 text-white rounded-2xl font-black transition-all inline-flex items-center justify-center gap-2 uppercase text-xs tracking-widest ${editingSchool ? 'bg-slate-800 hover:bg-slate-900' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                  <Check size={18} />
                  <span>{editingSchool ? 'Enregistrer' : 'Creer le compte'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCredentials && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md" onClick={(e) => e.target === e.currentTarget && closeCredentialsModal()}>
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-emerald-500/10">
            <div className="p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mb-6"><Check size={40} /></div>
              <h3 className="section-title mb-2">Compte cree avec succes</h3>
              <p className="text-slate-500 font-medium mb-6">Sauvegardez ces identifiants et transmettez-les au School Admin.</p>

              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-left mb-8">
                <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-4 inline-flex items-center gap-1"><Info size={12} /> Identifiants</p>

                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-xl border border-emerald-200">
                    <p className="text-[9px] font-black text-emerald-700 uppercase mb-1">Email</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-800 break-all">{showCredentials.email}</p>
                      <button onClick={() => copyToClipboard(showCredentials.email)} className="ml-2 p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200" title="Copier email"><Check size={14} /></button>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-200">
                    <p className="text-[9px] font-black text-emerald-700 uppercase mb-1">Mot de passe temporaire</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-mono font-bold text-slate-800">{showCredentials.password}</p>
                      <button onClick={() => copyToClipboard(showCredentials.password)} className="ml-2 p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200" title="Copier mot de passe"><Check size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <button onClick={() => copyToClipboard(`Email: ${showCredentials.email}\nMot de passe: ${showCredentials.password}`)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 uppercase text-xs tracking-widest inline-flex items-center justify-center gap-2"><Check size={18} /><span>Copier tout</span></button>
                <button onClick={closeCredentialsModal} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 uppercase text-xs tracking-widest">Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schools;

