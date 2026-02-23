import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
  UserRound,
  Users
} from 'lucide-react';
import { studentsApi, subscriptionsApi } from '../services/api';
import { Student } from '../types';
import { authStorage } from '../utils/authStorage';

interface StudentsProps {
  schoolId?: string;
}

type SubscriptionStatus = Student['subscriptionStatus'];

type NormalizedSubscription = {
  studentId: string;
  status: SubscriptionStatus;
  planLabel: string;
  endDate?: string;
  endDateValue?: number;
};

type StudentRow = {
  source: Student;
  code: string;
  fullName: string;
  className: string;
  parentName: string;
  parentPhone: string;
  birthDateLabel: string;
  allergies: string[];
  status: SubscriptionStatus;
  statusLabel: string;
  statusClassName: string;
  statusIcon: React.ReactNode;
  planLabel: string;
  expiryLabel: string;
  searchBlob: string;
};

type StatsSummary = {
  total: number;
  withSubscription: number;
  active: number;
  warning: number;
  withoutSubscription: number;
  expired: number;
  rate: number;
};

const PAGE_SIZE = 10;

const STATUS_FILTER_OPTIONS: Array<{ value: 'all' | SubscriptionStatus; label: string }> = [
  { value: 'all', label: 'Statut abonnement' },
  { value: 'active', label: 'Actifs' },
  { value: 'warning', label: 'En attente' },
  { value: 'expired', label: 'Expires' },
  { value: 'none', label: 'Sans abonnement' },
];

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

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

const toDateValue = (value: unknown): number | undefined => {
  if (!value) return undefined;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.getTime();
};

const toStatus = (value: unknown): SubscriptionStatus => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'ACTIVE' || normalized === 'APPROVED' || normalized === 'COMPLETED') return 'active';
  if (normalized === 'PENDING' || normalized === 'PENDING_PAYMENT' || normalized === 'WAITING_ADMIN_VALIDATION') return 'warning';
  if (normalized === 'EXPIRED' || normalized === 'FAILED' || normalized === 'REJECTED' || normalized === 'CANCELLED') return 'expired';
  return 'none';
};

const normalizePlan = (value: unknown): string => {
  const normalized = String(value || '').toUpperCase();
  if (!normalized) return 'SANS PLAN';
  if (normalized.includes('MONTH')) return 'MENSUEL';
  if (normalized.includes('QUART')) return 'TRIMESTRIEL';
  if (normalized.includes('YEAR') || normalized.includes('ANNUAL')) return 'ANNUEL';
  if (normalized.includes('WEEK')) return 'HEBDOMADAIRE';
  if (normalized.includes('DAY')) return 'JOURNALIER';
  return normalized.replaceAll('_', ' ');
};

const formatDate = (value?: string): string => {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleDateString('fr-FR');
};

const formatShortDate = (value?: string): string => {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
};

const extractStudentSubscription = (raw: any): NormalizedSubscription | null => {
  const studentId = toId(
    raw?.childId
    || raw?.child_id
    || raw?.studentId
    || raw?.student_id
    || raw?.child?._id
    || raw?.child?.id
    || raw?.student?._id
    || raw?.student?.id
    || raw?.student
    || raw?.child
  );
  if (!studentId) return null;

  const endDate = raw?.endDate || raw?.end_date;
  return {
    studentId,
    status: toStatus(raw?.status || raw?.subscription_status || raw?.payment_status),
    planLabel: normalizePlan(raw?.plan_type || raw?.planType || raw?.subscription_type || raw?.type),
    endDate: endDate ? String(endDate) : undefined,
    endDateValue: toDateValue(endDate),
  };
};

const selectPreferredSubscription = (
  current: NormalizedSubscription | undefined,
  candidate: NormalizedSubscription
): NormalizedSubscription => {
  if (!current) return candidate;

  const currentDate = current.endDateValue ?? -1;
  const candidateDate = candidate.endDateValue ?? -1;
  if (candidateDate > currentDate) return candidate;
  if (candidateDate < currentDate) return current;

  const priority: Record<SubscriptionStatus, number> = {
    none: 0,
    expired: 1,
    warning: 2,
    active: 3,
  };
  return priority[candidate.status] > priority[current.status] ? candidate : current;
};

const getStatusDisplay = (status: SubscriptionStatus) => {
  if (status === 'active') {
    return {
      label: 'ACTIF',
      className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      icon: <CheckCircle2 size={14} />,
    };
  }
  if (status === 'warning') {
    return {
      label: 'EN ATTENTE',
      className: 'bg-amber-50 text-amber-700 border border-amber-200',
      icon: <Clock3 size={14} />,
    };
  }
  if (status === 'expired') {
    return {
      label: 'EXPIRE',
      className: 'bg-red-50 text-red-700 border border-red-200',
      icon: <AlertTriangle size={14} />,
    };
  }
  return {
    label: 'AUCUN',
    className: 'bg-slate-100 text-slate-700 border border-slate-200',
    icon: <Ban size={14} />,
  };
};

const resolveSchoolName = (): string => {
  try {
    const rawUser = authStorage.getCurrentUserRaw();
    if (!rawUser) return 'Mon ecole';
    const parsed = JSON.parse(rawUser);
    const name = parsed?.schoolName || parsed?.school_name;
    return typeof name === 'string' && name.trim() ? name.trim() : 'Mon ecole';
  } catch {
    return 'Mon ecole';
  }
};

const Students: React.FC<StudentsProps> = ({ schoolId }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [subscriptionsByStudent, setSubscriptionsByStudent] = useState<Map<string, NormalizedSubscription>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | SubscriptionStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    className: '',
    studentCode: '',
    birthDate: '',
    allergiesText: '',
  });
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const schoolName = useMemo(resolveSchoolName, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [studentsData, subscriptionsData] = await Promise.all([
        studentsApi.getStudents(schoolId || ''),
        subscriptionsApi.getSubscriptions(schoolId || ''),
      ]);

      setStudents(studentsData || []);

      const nextMap = new Map<string, NormalizedSubscription>();
      (subscriptionsData || []).forEach((raw) => {
        const normalized = extractStudentSubscription(raw);
        if (!normalized) return;
        const existing = nextMap.get(normalized.studentId);
        nextMap.set(normalized.studentId, selectPreferredSubscription(existing, normalized));
      });
      setSubscriptionsByStudent(nextMap);
    } catch (loadError) {
      console.error('Error loading students page:', loadError);
      setStudents([]);
      setSubscriptionsByStudent(new Map());
      setError('Impossible de charger les eleves pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [classFilter, statusFilter, searchTerm]);

  const rows = useMemo<StudentRow[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return students.map((student) => {
      const subscription = subscriptionsByStudent.get(student.id);
      const forcedExpired =
        !!subscription?.endDateValue
        && subscription.endDateValue < today.getTime()
        && subscription.status !== 'none';
      const status: SubscriptionStatus = forcedExpired ? 'expired' : (subscription?.status || student.subscriptionStatus || 'none');
      const statusDisplay = getStatusDisplay(status);
      const planLabel = status === 'none' ? 'SANS ABONNEMENT' : (subscription?.planLabel || student.subscriptionPlan || 'ABONNEMENT');

      let expiryLabel = 'Sans abonnement';
      const endDate = subscription?.endDate || student.subscriptionEndDate;
      if (endDate) {
        expiryLabel = status === 'expired'
          ? `Expire le ${formatShortDate(endDate)}`
          : `Expire: ${formatShortDate(endDate)}`;
      } else if (status === 'active') {
        expiryLabel = 'Actif sans date';
      } else if (status === 'warning') {
        expiryLabel = 'Validation en attente';
      } else if (status === 'expired') {
        expiryLabel = 'Renouvellement requis';
      }

      const allergies = Array.isArray(student.allergies) ? student.allergies.filter(Boolean) : [];
      const fullName = `${student.lastName || ''} ${student.firstName || ''}`.trim() || `${student.firstName || ''} ${student.lastName || ''}`.trim();
      const parentName = student.parentName || 'Parent non assigne';
      const parentPhone = student.parentPhone || '--';
      const code = student.studentCode || `ELEVE-${student.id.slice(-4).toUpperCase()}`;
      const className = student.class || 'Non classe';

      return {
        source: student,
        code,
        fullName: fullName || 'Eleve',
        className,
        parentName,
        parentPhone,
        birthDateLabel: formatDate(student.birthDate),
        allergies,
        status,
        statusLabel: statusDisplay.label,
        statusClassName: statusDisplay.className,
        statusIcon: statusDisplay.icon,
        planLabel,
        expiryLabel,
        searchBlob: `${code} ${fullName} ${className} ${parentName} ${parentPhone}`.toLowerCase(),
      };
    });
  }, [students, subscriptionsByStudent]);

  const classOptions = useMemo(() => {
    const unique = Array.from(new Set(rows.map((row) => row.className).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    return ['all', ...unique];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesClass = classFilter === 'all' || row.className === classFilter;
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const search = searchTerm.trim().toLowerCase();
      const matchesSearch = !search || row.searchBlob.includes(search);
      return matchesClass && matchesStatus && matchesSearch;
    });
  }, [rows, classFilter, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    const summary = rows.reduce(
      (acc, row) => {
        acc.total += 1;
        if (row.status === 'active') acc.active += 1;
        else if (row.status === 'warning') acc.warning += 1;
        else if (row.status === 'expired') acc.expired += 1;
        else acc.withoutSubscription += 1;
        return acc;
      },
      {
        total: 0,
        withSubscription: 0,
        active: 0,
        warning: 0,
        withoutSubscription: 0,
        expired: 0,
        rate: 0,
      } as StatsSummary
    );
    summary.withSubscription = summary.total - summary.withoutSubscription;
    summary.rate = summary.total > 0 ? Math.round((summary.withSubscription / summary.total) * 100) : 0;
    return summary;
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleExportPdf = () => {
    const headers = ['Code', 'Nom', 'Classe', 'Parent', 'Telephone parent', 'Abonnement', 'Echeance'];
    const rowsForExport = filteredRows.map((row) => [
      row.code,
      row.fullName,
      row.className,
      row.parentName,
      row.parentPhone,
      `${row.statusLabel} - ${row.planLabel}`,
      row.expiryLabel,
    ]);

    const reportWindow = window.open('', '_blank', 'width=1100,height=780');
    if (!reportWindow) {
      setError('Impossible d ouvrir la fenetre d export. Verifie le bloqueur de pop-up.');
      return;
    }

    const tableHeaderHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('');
    const tableRowsHtml = rowsForExport.length > 0
      ? rowsForExport
          .map((line) => `<tr>${line.map((value) => `<td>${escapeHtml(String(value))}</td>`).join('')}</tr>`)
          .join('')
      : `<tr><td colspan="${headers.length}">Aucune ligne a exporter.</td></tr>`;

    reportWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Export Eleves - ${escapeHtml(schoolName)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
            h1 { margin: 0 0 6px 0; font-size: 22px; }
            p { margin: 0 0 14px 0; color: #4b5563; font-size: 13px; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
          </style>
        </head>
        <body>
          <h1>Gestion des eleves - ${escapeHtml(schoolName)}</h1>
          <p>Export du ${new Date().toLocaleDateString('fr-FR')} - ${filteredRows.length} eleve(s)</p>
          <table>
            <thead><tr>${tableHeaderHtml}</tr></thead>
            <tbody>${tableRowsHtml}</tbody>
          </table>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  const handleImportCsvClick = () => {
    if (!schoolId) {
      setError('Aucune ecole associee: import CSV indisponible.');
      return;
    }
    setError('');
    setImportMessage(null);
    if (csvInputRef.current) {
      csvInputRef.current.value = '';
      csvInputRef.current.click();
    }
  };

  const handleImportCsvChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!schoolId) {
      setError('Aucune ecole associee: import CSV indisponible.');
      return;
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv')) {
      setImportMessage({ type: 'error', text: 'Format invalide. Selectionne un fichier .csv.' });
      return;
    }

    setError('');
    setImportMessage({ type: 'info', text: `Import en cours: ${file.name}` });
    setIsImporting(true);
    try {
      const result = await studentsApi.importStudentsPdf(file, schoolId);
      if (!result.success) {
        setImportMessage({ type: 'error', text: result.message || 'Echec import CSV.' });
        return;
      }

      const payload = result.data || {};
      const inserted = Number(payload.inserted ?? payload.imported ?? 0);
      const matched = Number(payload.matched ?? payload.duplicates ?? 0);
      const invalidCount = Array.isArray(payload.errors)
        ? payload.errors.length
        : Array.isArray(payload.invalidRows)
          ? payload.invalidRows.length
          : 0;

      setImportMessage({
        type: 'success',
        text: `Import termine: ${inserted} ajoutes, ${matched} deja existants, ${invalidCount} lignes invalides.`,
      });
      await loadData();
    } catch (importErr: any) {
      console.error('CSV import error:', importErr);
      setImportMessage({ type: 'error', text: importErr?.message || 'Echec import CSV.' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleCreateStudent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!schoolId) {
      setError('Aucune ecole associee: creation eleve indisponible.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const payload = {
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        class: createForm.className.trim(),
        schoolId,
        birthDate: createForm.birthDate || undefined,
        studentCode: createForm.studentCode.trim() || undefined,
        allergies: createForm.allergiesText
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      };

      if (!payload.firstName || !payload.lastName || !payload.class) {
        setError('Prenom, nom et classe sont obligatoires.');
        setIsSubmitting(false);
        return;
      }

      const created = await studentsApi.createStudent(payload);
      if (!created) {
        setError('Creation eleve echouee.');
        setIsSubmitting(false);
        return;
      }

      setCreateForm({
        firstName: '',
        lastName: '',
        className: '',
        studentCode: '',
        birthDate: '',
        allergiesText: '',
      });
      setIsCreateOpen(false);
      await loadData();
    } catch (submitError) {
      console.error('Error creating student:', submitError);
      setError('Creation eleve echouee.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (row: StudentRow) => {
    const confirmDelete = window.confirm(`Supprimer l eleve ${row.fullName} ?`);
    if (!confirmDelete) return;

    setError('');
    const deleted = await studentsApi.deleteStudent(row.source.id);
    if (!deleted) {
      setError('Suppression echouee.');
      return;
    }
    setOpenActionMenuId(null);
    await loadData();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="surface-card p-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <Users size={22} />
            GESTION DES ELEVES - {schoolName}
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Vue School Admin: inscription, suivi abonnement et alertes eleves.</p>
        </div>
        <span className="text-xs font-black uppercase tracking-widest text-slate-500">
          Affichage {filteredRows.length} sur {rows.length}
        </span>
      </div>

      {error && (
        <div className="surface-card p-4 border border-red-200 bg-red-50 text-red-700 text-sm font-semibold">
          {error}
        </div>
      )}

      {importMessage && (
        <div
          className={`surface-card p-4 text-sm font-semibold ${
            importMessage.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              : importMessage.type === 'error'
                ? 'border border-red-200 bg-red-50 text-red-700'
                : 'border border-amber-200 bg-amber-50 text-amber-700'
          }`}
        >
          {importMessage.text}
        </div>
      )}

      <div className="surface-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 flex-1">
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              {classOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'Toutes classes' : option}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | SubscriptionStatus)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label className="h-11 rounded-xl border border-slate-200 bg-white px-3 flex items-center gap-2">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Rechercher..."
                className="w-full bg-transparent text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              disabled={!schoolId}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={15} />
              Inscrire eleve
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50"
            >
              <FileText size={15} />
              Exporter PDF
            </button>
            <button
              type="button"
              onClick={handleImportCsvClick}
              disabled={isImporting || !schoolId}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isImporting ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {isImporting ? 'Import...' : 'Importer CSV'}
            </button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImportCsvChange}
            />
          </div>
        </div>
      </div>

      <div className="surface-card p-6">
        <h3 className="section-title text-base">STATISTIQUES</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="card-muted p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total eleves</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{stats.total.toLocaleString('fr-FR')}</p>
          </div>
          <div className="card-muted p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Inscrits cantine</p>
            <p className="mt-2 text-2xl font-black text-slate-900">
              {stats.withSubscription.toLocaleString('fr-FR')}
              <span className="ml-1 text-sm text-emerald-600">({stats.rate}%)</span>
            </p>
          </div>
          <div className="card-muted p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Actifs</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{stats.active.toLocaleString('fr-FR')}</p>
          </div>
          <div className="card-muted p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sans abonnement</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{stats.withoutSubscription.toLocaleString('fr-FR')}</p>
          </div>
          <div className="card-muted p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Abonnements expires</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{stats.expired.toLocaleString('fr-FR')}</p>
          </div>
        </div>
      </div>

      <div className="table-shell">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4">
          <h3 className="section-title text-base">LISTE DES ELEVES (Table)</h3>
          {loading && (
            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
              <Loader2 size={14} className="animate-spin" />
              Chargement
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="table-head">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Nom</th>
                <th className="px-6 py-4">Classe</th>
                <th className="px-6 py-4">Parent</th>
                <th className="px-6 py-4">Abonnement</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {!loading && paginatedRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    Aucun eleve ne correspond aux filtres actuels.
                  </td>
                </tr>
              )}

              {paginatedRows.map((row) => (
                <tr key={row.source.id} className="hover:bg-slate-50/40">
                  <td className="px-6 py-4 align-top">
                    <p className="font-black text-slate-800">{row.code}</p>
                  </td>

                  <td className="px-6 py-4 align-top">
                    <p className="font-bold text-slate-800">{row.fullName}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                      <CalendarDays size={12} />
                      {row.birthDateLabel}
                    </p>
                    {row.allergies.length > 0 && (
                      <p className="mt-1 inline-flex items-start gap-1 text-xs text-red-700">
                        <AlertTriangle size={12} className="mt-0.5" />
                        Allergie: {row.allergies.join(', ')}
                      </p>
                    )}
                  </td>

                  <td className="px-6 py-4 align-top">
                    <span className="font-bold text-slate-700">{row.className}</span>
                  </td>

                  <td className="px-6 py-4 align-top">
                    <p className="font-semibold text-slate-700">{row.parentName}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                      <UserRound size={12} />
                      {row.parentPhone}
                    </p>
                  </td>

                  <td className="px-6 py-4 align-top">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${row.statusClassName}`}>
                      {row.statusIcon}
                      {row.planLabel}
                    </span>
                    <p className="mt-2 text-xs text-slate-500">{row.expiryLabel}</p>
                  </td>

                  <td className="px-6 py-4 align-top text-right relative">
                    <button
                      type="button"
                      onClick={() => setOpenActionMenuId((previous) => (previous === row.source.id ? null : row.source.id))}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {openActionMenuId === row.source.id && (
                      <div className="absolute right-6 z-20 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => setOpenActionMenuId(null)}
                          className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Fermer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(row)}
                          className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Supprimer eleve
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wide text-slate-700 disabled:opacity-40"
            >
              Prec
            </button>
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Page {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((previous) => Math.min(totalPages, previous + 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wide text-slate-700 disabled:opacity-40"
            >
              Suiv
            </button>
          </div>

          <span className="text-xs font-semibold text-slate-500">
            Affichage {filteredRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}-
            {Math.min(safePage * PAGE_SIZE, filteredRows.length)} sur {filteredRows.length}
          </span>
        </div>
      </div>

      {isCreateOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              setIsCreateOpen(false);
            }
          }}
        >
          <div className="surface-card w-full max-w-2xl p-6">
            <h3 className="section-title text-lg">Inscrire un eleve</h3>
            <p className="mt-1 text-sm text-slate-500">Ajout rapide dans la liste des eleves de votre ecole.</p>

            <form className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleCreateStudent}>
              <input
                required
                value={createForm.firstName}
                onChange={(event) => setCreateForm((previous) => ({ ...previous, firstName: event.target.value }))}
                placeholder="Prenom"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              <input
                required
                value={createForm.lastName}
                onChange={(event) => setCreateForm((previous) => ({ ...previous, lastName: event.target.value }))}
                placeholder="Nom"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              <input
                required
                value={createForm.className}
                onChange={(event) => setCreateForm((previous) => ({ ...previous, className: event.target.value }))}
                placeholder="Classe (ex: CM1)"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              <input
                value={createForm.studentCode}
                onChange={(event) => setCreateForm((previous) => ({ ...previous, studentCode: event.target.value }))}
                placeholder="Code eleve"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              <input
                type="date"
                value={createForm.birthDate}
                onChange={(event) => setCreateForm((previous) => ({ ...previous, birthDate: event.target.value }))}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              <input
                value={createForm.allergiesText}
                onChange={(event) => setCreateForm((previous) => ({ ...previous, allergiesText: event.target.value }))}
                placeholder="Allergies (separees par des virgules)"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />

              <div className="md:col-span-2 mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
