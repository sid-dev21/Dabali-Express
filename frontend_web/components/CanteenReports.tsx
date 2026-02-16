import React, { useMemo, useState, useEffect } from 'react';
import { FileText, Send, ClipboardCheck, Trash2 } from 'lucide-react';
import { attendanceApi, menuApi, paymentsApi, studentsApi, subscriptionsApi } from '../services/api';

interface StockItem {
  label: string;
  unit: string;
  start: number;
  received: number;
  consumed: number;
  remaining: number;
}

interface IncomingReport {
  id: string;
  period: string;
  receivedAt: string;
  managerName: string;
  schoolName: string;
  status: 'pending' | 'ready' | 'sent';
  stock: StockItem[];
  notes: string;
}

const isIncomingReport = (value: unknown): value is IncomingReport => {
  if (!value || typeof value !== 'object') return false;
  const report = value as IncomingReport;
  return typeof report.id === 'string' && typeof report.managerName === 'string';
};

interface CanteenReportsProps {
  schoolId?: string;
  schoolName?: string;
  adminName?: string;
}

const STOCK_SENT_REPORTS_STORAGE_KEY = 'dabali_express_stock_reports_sent_v1';
const SCHOOL_ADMIN_REPORTS_STATUS_KEY = 'dabali_express_school_admin_report_status_v1';
const SCHOOL_ADMIN_REPORTS_EDITS_KEY = 'dabali_express_school_admin_report_edits_v1';
const SCHOOL_ADMIN_REPORTS_DELETED_KEY = 'dabali_express_school_admin_report_deleted_v1';
const SUPER_ADMIN_REPORTS_STORAGE_KEY = 'dabali_express_super_admin_reports_v1';

const fallbackReports: IncomingReport[] = [
  {
    id: 'REP-2026-01',
    period: 'Janvier 2026',
    receivedAt: '2026-02-02',
    managerName: 'Aïda Justine Madiega',
    schoolName: 'École Primaire Centrale',
    status: 'pending',
    stock: [
      { label: 'Haricot', unit: 'kg', start: 120, received: 45, consumed: 130, remaining: 35 },
      { label: 'Riz', unit: 'kg', start: 200, received: 80, consumed: 210, remaining: 70 },
      { label: 'Huile', unit: 'L', start: 50, received: 20, consumed: 45, remaining: 25 },
      { label: 'Spaghetti', unit: 'paquet', start: 60, received: 25, consumed: 55, remaining: 30 },
    ],
    notes: 'Rupture temporaire d’huile la 2e semaine.'
  },
  {
    id: 'REP-2026-02',
    period: 'Février 2026',
    receivedAt: '2026-03-01',
    managerName: 'Aïda Justine Madiega',
    schoolName: 'École Primaire Centrale',
    status: 'pending',
    stock: [
      { label: 'Haricot', unit: 'kg', start: 35, received: 90, consumed: 70, remaining: 55 },
      { label: 'Riz', unit: 'kg', start: 70, received: 110, consumed: 95, remaining: 85 },
      { label: 'Huile', unit: 'L', start: 25, received: 25, consumed: 20, remaining: 30 },
      { label: 'Spaghetti', unit: 'paquet', start: 30, received: 40, consumed: 35, remaining: 35 },
    ],
    notes: ''
  }
];

type FormState = {
  reportTitle: string;
  reportDate: string;
  periodStart: string;
  periodEnd: string;
  schoolYear: string;
  adminName: string;
  effectifG: string;
  effectifF: string;
  effectifT: string;
  totalStudents: string;
  canteenStudents: string;
  newStudents: string;
  leftStudents: string;
  classDistribution: string;
  subscriptionActive: string;
  subscriptionExpiring: string;
  subscriptionExpired: string;
  subscriptionPending: string;
  subscriptionMonthly: string;
  subscriptionQuarterly: string;
  subscriptionAnnual: string;
  revenueMonthly: string;
  revenueQuarterly: string;
  revenueAnnual: string;
  revenueObjective: string;
  paymentOrange: string;
  paymentMoov: string;
  paymentCash: string;
  paymentSuccess: string;
  paymentPending: string;
  paymentFailed: string;
  expenseFood: string;
  expenseStaff: string;
  expenseEquipment: string;
  attendanceAverage: string;
  attendanceRate: string;
  attendanceGoal: string;
  week1Rate: string;
  week2Rate: string;
  week3Rate: string;
  week4Rate: string;
  mostDay: string;
  mostDayCount: string;
  leastDay: string;
  leastDayCount: string;
  totalMealsMonth: string;
  avgMealsPerDay: string;
  popularDishes: string;
  wasteRate: string;
  observations: string;
  budgetRequest: string;
  budgetJustification: string;
  budgetImpact: string;
  systemSuggestion: string;
  systemBenefit: string;
  systemCost: string;
  trainingNeed: string;
  trainingTopic: string;
  trainingBudget: string;
  partnershipOpportunity: string;
  partnershipBenefit: string;
  partnershipAction: string;
};

const initialFormState: FormState = {
  reportTitle: '',
  reportDate: new Date().toISOString().split('T')[0],
  periodStart: '',
  periodEnd: '',
  schoolYear: '',
  adminName: '',
  effectifG: '',
  effectifF: '',
  effectifT: '',
  totalStudents: '',
  canteenStudents: '',
  newStudents: '',
  leftStudents: '',
  classDistribution: '',
  subscriptionActive: '',
  subscriptionExpiring: '',
  subscriptionExpired: '',
  subscriptionPending: '',
  subscriptionMonthly: '',
  subscriptionQuarterly: '',
  subscriptionAnnual: '',
  revenueMonthly: '',
  revenueQuarterly: '',
  revenueAnnual: '',
  revenueObjective: '',
  paymentOrange: '',
  paymentMoov: '',
  paymentCash: '',
  paymentSuccess: '',
  paymentPending: '',
  paymentFailed: '',
  expenseFood: '',
  expenseStaff: '',
  expenseEquipment: '',
  attendanceAverage: '',
  attendanceRate: '',
  attendanceGoal: '',
  week1Rate: '',
  week2Rate: '',
  week3Rate: '',
  week4Rate: '',
  mostDay: '',
  mostDayCount: '',
  leastDay: '',
  leastDayCount: '',
  totalMealsMonth: '',
  avgMealsPerDay: '',
  popularDishes: '',
  wasteRate: '',
  observations: '',
  budgetRequest: '',
  budgetJustification: '',
  budgetImpact: '',
  systemSuggestion: '',
  systemBenefit: '',
  systemCost: '',
  trainingNeed: '',
  trainingTopic: '',
  trainingBudget: '',
  partnershipOpportunity: '',
  partnershipBenefit: '',
  partnershipAction: '',
};

const toNumber = (value: string) => {
  const normalized = value.replace(/[^\d.-]/g, '');
  return normalized ? Number(normalized) : 0;
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('fr-FR').format(value);
};

const parseAnyDate = (value: unknown): Date | null => {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateKey = (value: unknown): string => {
  const date = parseAnyDate(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isDateInRange = (value: unknown, start: Date, end: Date): boolean => {
  const date = parseAnyDate(value);
  if (!date) return false;
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
};

const normalizeSubscriptionStatus = (value: unknown): string => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'COMPLETED') return 'ACTIVE';
  if (normalized === 'FAILED') return 'EXPIRED';
  if (normalized === 'REJECTED') return 'CANCELLED';
  return normalized;
};

const normalizeSubscriptionType = (value: unknown): string => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'YEARLY') return 'ANNUAL';
  return normalized;
};

const toChildId = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return String(
      value.childId
      || value.child_id
      || value.studentId
      || value.student_id
      || value.id
      || value._id
      || value.child?.id
      || value.child?._id
      || ''
    );
  }
  return String(value);
};

type QuantityKey = 'haricot' | 'riz' | 'huile' | 'spaghetti';
type RawNumericMap = Partial<Record<QuantityKey, number | null>>;
type RawStockRow = {
  rowNumber: number;
  available: RawNumericMap;
  outgoing: RawNumericMap;
  remaining: RawNumericMap;
};
type RawStockReport = {
  reportId: string;
  generatedAt: string;
  period: string;
  schoolName: string;
  managerName: string;
  opening: RawNumericMap;
  received: RawNumericMap;
  totals: RawNumericMap;
  rows: RawStockRow[];
};
type ReportEditsMap = Record<string, { stock: StockItem[] }>;
type OutgoingSuperAdminReport = {
  id: string;
  schoolName: string;
  adminName: string;
  period: string;
  receivedAt: string;
  revenueTotal: number;
  attendanceRate: number;
  status: 'pending' | 'validated' | 'flagged';
  highlights: string[];
  recommendations: string[];
  content: string;
  sourceReportId: string;
};

const STOCK_KEYS: QuantityKey[] = ['haricot', 'riz', 'huile', 'spaghetti'];
const STOCK_UNITS: Record<QuantityKey, string> = {
  haricot: 'kg',
  riz: 'kg',
  huile: 'L',
  spaghetti: 'paquet'
};
const STOCK_LABELS: Record<QuantityKey, string> = {
  haricot: 'Haricot',
  riz: 'Riz',
  huile: 'Huile',
  spaghetti: 'Spaghetti'
};

const asNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return value;
};

const periodFromDate = (dateIso: string): string => {
  const date = dateIso ? new Date(dateIso) : new Date();
  if (Number.isNaN(date.getTime())) return 'Période non définie';
  const raw = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const sumOutgoing = (rows: RawStockRow[], key: QuantityKey): number | undefined => {
  const values = rows
    .map((row) => asNumber(row.outgoing[key]))
    .filter((value): value is number => value !== undefined);
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0);
};

const firstAvailable = (rows: RawStockRow[], key: QuantityKey): number | undefined => {
  for (const row of rows) {
    const value = asNumber(row.available[key]);
    if (value !== undefined) return value;
  }
  return undefined;
};

const lastRemaining = (rows: RawStockRow[], key: QuantityKey): number | undefined => {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const value = asNumber(rows[index].remaining[key]);
    if (value !== undefined) return value;
  }
  return undefined;
};

const toIncomingReport = (raw: RawStockReport, index: number, statusMap: Record<string, IncomingReport['status']>): IncomingReport => {
  const rows = Array.isArray(raw.rows) ? raw.rows : [];
  const generatedAt = raw.generatedAt || new Date().toISOString();
  const id = raw.reportId || `REP-STOCK-${index + 1}-${generatedAt}`;

  const stock: StockItem[] = STOCK_KEYS.map((key) => {
    const opening = asNumber(raw.opening[key]);
    const received = asNumber(raw.received[key]);
    const consumed = sumOutgoing(rows, key);
    const remaining = lastRemaining(rows, key);
    const start = opening ?? firstAvailable(rows, key);

    return {
      label: STOCK_LABELS[key],
      unit: STOCK_UNITS[key],
      start,
      received,
      consumed,
      remaining
    };
  });

  return {
    id,
    period: raw.period || periodFromDate(generatedAt),
    receivedAt: new Date(generatedAt).toISOString().slice(0, 10),
    managerName: raw.managerName || 'Gestionnaire',
    schoolName: raw.schoolName,
    status: statusMap[id] || 'pending',
    stock,
    notes: ''
  };
};

const statusMeta = (status: IncomingReport['status']) => {
  switch (status) {
    case 'ready':
      return { label: 'Validé', className: 'bg-emerald-100 text-emerald-700' };
    case 'sent':
      return { label: 'Envoyé', className: 'bg-slate-200 text-slate-700' };
    default:
      return { label: 'En attente', className: 'bg-amber-100 text-amber-700' };
  }
};

const CanteenReports: React.FC<CanteenReportsProps> = ({ schoolId, schoolName, adminName }) => {
  const [reports, setReports] = useState<IncomingReport[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [feedback, setFeedback] = useState<string>('');
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [draftContent, setDraftContent] = useState('');

  const resolvedSchoolId = useMemo(() => {
    if (schoolId) return schoolId;
    try {
      const raw = localStorage.getItem('current_user');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return String(parsed?.schoolId || parsed?.school_id || '').trim();
    } catch {
      return '';
    }
  }, [schoolId]);

  const selectedReport = useMemo(
    () => reports.find((report) => isIncomingReport(report) && report.id === selectedId),
    [reports, selectedId]
  );

  useEffect(() => {
    const loadIncomingReports = () => {
      try {
        const rawReports = localStorage.getItem(STOCK_SENT_REPORTS_STORAGE_KEY);
        const rawStatus = localStorage.getItem(SCHOOL_ADMIN_REPORTS_STATUS_KEY);
        const rawEdits = localStorage.getItem(SCHOOL_ADMIN_REPORTS_EDITS_KEY);
        const rawDeleted = localStorage.getItem(SCHOOL_ADMIN_REPORTS_DELETED_KEY);
        const parsedReports: RawStockReport[] = rawReports ? JSON.parse(rawReports) : [];
        const statusMap: Record<string, IncomingReport['status']> = rawStatus ? JSON.parse(rawStatus) : {};
        const editsMap: ReportEditsMap = rawEdits ? JSON.parse(rawEdits) : {};
        const deletedIds = rawDeleted ? JSON.parse(rawDeleted) : [];
        const deletedSet = new Set(
          (Array.isArray(deletedIds) ? deletedIds : []).map((id) => String(id))
        );

        if (!Array.isArray(parsedReports) || parsedReports.length === 0) {
          setReports([]);
          return;
        }

        const mapped = parsedReports
          .map((report, index) => toIncomingReport(report, index, statusMap))
          .map((report) => {
            const edits = editsMap[report.id];
            if (!edits?.stock) return report;
            return { ...report, stock: edits.stock };
          })
          .filter((report) => !deletedSet.has(report.id))
          .filter(isIncomingReport)
          .reverse();

        setReports(mapped);
      } catch {
        setReports([]);
      }
    };

    loadIncomingReports();
    const onStorage = () => loadIncomingReports();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (reports.length === 0) {
      setSelectedId('');
      return;
    }
    if (!reports.some((report) => isIncomingReport(report) && report.id === selectedId)) {
      const firstReport = reports.find(isIncomingReport);
      setSelectedId(firstReport?.id || '');
    }
  }, [reports, selectedId]);

  useEffect(() => {
    if (adminName && !formData.adminName) {
      setFormData(prev => ({ ...prev, adminName }));
    }
  }, [adminName, formData.adminName]);

  useEffect(() => {
    if (!selectedReport) return;

    const reportDate = new Date(selectedReport.receivedAt);
    const isValidDate = !Number.isNaN(reportDate.getTime());
    const periodStart = isValidDate
      ? new Date(reportDate.getFullYear(), reportDate.getMonth(), 1).toISOString().slice(0, 10)
      : '';
    const periodEnd = isValidDate
      ? new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0).toISOString().slice(0, 10)
      : '';
    const schoolYear = isValidDate
      ? `${reportDate.getMonth() >= 8 ? reportDate.getFullYear() : reportDate.getFullYear() - 1}-${reportDate.getMonth() >= 8 ? reportDate.getFullYear() + 1 : reportDate.getFullYear()}`
      : '';

    setFormData(prev => ({
      ...prev,
      reportTitle: prev.reportTitle ? prev.reportTitle : `RAPPORT MENSUEL - ${selectedReport.period}`,
      reportDate: prev.reportDate || selectedReport.receivedAt,
      periodStart: prev.periodStart || periodStart,
      periodEnd: prev.periodEnd || periodEnd,
      schoolYear: prev.schoolYear || schoolYear
    }));
  }, [selectedReport]);

  useEffect(() => {
    if (!selectedReport || !resolvedSchoolId) return;

    const baseDate = parseAnyDate(selectedReport.receivedAt) || new Date();
    const defaultStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1, 0, 0, 0, 0);
    const defaultEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999);
    const periodStartDate = parseAnyDate(formData.periodStart ? `${formData.periodStart}T00:00:00` : defaultStart) || defaultStart;
    const periodEndDate = parseAnyDate(formData.periodEnd ? `${formData.periodEnd}T23:59:59.999` : defaultEnd) || defaultEnd;
    const today = new Date();
    const next7Days = new Date(today);
    next7Days.setDate(next7Days.getDate() + 7);
    const quarterStart = new Date(periodEndDate.getFullYear(), periodEndDate.getMonth() - 2, 1, 0, 0, 0, 0);
    const yearStart = new Date(periodEndDate.getFullYear(), periodEndDate.getMonth() - 11, 1, 0, 0, 0, 0);
    const canteenManagerName = selectedReport.managerName;

    let isMounted = true;

    const autoFillFromSystem = async () => {
      setIsAutoFilling(true);

      try {
        const [studentsData, subscriptionsData, paymentsData, attendanceData, menusData] = await Promise.all([
          studentsApi.getStudents(resolvedSchoolId),
          subscriptionsApi.getSubscriptions(resolvedSchoolId),
          paymentsApi.getPayments(resolvedSchoolId),
          attendanceApi.getAttendance(resolvedSchoolId),
          menuApi.getMenus(resolvedSchoolId),
        ]);

        const normalizedSubscriptions = (subscriptionsData || []).map((subscription: any) => ({
          childId: toChildId(subscription),
          status: normalizeSubscriptionStatus(subscription?.status),
          type: normalizeSubscriptionType(subscription?.type || subscription?.plan_type || subscription?.meal_plan),
          startDate: subscription?.startDate || subscription?.start_date,
          endDate: subscription?.endDate || subscription?.end_date,
          paymentStatus: String(subscription?.paymentDetails?.status || subscription?.payment_status || '').toUpperCase(),
          updatedAt: subscription?.updatedAt || subscription?.updated_at || subscription?.endDate || subscription?.end_date,
        }));

        const totalStudentsCount = studentsData.length;

        const activeSubscriptionStatuses = new Set(['ACTIVE']);
        const activeStudentIds = new Set(
          normalizedSubscriptions
            .filter((subscription) => activeSubscriptionStatuses.has(subscription.status))
            .map((subscription) => subscription.childId)
            .filter(Boolean)
        );
        const canteenStudentsCount = activeStudentIds.size;

        const newStudentsCount = new Set(
          normalizedSubscriptions
            .filter((subscription) => isDateInRange(subscription.startDate, periodStartDate, periodEndDate))
            .map((subscription) => subscription.childId)
            .filter(Boolean)
        ).size;

        const leftStudentsCount = new Set(
          normalizedSubscriptions
            .filter((subscription) => ['EXPIRED', 'CANCELLED'].includes(subscription.status))
            .filter((subscription) => isDateInRange(subscription.endDate, periodStartDate, periodEndDate))
            .map((subscription) => subscription.childId)
            .filter(Boolean)
        ).size;

        let boysCount = 0;
        let girlsCount = 0;
        const classStats = new Map<string, { total: number; canteen: number }>();

        studentsData.forEach((student: any) => {
          const gender = String(student?.gender || student?.sex || '').trim().toUpperCase();
          if (['M', 'MALE', 'H', 'HOMME', 'GARCON'].includes(gender)) boysCount += 1;
          if (['F', 'FEMALE', 'FEMME', 'FILLE'].includes(gender)) girlsCount += 1;

          const className = String(student?.class || 'Classe non renseignée').trim();
          const current = classStats.get(className) || { total: 0, canteen: 0 };
          current.total += 1;
          if (activeStudentIds.has(String(student?.id || ''))) {
            current.canteen += 1;
          }
          classStats.set(className, current);
        });

        const classDistributionText = Array.from(classStats.entries())
          .sort((a, b) => a[0].localeCompare(b[0], 'fr'))
          .map(([className, stats]) => `${className}: ${stats.total} élèves (${stats.canteen} cantine)`)
          .join('\n');

        const activeSubscriptionsCount = normalizedSubscriptions.filter((subscription) => subscription.status === 'ACTIVE').length;
        const pendingSubscriptionsCount = normalizedSubscriptions.filter((subscription) => ['PENDING_PAYMENT', 'PENDING', 'WAITING_ADMIN_VALIDATION'].includes(subscription.status)).length;
        const expiredSubscriptionsCount = normalizedSubscriptions.filter((subscription) => ['EXPIRED', 'CANCELLED'].includes(subscription.status)).length;
        const expiringSoonCount = normalizedSubscriptions.filter((subscription) => {
          if (subscription.status !== 'ACTIVE') return false;
          const endDate = parseAnyDate(subscription.endDate);
          if (!endDate) return false;
          return endDate.getTime() >= today.getTime() && endDate.getTime() <= next7Days.getTime();
        }).length;

        const monthlyPlanCount = normalizedSubscriptions.filter((subscription) => subscription.type === 'MONTHLY').length;
        const quarterlyPlanCount = normalizedSubscriptions.filter((subscription) => subscription.type === 'QUARTERLY').length;
        const annualPlanCount = normalizedSubscriptions.filter((subscription) => ['YEARLY', 'ANNUAL'].includes(subscription.type)).length;

        const completedPaymentsAll = (paymentsData || []).filter((payment: any) => payment?.status === 'completed');
        const completedPaymentsInPeriod = completedPaymentsAll.filter((payment: any) => isDateInRange(payment?.date, periodStartDate, periodEndDate));
        const completedPaymentsQuarter = completedPaymentsAll.filter((payment: any) => isDateInRange(payment?.date, quarterStart, periodEndDate));
        const completedPaymentsYear = completedPaymentsAll.filter((payment: any) => isDateInRange(payment?.date, yearStart, periodEndDate));
        const pendingPaymentsInPeriod = (paymentsData || []).filter((payment: any) => payment?.status === 'pending' && isDateInRange(payment?.date, periodStartDate, periodEndDate));

        const sumAmount = (rows: any[]) => rows.reduce((sum, row) => sum + (Number(row?.amount) || 0), 0);
        const revenueMonthlyValue = sumAmount(completedPaymentsInPeriod);
        const revenueQuarterlyValue = sumAmount(completedPaymentsQuarter);
        const revenueAnnualValue = sumAmount(completedPaymentsYear);

        const paymentOrangeValue = sumAmount(completedPaymentsInPeriod.filter((payment: any) => String(payment?.method || '').toUpperCase() === 'ORANGE_MONEY'));
        const paymentMoovValue = sumAmount(completedPaymentsInPeriod.filter((payment: any) => String(payment?.method || '').toUpperCase() === 'MOOV_MONEY'));
        const paymentCashValue = sumAmount(completedPaymentsInPeriod.filter((payment: any) => String(payment?.method || '').toUpperCase() === 'CASH'));

        const paymentFailedCount = normalizedSubscriptions
          .filter((subscription) => subscription.paymentStatus === 'FAILED')
          .filter((subscription) => isDateInRange(subscription.updatedAt, periodStartDate, periodEndDate))
          .length;

        const attendanceInPeriod = (attendanceData || []).filter((entry: any) => isDateInRange(entry?.date, periodStartDate, periodEndDate));
        const presentAttendance = attendanceInPeriod.filter((entry: any) => entry?.present !== false);
        const totalMealsCount = presentAttendance.length;

        const dailyPresents = new Map<string, number>();
        presentAttendance.forEach((entry: any) => {
          const dayKey = toDateKey(entry?.menu_id?.date || entry?.date);
          if (!dayKey) return;
          dailyPresents.set(dayKey, (dailyPresents.get(dayKey) || 0) + 1);
        });

        const daysWithMeals = dailyPresents.size;
        const attendanceAverageValue = daysWithMeals > 0 ? totalMealsCount / daysWithMeals : 0;
        const attendanceRateValue = canteenStudentsCount > 0 ? (attendanceAverageValue / canteenStudentsCount) * 100 : 0;

        const weeklyRates: number[] = [0, 1, 2, 3].map((weekIndex) => {
          const weekStart = new Date(periodStartDate);
          weekStart.setDate(periodStartDate.getDate() + (weekIndex * 7));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          if (weekEnd.getTime() > periodEndDate.getTime()) {
            weekEnd.setTime(periodEndDate.getTime());
          }

          const weekKeys = Array.from(dailyPresents.keys()).filter((key) => {
            const keyDate = parseAnyDate(`${key}T12:00:00`);
            if (!keyDate) return false;
            return keyDate.getTime() >= weekStart.getTime() && keyDate.getTime() <= weekEnd.getTime();
          });
          if (weekKeys.length === 0 || canteenStudentsCount === 0) return 0;

          const weekMeals = weekKeys.reduce((sum, key) => sum + (dailyPresents.get(key) || 0), 0);
          const weekAverage = weekMeals / weekKeys.length;
          return (weekAverage / canteenStudentsCount) * 100;
        });

        const weekdayTotals = new Map<string, number>();
        dailyPresents.forEach((count, dayKey) => {
          const dayDate = parseAnyDate(`${dayKey}T12:00:00`);
          if (!dayDate) return;
          const weekdayLabel = dayDate.toLocaleDateString('fr-FR', { weekday: 'long' });
          weekdayTotals.set(weekdayLabel, (weekdayTotals.get(weekdayLabel) || 0) + count);
        });

        const orderedWeekdays = Array.from(weekdayTotals.entries()).sort((a, b) => b[1] - a[1]);
        const mostDayLabel = orderedWeekdays[0]?.[0] || '';
        const mostDayValue = orderedWeekdays[0]?.[1] || 0;
        const leastDayLabel = orderedWeekdays.length > 0 ? orderedWeekdays[orderedWeekdays.length - 1][0] : '';
        const leastDayValue = orderedWeekdays.length > 0 ? orderedWeekdays[orderedWeekdays.length - 1][1] : 0;

        const dishCounts = new Map<string, number>();
        presentAttendance.forEach((entry: any) => {
          const menu = entry?.menu_id;
          const dish = String(menu?.meal_name || menu?.name || menu?.description || '').trim();
          if (!dish) return;
          dishCounts.set(dish, (dishCounts.get(dish) || 0) + 1);
        });

        if (dishCounts.size === 0) {
          (menusData || [])
            .filter((menu) => isDateInRange((menu as any)?.date, periodStartDate, periodEndDate))
            .forEach((menu) => {
              const dish = String((menu as any)?.name || (menu as any)?.mealName || (menu as any)?.description || '').trim();
              if (!dish) return;
              dishCounts.set(dish, (dishCounts.get(dish) || 0) + 1);
            });
        }

        const popularDishesText = Array.from(dishCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([dish, count], index) => `${index + 1}. ${dish}: ${count}`)
          .join('\n');

        const stockAvailable = selectedReport.stock.reduce((sum, item) => sum + (Number(item.start) || 0) + (Number(item.received) || 0), 0);
        const stockRemaining = selectedReport.stock.reduce((sum, item) => sum + (Number(item.remaining) || 0), 0);
        const wasteRateValue = stockAvailable > 0 ? (stockRemaining / stockAvailable) * 100 : 0;

        if (!isMounted) return;
        setFormData((prev) => ({
          ...prev,
          revenueMonthly: String(Math.round(revenueMonthlyValue)),
          revenueQuarterly: String(Math.round(revenueQuarterlyValue)),
          revenueAnnual: String(Math.round(revenueAnnualValue)),
          revenueObjective: String(Math.round(revenueMonthlyValue)),
          paymentOrange: String(Math.round(paymentOrangeValue)),
          paymentMoov: String(Math.round(paymentMoovValue)),
          paymentCash: String(Math.round(paymentCashValue)),
          paymentSuccess: String(completedPaymentsInPeriod.length),
          paymentPending: String(pendingPaymentsInPeriod.length),
          paymentFailed: String(paymentFailedCount),
          expenseFood: '0',
          expenseStaff: '0',
          expenseEquipment: '0',
          totalStudents: String(totalStudentsCount),
          canteenStudents: String(canteenStudentsCount),
          newStudents: String(newStudentsCount),
          leftStudents: String(leftStudentsCount),
          effectifG: String(boysCount),
          effectifF: String(girlsCount),
          effectifT: String(totalStudentsCount),
          classDistribution: classDistributionText,
          subscriptionActive: String(activeSubscriptionsCount),
          subscriptionExpiring: String(expiringSoonCount),
          subscriptionExpired: String(expiredSubscriptionsCount),
          subscriptionPending: String(pendingSubscriptionsCount),
          subscriptionMonthly: String(monthlyPlanCount),
          subscriptionQuarterly: String(quarterlyPlanCount),
          subscriptionAnnual: String(annualPlanCount),
          attendanceAverage: attendanceAverageValue.toFixed(1),
          attendanceRate: attendanceRateValue.toFixed(1),
          attendanceGoal: '100',
          week1Rate: weeklyRates[0].toFixed(1),
          week2Rate: weeklyRates[1].toFixed(1),
          week3Rate: weeklyRates[2].toFixed(1),
          week4Rate: weeklyRates[3].toFixed(1),
          mostDay: mostDayLabel,
          mostDayCount: String(mostDayValue),
          leastDay: leastDayLabel,
          leastDayCount: String(leastDayValue),
          totalMealsMonth: String(totalMealsCount),
          avgMealsPerDay: attendanceAverageValue.toFixed(1),
          popularDishes: popularDishesText,
          wasteRate: wasteRateValue.toFixed(1),
          observations: prev.observations || (canteenManagerName ? `Données calculées automatiquement depuis le système (${canteenManagerName}).` : prev.observations),
        }));
      } catch {
        if (!isMounted) return;
      } finally {
        if (isMounted) {
          setIsAutoFilling(false);
        }
      }
    };

    autoFillFromSystem();

    return () => {
      isMounted = false;
    };
  }, [selectedReport, resolvedSchoolId, formData.periodStart, formData.periodEnd]);

  const updateField = (field: keyof FormState) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const effectiveSchoolName = schoolName || selectedReport?.schoolName || '';

  const revenueMonthly = toNumber(formData.revenueMonthly);
  const revenueQuarterly = toNumber(formData.revenueQuarterly);
  const revenueAnnual = toNumber(formData.revenueAnnual);
  const revenueObjective = toNumber(formData.revenueObjective);
  const revenueTotal = revenueMonthly + revenueQuarterly + revenueAnnual;
  const revenueDelta = revenueTotal - revenueObjective;
  const revenueDeltaPct = revenueObjective ? (revenueDelta / revenueObjective) * 100 : 0;

  const paymentOrange = toNumber(formData.paymentOrange);
  const paymentMoov = toNumber(formData.paymentMoov);
  const paymentCash = toNumber(formData.paymentCash);
  const paymentTotal = paymentOrange + paymentMoov + paymentCash;
  const paymentOrangePct = paymentTotal ? (paymentOrange / paymentTotal) * 100 : 0;
  const paymentMoovPct = paymentTotal ? (paymentMoov / paymentTotal) * 100 : 0;
  const paymentCashPct = paymentTotal ? (paymentCash / paymentTotal) * 100 : 0;

  const paymentSuccess = toNumber(formData.paymentSuccess);
  const paymentPending = toNumber(formData.paymentPending);
  const paymentFailed = toNumber(formData.paymentFailed);
  const paymentCount = paymentSuccess + paymentPending + paymentFailed;
  const paymentSuccessPct = paymentCount ? (paymentSuccess / paymentCount) * 100 : 0;
  const paymentPendingPct = paymentCount ? (paymentPending / paymentCount) * 100 : 0;
  const paymentFailedPct = paymentCount ? (paymentFailed / paymentCount) * 100 : 0;

  const expenseFood = toNumber(formData.expenseFood);
  const expenseStaff = toNumber(formData.expenseStaff);
  const expenseEquipment = toNumber(formData.expenseEquipment);
  const expenseTotal = expenseFood + expenseStaff + expenseEquipment;
  const margin = revenueTotal - expenseTotal;
  const marginPct = revenueTotal ? (margin / revenueTotal) * 100 : 0;

  const totalStudents = toNumber(formData.totalStudents);
  const canteenStudents = toNumber(formData.canteenStudents);
  const subscriptionRate = totalStudents ? (canteenStudents / totalStudents) * 100 : 0;
  const newStudents = toNumber(formData.newStudents);
  const leftStudents = toNumber(formData.leftStudents);
  const evolution = newStudents - leftStudents;
  const evolutionPct = totalStudents ? (evolution / totalStudents) * 100 : 0;

  const attendanceRate = toNumber(formData.attendanceRate);
  const attendanceGoal = toNumber(formData.attendanceGoal);
  const attendanceDelta = attendanceRate - attendanceGoal;

  const updateReportStatus = (reportId: string, status: IncomingReport['status']) => {
    setReports((prev) => prev.filter(isIncomingReport).map((report) => (
      report.id === reportId ? { ...report, status } : report
    )));

    try {
      const raw = localStorage.getItem(SCHOOL_ADMIN_REPORTS_STATUS_KEY);
      const current = raw ? JSON.parse(raw) : {};
      const next = { ...(current || {}), [reportId]: status };
      localStorage.setItem(SCHOOL_ADMIN_REPORTS_STATUS_KEY, JSON.stringify(next));
    } catch {
      // Ignore local cache write failures.
    }
  };

  const handleValidateReport = () => {
    if (!selectedReport) return;
    updateReportStatus(selectedReport.id, 'ready');
    setFeedback(`Rapport ${selectedReport.id} validé. Vous pouvez maintenant le générer et l'envoyer.`);
  };

  const persistStockEdits = (reportId: string, stock: StockItem[]) => {
    try {
      const raw = localStorage.getItem(SCHOOL_ADMIN_REPORTS_EDITS_KEY);
      const current: ReportEditsMap = raw ? JSON.parse(raw) : {};
      const next: ReportEditsMap = { ...current, [reportId]: { ...(current[reportId] || {}), stock } };
      localStorage.setItem(SCHOOL_ADMIN_REPORTS_EDITS_KEY, JSON.stringify(next));
    } catch {
      // Ignore local cache write failures.
    }
  };

  const updateSelectedStockValue = (
    label: string,
    field: 'start' | 'received' | 'consumed' | 'remaining',
    rawValue: string
  ) => {
    if (!selectedReport) return;
    const normalized = rawValue.trim().replace(',', '.');
    const parsed = normalized === '' ? undefined : Number(normalized);
    if (normalized !== '' && !Number.isFinite(parsed)) return;

    setReports((prev) => prev.filter(isIncomingReport).map((report) => {
      if (report.id !== selectedReport.id) return report;
      const nextStock = report.stock.map((item) => (
        item.label === label ? { ...item, [field]: parsed } : item
      ));
      persistStockEdits(report.id, nextStock);
      return { ...report, stock: nextStock };
    }));
  };

  const buildReportLines = (): string[] => {
    if (!selectedReport) return [];

    return [
      '1. EN-TÊTE DU RAPPORT',
      formData.reportTitle,
      `École : ${effectiveSchoolName}`,
      `Établi par : ${formData.adminName} (School Admin)`,
      `Date : ${formData.reportDate}`,
      `Période : ${formData.periodStart} - ${formData.periodEnd}`,
      `Année scolaire : ${formData.schoolYear}`,
      '',
      '2. DONNÉES STOCK (RAPPORT GESTIONNAIRE)',
      `Gestionnaire cantine : ${selectedReport.managerName}`,
      `Rapport reçu le : ${selectedReport.receivedAt}`,
      'Article,Unité,Début,Reçu,Consommé,Restant',
      ...selectedReport.stock.map(item => (
        `${item.label},${item.unit},${item.start ?? ''},${item.received ?? ''},${item.consumed ?? ''},${item.remaining ?? ''}`
      )),
      `Observations (Gestionnaire) : ${selectedReport.notes || 'RAS'}`,
      '',
      '3. DONNÉES FINANCIÈRES',
      'A. Revenus du mois',
      `Abonnements mensuels : ${formData.revenueMonthly || '0'} FCFA`,
      `Abonnements trimestriels : ${formData.revenueQuarterly || '0'} FCFA`,
      `Abonnements annuels : ${formData.revenueAnnual || '0'} FCFA`,
      `TOTAL REVENUS : ${formatNumber(revenueTotal)} FCFA`,
      `Objectif du mois : ${formData.revenueObjective || '0'} FCFA`,
      `Écart : ${formatNumber(revenueDelta)} FCFA (${revenueDeltaPct.toFixed(1)}%)`,
      '',
      'B. Répartition des paiements',
      `Orange Money : ${formData.paymentOrange || '0'} FCFA (${paymentOrangePct.toFixed(1)}%)`,
      `Moov Money : ${formData.paymentMoov || '0'} FCFA (${paymentMoovPct.toFixed(1)}%)`,
      `Espèces : ${formData.paymentCash || '0'} FCFA (${paymentCashPct.toFixed(1)}%)`,
      `Paiements réussis : ${formData.paymentSuccess || '0'} (${paymentSuccessPct.toFixed(1)}%)`,
      `Paiements en attente : ${formData.paymentPending || '0'} (${paymentPendingPct.toFixed(1)}%)`,
      `Paiements échoués : ${formData.paymentFailed || '0'} (${paymentFailedPct.toFixed(1)}%)`,
      '',
      'C. Coûts opérationnels',
      `Achats alimentaires : ${formData.expenseFood || '0'} FCFA`,
      `Personnel : ${formData.expenseStaff || '0'} FCFA`,
      `Équipement/entretien : ${formData.expenseEquipment || '0'} FCFA`,
      `TOTAL DÉPENSES : ${formatNumber(expenseTotal)} FCFA`,
      `MARGE BRUTE : ${formatNumber(margin)} FCFA (${marginPct.toFixed(1)}%)`,
      '',
      '4. STATISTIQUES D\'INSCRIPTION',
      `Total élèves école : ${formData.totalStudents || '0'}`,
      `Inscrits cantine : ${formData.canteenStudents || '0'} (${subscriptionRate.toFixed(1)}%)`,
      `Nouveaux ce mois : ${formData.newStudents || '0'}`,
      `Départs ce mois : ${formData.leftStudents || '0'}`,
      `Évolution : ${evolution} (${evolutionPct.toFixed(1)}%)`,
      'Répartition par classe :',
      formData.classDistribution || 'Non renseigné',
      '',
      'État des abonnements',
      `Actifs : ${formData.subscriptionActive || '0'}`,
      `Expirent dans 7 jours : ${formData.subscriptionExpiring || '0'}`,
      `Expirés non renouvelés : ${formData.subscriptionExpired || '0'}`,
      `En attente de paiement : ${formData.subscriptionPending || '0'}`,
      'Type d\'abonnement',
      `Mensuels : ${formData.subscriptionMonthly || '0'}`,
      `Trimestriels : ${formData.subscriptionQuarterly || '0'}`,
      `Annuels : ${formData.subscriptionAnnual || '0'}`,
      '',
      '5. STATISTIQUES OPÉRATIONNELLES',
      `Moyenne journalière : ${formData.attendanceAverage || '0'} élèves`,
      `Taux de présence : ${formData.attendanceRate || '0'}%`,
      `Objectif : ${formData.attendanceGoal || '0'}%`,
      `Écart : ${attendanceDelta >= 0 ? '+' : ''}${attendanceDelta.toFixed(1)}%`,
      `Semaine 1 : ${formData.week1Rate || '0'}%`,
      `Semaine 2 : ${formData.week2Rate || '0'}%`,
      `Semaine 3 : ${formData.week3Rate || '0'}%`,
      `Semaine 4 : ${formData.week4Rate || '0'}%`,
      `Jour le plus fréquenté : ${formData.mostDay || '?'} (${formData.mostDayCount || '0'})`,
      `Jour le moins fréquenté : ${formData.leastDay || '?'} (${formData.leastDayCount || '0'})`,
      '',
      'Consommation alimentaire',
      `Total repas du mois : ${formData.totalMealsMonth || '0'}`,
      `Moyenne/jour : ${formData.avgMealsPerDay || '0'}`,
      'Plats les plus populaires :',
      formData.popularDishes || 'Non renseigné',
      `Gaspillage estimé : ${formData.wasteRate || '0'}%`,
      '',
      '6. RECOMMANDATIONS POUR LE SUPER ADMIN',
      'Budget',
      `Demande : ${formData.budgetRequest || 'Non renseigné'}`,
      `Justification : ${formData.budgetJustification || 'Non renseigné'}`,
      `Impact : ${formData.budgetImpact || 'Non renseigné'}`,
      'Système',
      `Suggestion : ${formData.systemSuggestion || 'Non renseigné'}`,
      `Avantage : ${formData.systemBenefit || 'Non renseigné'}`,
      `Coût estimé : ${formData.systemCost || 'Non renseigné'}`,
      'Formation',
      `Besoin : ${formData.trainingNeed || 'Non renseigné'}`,
      `Sujet : ${formData.trainingTopic || 'Non renseigné'}`,
      `Budget : ${formData.trainingBudget || 'Non renseigné'}`,
      'Partenariat',
      `Opportunité : ${formData.partnershipOpportunity || 'Non renseigné'}`,
      `Avantage : ${formData.partnershipBenefit || 'Non renseigné'}`,
      `Action requise : ${formData.partnershipAction || 'Non renseigné'}`,
      '',
      `Observations (School Admin) : ${formData.observations || 'RAS'}`,
    ];
  };

  const handleGenerateReport = () => {
    if (!selectedReport) return;
    if (selectedReport.status === 'pending') {
      alert('Validez d\'abord le rapport reçu avant de le générer.');
      return;
    }

    const missingFields: string[] = [];
    if (!formData.reportTitle) missingFields.push('Titre du rapport');
    if (!formData.reportDate) missingFields.push('Date du rapport');
    if (!formData.periodStart || !formData.periodEnd) missingFields.push('Période');
    if (!formData.schoolYear) missingFields.push('Année scolaire');
    if (!formData.adminName) missingFields.push('Nom du School Admin');

    if (missingFields.length > 0) {
      alert(`Veuillez compléter : ${missingFields.join(', ')}`);
      return;
    }

    const lines = buildReportLines();
    setDraftContent(lines.join('\n'));
    setIsDraftModalOpen(true);
    setFeedback('Brouillon généré. Vous pouvez le modifier avant envoi.');
  };

  const handleDownloadDraft = () => {
    if (!selectedReport || !draftContent.trim()) return;
    const blob = new Blob(['\ufeff', draftContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport_school_admin_brouillon_${selectedReport.period.replace(/\s+/g, '_')}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSendToSuperAdmin = () => {
    if (!selectedReport || !draftContent.trim()) return;

    const recommendations = [
      formData.budgetRequest && `Budget: ${formData.budgetRequest}`,
      formData.systemSuggestion && `Système: ${formData.systemSuggestion}`,
      formData.trainingNeed && `Formation: ${formData.trainingNeed}`,
      formData.partnershipOpportunity && `Partenariat: ${formData.partnershipOpportunity}`,
    ].filter(Boolean) as string[];

    const highlights = [
      `Revenus: ${formatNumber(revenueTotal)} FCFA`,
      `Présence moyenne: ${formData.attendanceRate || '0'}%`,
      `Inscrits cantine: ${formData.canteenStudents || '0'}`
    ];

    const outgoing: OutgoingSuperAdminReport = {
      id: `SAR-${selectedReport.id}`,
      schoolName: effectiveSchoolName || 'Ecole',
      adminName: formData.adminName || 'School Admin',
      period: selectedReport.period,
      receivedAt: formData.reportDate || new Date().toISOString().slice(0, 10),
      revenueTotal,
      attendanceRate: Number(formData.attendanceRate || 0),
      status: 'pending',
      highlights,
      recommendations,
      content: draftContent,
      sourceReportId: selectedReport.id
    };

    try {
      const raw = localStorage.getItem(SUPER_ADMIN_REPORTS_STORAGE_KEY);
      const existing: OutgoingSuperAdminReport[] = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(existing) ? existing.filter((item) => item.id !== outgoing.id) : [];
      next.unshift(outgoing);
      localStorage.setItem(SUPER_ADMIN_REPORTS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore local storage write failures.
    }

    updateReportStatus(selectedReport.id, 'sent');
    setIsDraftModalOpen(false);
    setFeedback(`Rapport ${selectedReport.id} envoyé au Super Admin.`);
  };

  const handleDeleteReport = () => {
    if (!selectedReport) return;
    const confirmed = window.confirm(`Supprimer le rapport "${selectedReport.period}" ?`);
    if (!confirmed) return;

    const reportId = selectedReport.id;
    const nextReports = reports.filter((report) => isIncomingReport(report) && report.id !== reportId);
    setReports(nextReports);
    setSelectedId(nextReports[0]?.id || '');
    setFeedback(`Rapport ${reportId} supprimé.`);

    try {
      const rawDeleted = localStorage.getItem(SCHOOL_ADMIN_REPORTS_DELETED_KEY);
      const deletedIds = rawDeleted ? JSON.parse(rawDeleted) : [];
      const nextDeleted = Array.from(
        new Set([...(Array.isArray(deletedIds) ? deletedIds.map((id: unknown) => String(id)) : []), reportId])
      );
      localStorage.setItem(SCHOOL_ADMIN_REPORTS_DELETED_KEY, JSON.stringify(nextDeleted));
    } catch {
      // Ignore local storage write failures.
    }

    try {
      const rawStatus = localStorage.getItem(SCHOOL_ADMIN_REPORTS_STATUS_KEY);
      const statusMap = rawStatus ? JSON.parse(rawStatus) : {};
      if (statusMap && typeof statusMap === 'object') {
        delete statusMap[reportId];
        localStorage.setItem(SCHOOL_ADMIN_REPORTS_STATUS_KEY, JSON.stringify(statusMap));
      }
    } catch {
      // Ignore local storage write failures.
    }

    try {
      const rawEdits = localStorage.getItem(SCHOOL_ADMIN_REPORTS_EDITS_KEY);
      const editsMap = rawEdits ? JSON.parse(rawEdits) : {};
      if (editsMap && typeof editsMap === 'object') {
        delete editsMap[reportId];
        localStorage.setItem(SCHOOL_ADMIN_REPORTS_EDITS_KEY, JSON.stringify(editsMap));
      }
    } catch {
      // Ignore local storage write failures.
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="surface-card p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="section-title">Rapports Cantine</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Recevez le rapport du gestionnaire, completez les informations, puis consultez et modifiez le rapport avant envoi au Super Admin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDeleteReport}
            disabled={!selectedReport}
            className="flex items-center gap-2 bg-rose-600 text-white px-5 py-2.5 rounded-xl hover:bg-rose-700 transition-all font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
            Supprimer
          </button>
          <button
            type="button"
            onClick={handleValidateReport}
            disabled={!selectedReport}
            className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl hover:bg-slate-900 transition-all font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ClipboardCheck size={16} />
            Valider le rapport
          </button>
          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={!selectedReport || selectedReport.status === 'pending'}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-all font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            Previsualiser / modifier
          </button>
        </div>
      </div>

      {feedback && (
        <div className="surface-soft px-4 py-3 text-xs font-bold text-slate-600">
          {feedback}
        </div>
      )}
      <div className="surface-soft px-4 py-3 text-xs font-semibold text-slate-600">
        {isAutoFilling
          ? 'Mise a jour automatique des donnees systeme en cours...'
          : 'Les sections Donnees financieres, Statistiques d inscription et Statistiques operationnelles sont remplies automatiquement depuis le systeme.'}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        <div className="surface-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-800 uppercase text-[11px] tracking-widest">Rapports reçus</h3>
            <FileText size={16} className="text-slate-400" />
          </div>
          <div className="space-y-3">
                        {reports.length === 0 && (
              <div className="card-muted p-4 text-sm font-bold text-slate-600">
                Aucun rapport reçu pour le moment.
              </div>
            )}
            {reports.filter(isIncomingReport).map(report => {
              const status = statusMeta(report.status);
              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setSelectedId(report.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    selectedId === report.id
                      ? 'border-emerald-500/30 bg-emerald-50/40'
                      : 'border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-slate-800">{report.period}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Reçu le {report.receivedAt}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">Gestionnaire : {report.managerName}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="surface-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="section-title">Détail du rapport (Gestionnaire)</h3>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Données reçues</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">École</label>
                <input
                  type="text"
                  readOnly
                  value={effectiveSchoolName}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestionnaire cantine</label>
                <input
                  type="text"
                  readOnly
                  value={selectedReport?.managerName || ''}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Période</label>
                <input
                  type="text"
                  readOnly
                  value={selectedReport?.period || ''}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date de réception</label>
                <input
                  type="text"
                  readOnly
                  value={selectedReport?.receivedAt || ''}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
                />
              </div>
            </div>

            <div className="table-shell">
              <div className="overflow-x-auto">
                <table className="w-full text-left stock-grid">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">Article</th>
                      <th className="px-4 py-3 text-center">Unité</th>
                      <th className="px-4 py-3 text-center">Début</th>
                      <th className="px-4 py-3 text-center">Reçu</th>
                      <th className="px-4 py-3 text-center">Consommé</th>
                      <th className="px-4 py-3 text-center">Restant</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {(selectedReport?.stock || []).map(item => (
                      <tr key={item.label} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-700">{item.label}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{item.unit}</td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="text"
                            value={item.start ?? ''}
                            onChange={(event) => updateSelectedStockValue(item.label, 'start', event.target.value)}
                            className="w-full min-w-[90px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-center text-slate-700"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="text"
                            value={item.received ?? ''}
                            onChange={(event) => updateSelectedStockValue(item.label, 'received', event.target.value)}
                            className="w-full min-w-[90px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-center text-slate-700"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="text"
                            value={item.consumed ?? ''}
                            onChange={(event) => updateSelectedStockValue(item.label, 'consumed', event.target.value)}
                            className="w-full min-w-[90px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-center text-slate-700"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="text"
                            value={item.remaining ?? ''}
                            onChange={(event) => updateSelectedStockValue(item.label, 'remaining', event.target.value)}
                            className="w-full min-w-[90px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-center text-slate-700"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Observations du gestionnaire</p>
              <p className="mt-1 text-sm text-slate-700">{selectedReport?.notes || 'RAS'}</p>
            </div>
          </div>
          <div className="surface-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="section-title">1. En-tête du rapport</h3>
              <ClipboardCheck size={18} className="text-emerald-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre du rapport</label>
                <input
                  type="text"
                  value={formData.reportTitle}
                  onChange={updateField('reportTitle')}
                  placeholder="RAPPORT MENSUEL - Février 2024"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date du rapport</label>
                <input
                  type="date"
                  value={formData.reportDate}
                  onChange={updateField('reportDate')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Période début</label>
                <input
                  type="date"
                  value={formData.periodStart}
                  onChange={updateField('periodStart')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Période fin</label>
                <input
                  type="date"
                  value={formData.periodEnd}
                  onChange={updateField('periodEnd')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">École</label>
                <input
                  type="text"
                  readOnly
                  value={effectiveSchoolName}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Année scolaire</label>
                <input
                  type="text"
                  value={formData.schoolYear}
                  onChange={updateField('schoolYear')}
                  placeholder="2025-2026"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Établi par</label>
                <input
                  type="text"
                  value={formData.adminName}
                  onChange={updateField('adminName')}
                  placeholder="Nom complet"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
            </div>
          </div>

          <div className="surface-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="section-title">3. Données financières</h3>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Revenus & dépenses</span>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-black text-slate-800">A. Revenus du mois</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
                  <input
                    type="text"
                    value={formData.revenueMonthly}
                    readOnly
                    placeholder="Abonnements mensuels (FCFA)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                  <input
                    type="text"
                    value={formData.revenueQuarterly}
                    readOnly
                    placeholder="Abonnements trimestriels (FCFA)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                  <input
                    type="text"
                    value={formData.revenueAnnual}
                    readOnly
                    placeholder="Abonnements annuels (FCFA)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                  <input
                    type="text"
                    value={formData.revenueObjective}
                    readOnly
                    placeholder="Objectif du mois (FCFA)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div className="mt-4 card-muted p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-bold text-slate-600">
                  <div>TOTAL REVENUS : {formatNumber(revenueTotal)} FCFA</div>
                  <div>OBJECTIF : {formatNumber(revenueObjective)} FCFA</div>
                  <div>ÉCART : {formatNumber(revenueDelta)} FCFA ({revenueDeltaPct.toFixed(1)}%)</div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-sm font-black text-slate-800">B. Répartition des paiements</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <input
                    type="text"
                    value={formData.paymentOrange}
                    readOnly
                    placeholder="Orange Money (FCFA)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                  <input
                    type="text"
                    value={formData.paymentMoov}
                    readOnly
                    placeholder="Moov Money (FCFA)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                  <input
                    type="text"
                    value={formData.paymentCash}
                    readOnly
                    placeholder="Espèces (FCFA)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <input
                    type="text"
                    value={formData.paymentSuccess}
                    readOnly
                    placeholder="Paiements réussis"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                  <input
                    type="text"
                    value={formData.paymentPending}
                    readOnly
                    placeholder="Paiements en attente"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                  <input
                    type="text"
                    value={formData.paymentFailed}
                    readOnly
                    placeholder="Paiements échoués"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div className="mt-4 card-muted p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-bold text-slate-600">
                  <div>Orange Money : {paymentOrangePct.toFixed(1)}% | Moov Money : {paymentMoovPct.toFixed(1)}% | Espèces : {paymentCashPct.toFixed(1)}%</div>
                  <div>Réussis : {paymentSuccessPct.toFixed(1)}% | En attente : {paymentPendingPct.toFixed(1)}% | Échoués : {paymentFailedPct.toFixed(1)}%</div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-sm font-black text-slate-800">C. Coûts opérationnels</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <input
                    type="text"
                    value={formData.expenseFood}
                    readOnly
                    placeholder="Achats alimentaires (FCFA)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                  <input
                    type="text"
                    value={formData.expenseStaff}
                    readOnly
                    placeholder="Personnel (FCFA)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                  <input
                    type="text"
                    value={formData.expenseEquipment}
                    readOnly
                    placeholder="Équipement / entretien (FCFA)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div className="mt-4 card-muted p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-bold text-slate-600">
                  <div>TOTAL DÉPENSES : {formatNumber(expenseTotal)} FCFA</div>
                  <div>MARGE BRUTE : {formatNumber(margin)} FCFA ({marginPct.toFixed(1)}%)</div>
                </div>
              </div>
            </div>
          </div>
          <div className="surface-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="section-title">4. Statistiques d'inscription</h3>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Élèves & abonnements</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                value={formData.totalStudents}
                readOnly
                placeholder="Total élèves école"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
              <input
                type="text"
                value={formData.canteenStudents}
                readOnly
                placeholder="Inscrits cantine"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
              <input
                type="text"
                value={formData.newStudents}
                readOnly
                placeholder="Nouveaux ce mois"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
              <input
                type="text"
                value={formData.leftStudents}
                readOnly
                placeholder="Départs ce mois"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                value={formData.effectifG}
                readOnly
                placeholder="Effectif garçons"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
              <input
                type="text"
                value={formData.effectifF}
                readOnly
                placeholder="Effectif filles"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
              <input
                type="text"
                value={formData.effectifT}
                readOnly
                placeholder="Effectif total"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div className="card-muted p-4 text-xs font-bold text-slate-600">
              Inscrits cantine : {subscriptionRate.toFixed(1)}% | Évolution : {evolution >= 0 ? '+' : ''}{evolution} ({evolutionPct.toFixed(1)}%)
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Répartition par classe</label>
              <textarea
                rows={4}
                value={formData.classDistribution}
                readOnly
                placeholder="CP : 45 élèves (35 cantine)&#10;CE1 : 50 élèves (40 cantine)"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-4">
              <h4 className="text-sm font-black text-slate-800">État des abonnements</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  value={formData.subscriptionActive}
                  readOnly
                  placeholder="Abonnements actifs"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
                <input
                  type="text"
                  value={formData.subscriptionExpiring}
                  readOnly
                  placeholder="Expirent dans 7 jours"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
                <input
                  type="text"
                  value={formData.subscriptionExpired}
                  readOnly
                  placeholder="Expirés non renouvelés"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
                <input
                  type="text"
                  value={formData.subscriptionPending}
                  readOnly
                  placeholder="En attente de paiement"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
              <h4 className="text-sm font-black text-slate-800">Type d'abonnement</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={formData.subscriptionMonthly}
                  readOnly
                  placeholder="Mensuels"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
                <input
                  type="text"
                  value={formData.subscriptionQuarterly}
                  readOnly
                  placeholder="Trimestriels"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
                <input
                  type="text"
                  value={formData.subscriptionAnnual}
                  readOnly
                  placeholder="Annuels"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
            </div>
          </div>

          <div className="surface-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="section-title">5. Statistiques opérationnelles</h3>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Présences & repas</span>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-800">Taux de présence</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={formData.attendanceAverage}
                  readOnly
                  placeholder="Moyenne journalière"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
                <input
                  type="text"
                  value={formData.attendanceRate}
                  readOnly
                  placeholder="Taux de présence (%)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
                <input
                  type="text"
                  value={formData.attendanceGoal}
                  readOnly
                  placeholder="Objectif (%)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  value={formData.week1Rate}
                  readOnly
                  placeholder="Semaine 1 (%)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
                <input
                  type="text"
                  value={formData.week2Rate}
                  readOnly
                  placeholder="Semaine 2 (%)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
                <input
                  type="text"
                  value={formData.week3Rate}
                  readOnly
                  placeholder="Semaine 3 (%)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
                <input
                  type="text"
                  value={formData.week4Rate}
                  readOnly
                  placeholder="Semaine 4 (%)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={formData.mostDay}
                  readOnly
                  placeholder="Jour le plus fréquenté"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
                <input
                  type="text"
                  value={formData.mostDayCount}
                  readOnly
                  placeholder="Nombre (jour le plus fréquenté)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
                <input
                  type="text"
                  value={formData.leastDay}
                  readOnly
                  placeholder="Jour le moins fréquenté"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
                <input
                  type="text"
                  value={formData.leastDayCount}
                  readOnly
                  placeholder="Nombre (jour le moins fréquenté)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="card-muted p-4 text-xs font-bold text-slate-600">
                Écart de présence : {attendanceDelta >= 0 ? '+' : ''}{attendanceDelta.toFixed(1)}%
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-4">
              <h4 className="text-sm font-black text-slate-800">Consommation alimentaire</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={formData.totalMealsMonth}
                  readOnly
                  placeholder="Total repas du mois"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
                <input
                  type="text"
                  value={formData.avgMealsPerDay}
                  readOnly
                  placeholder="Moyenne/jour"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
                <input
                  type="text"
                  value={formData.wasteRate}
                  readOnly
                  placeholder="Gaspillage estimé (%)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plats les plus populaires</label>
                <textarea
                  rows={4}
                  value={formData.popularDishes}
                  readOnly
                  placeholder="1. Riz sauce tomate : 856 (19.6%)&#10;2. Tô sauce arachide : 742 (17%)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
            </div>
          </div>

          <div className="surface-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="section-title">6. Recommandations pour le Super Admin</h3>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Demandes & suggestions</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card-muted p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Budget</p>
                <input
                  type="text"
                  value={formData.budgetRequest}
                  onChange={updateField('budgetRequest')}
                  placeholder="Demande (ex: 500,000 FCFA)"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium"
                />
                <textarea
                  rows={2}
                  value={formData.budgetJustification}
                  onChange={updateField('budgetJustification')}
                  placeholder="Justification"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium"
                />
                <textarea
                  rows={2}
                  value={formData.budgetImpact}
                  onChange={updateField('budgetImpact')}
                  placeholder="Impact attendu"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="card-muted p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Système</p>
                <input
                  type="text"
                  value={formData.systemSuggestion}
                  onChange={updateField('systemSuggestion')}
                  placeholder="Suggestion"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium"
                />
                <textarea
                  rows={2}
                  value={formData.systemBenefit}
                  onChange={updateField('systemBenefit')}
                  placeholder="Avantage"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium"
                />
                <input
                  type="text"
                  value={formData.systemCost}
                  onChange={updateField('systemCost')}
                  placeholder="Coût estimé"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="card-muted p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Formation</p>
                <input
                  type="text"
                  value={formData.trainingNeed}
                  onChange={updateField('trainingNeed')}
                  placeholder="Besoin"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium"
                />
                <input
                  type="text"
                  value={formData.trainingTopic}
                  onChange={updateField('trainingTopic')}
                  placeholder="Sujet"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium"
                />
                <input
                  type="text"
                  value={formData.trainingBudget}
                  onChange={updateField('trainingBudget')}
                  placeholder="Budget estimé"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="card-muted p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Partenariat</p>
                <input
                  type="text"
                  value={formData.partnershipOpportunity}
                  onChange={updateField('partnershipOpportunity')}
                  placeholder="Opportunité"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium"
                />
                <textarea
                  rows={2}
                  value={formData.partnershipBenefit}
                  onChange={updateField('partnershipBenefit')}
                  placeholder="Avantage"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium"
                />
                <input
                  type="text"
                  value={formData.partnershipAction}
                  onChange={updateField('partnershipAction')}
                  placeholder="Action requise"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observations générales</label>
              <textarea
                rows={3}
                value={formData.observations}
                onChange={updateField('observations')}
                placeholder="Commentaires supplémentaires..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {isDraftModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-hidden surface-card shadow-2xl rounded-2xl border border-slate-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
              <div>
                <h3 className="section-title">Brouillon du rapport avant envoi</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Vous pouvez modifier ce contenu avant de l'envoyer au Super Admin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDraftModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
              >
                Fermer
              </button>
            </div>

            <div className="p-6 overflow-auto">
              <textarea
                rows={24}
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm leading-6 min-h-[420px]"
              />
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleDownloadDraft}
                disabled={!draftContent.trim()}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Telecharger brouillon
              </button>
              <button
                type="button"
                onClick={handleSendToSuperAdmin}
                disabled={!draftContent.trim()}
                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-all font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
                Envoyer au Super Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CanteenReports;


