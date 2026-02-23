import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Search,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { paymentsApi, schoolsApi } from '../services/api';
import { Payment, School } from '../types';

interface PaymentsProps {
  schoolId: string;
  initialSearch?: string;
  onNavigateTab?: (tab: string) => void;
}

type DateFilter = 'all' | 'today' | '7d' | 'month' | 'quarter' | 'year';
type StatusFilter = 'all' | 'completed' | 'pending' | 'failed';
type MethodFilter = 'all' | Payment['method'];

type RevenuePeriodCard = {
  title: string;
  amount: number;
  deltaLabel: string;
};

const METHOD_LABELS: Record<Payment['method'], string> = {
  ORANGE_MONEY: 'Orange Money',
  MOOV_MONEY: 'Moov Money',
  CASH: 'Especes',
};

const METHOD_ORDER: Payment['method'][] = ['ORANGE_MONEY', 'MOOV_MONEY', 'CASH'];

const toLocalDate = (value: string | Date): Date => {
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`);
  return new Date(value);
};

const toDateKey = (value: string | Date): string => {
  const date = toLocalDate(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toMonthKey = (value: string | Date): string => {
  const date = toLocalDate(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const getQuarterRange = (reference: Date): { start: Date; end: Date; key: string } => {
  const quarter = Math.floor(reference.getMonth() / 3);
  const startMonth = quarter * 3;
  const start = new Date(reference.getFullYear(), startMonth, 1, 0, 0, 0, 0);
  const end = new Date(reference.getFullYear(), startMonth + 3, 0, 23, 59, 59, 999);
  return { start, end, key: `${reference.getFullYear()}-Q${quarter + 1}` };
};

const getPreviousQuarterRange = (reference: Date): { start: Date; end: Date; key: string } => {
  const q = getQuarterRange(reference);
  const previousEnd = new Date(q.start.getTime() - 1);
  return getQuarterRange(previousEnd);
};

const formatFcfa = (amount: number): string => `${Math.round(amount || 0).toLocaleString('fr-FR')} FCFA`;

const formatCompactFcfa = (amount: number): string => {
  const value = Math.round(amount || 0);
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M FCFA`;
  return `${value.toLocaleString('fr-FR')} FCFA`;
};

const formatDelta = (current: number, previous: number, positiveLabel: string, neutralLabel: string): string => {
  if (previous <= 0) {
    if (current <= 0) return neutralLabel;
    return `+100.0% ${positiveLabel}`;
  }
  const delta = ((current - previous) / previous) * 100;
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}% ${positiveLabel}`;
};

const getSchoolName = (schoolId: string, schoolById: Map<string, School>): string => {
  if (!schoolId) return 'Sans ecole';
  return schoolById.get(schoolId)?.name || `Ecole ${schoolId.slice(-4).toUpperCase()}`;
};

const isCashWaitingAdminValidation = (payment: Payment): boolean =>
  String(payment.method || '').toUpperCase() === 'CASH'
  && String(payment.rawStatus || '').toUpperCase() === 'WAITING_ADMIN_VALIDATION';

const Payments: React.FC<PaymentsProps> = ({ schoolId, initialSearch = '', onNavigateTab }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [schoolFilter, setSchoolFilter] = useState<'all' | string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isValidatingAll, setIsValidatingAll] = useState(false);
  const [validatingPaymentId, setValidatingPaymentId] = useState<string | null>(null);

  useEffect(() => {
    setSearchQuery(initialSearch);
  }, [initialSearch]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [paymentsData, schoolsData] = await Promise.all([
        paymentsApi.getPayments(schoolId || ''),
        schoolsApi.getSchools(),
      ]);
      setPayments(paymentsData || []);
      setSchools(schoolsData || []);
    } catch (error) {
      console.error('Erreur lors du chargement des paiements:', error);
      setPayments([]);
      setSchools([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const schoolById = useMemo(() => {
    const map = new Map<string, School>();
    schools.forEach((school) => map.set(school.id, school));
    return map;
  }, [schools]);

  const completedPayments = useMemo(
    () => payments.filter((payment) => payment.status === 'completed'),
    [payments]
  );

  const pendingPayments = useMemo(
    () => payments.filter((payment) => payment.status === 'pending' || String(payment.rawStatus || '').toUpperCase() === 'WAITING_ADMIN_VALIDATION'),
    [payments]
  );

  const cashPaymentsToValidate = useMemo(
    () => pendingPayments.filter(isCashWaitingAdminValidation),
    [pendingPayments]
  );

  const now = useMemo(() => new Date(), []);
  const todayKey = toDateKey(now);
  const yesterday = useMemo(() => {
    const date = new Date(now);
    date.setDate(date.getDate() - 1);
    return date;
  }, [now]);
  const yesterdayKey = toDateKey(yesterday);
  const thisMonthKey = toMonthKey(now);
  const previousMonth = useMemo(() => {
    const date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return date;
  }, [now]);
  const previousMonthKey = toMonthKey(previousMonth);

  const thisYear = now.getFullYear();
  const previousYear = thisYear - 1;
  const thisQuarter = getQuarterRange(now);
  const previousQuarter = getPreviousQuarterRange(now);

  const sumAmount = (source: Payment[]): number => source.reduce((total, payment) => total + Number(payment.amount || 0), 0);

  const revenueToday = sumAmount(completedPayments.filter((payment) => toDateKey(payment.date) === todayKey));
  const revenueYesterday = sumAmount(completedPayments.filter((payment) => toDateKey(payment.date) === yesterdayKey));
  const revenueMonth = sumAmount(completedPayments.filter((payment) => toMonthKey(payment.date) === thisMonthKey));
  const revenuePreviousMonth = sumAmount(completedPayments.filter((payment) => toMonthKey(payment.date) === previousMonthKey));
  const revenueQuarter = sumAmount(completedPayments.filter((payment) => {
    const date = toLocalDate(payment.date).getTime();
    return date >= thisQuarter.start.getTime() && date <= thisQuarter.end.getTime();
  }));
  const revenuePreviousQuarter = sumAmount(completedPayments.filter((payment) => {
    const date = toLocalDate(payment.date).getTime();
    return date >= previousQuarter.start.getTime() && date <= previousQuarter.end.getTime();
  }));
  const revenueYear = sumAmount(completedPayments.filter((payment) => toLocalDate(payment.date).getFullYear() === thisYear));
  const revenuePreviousYear = sumAmount(completedPayments.filter((payment) => toLocalDate(payment.date).getFullYear() === previousYear));

  const revenueCards: RevenuePeriodCard[] = [
    {
      title: "Aujourd'hui",
      amount: revenueToday,
      deltaLabel: formatDelta(revenueToday, revenueYesterday, 'vs hier', 'Stable vs hier'),
    },
    {
      title: 'Ce mois',
      amount: revenueMonth,
      deltaLabel: formatDelta(revenueMonth, revenuePreviousMonth, 'vs mois precedent', 'Stable ce mois'),
    },
    {
      title: 'Ce trimestre',
      amount: revenueQuarter,
      deltaLabel: formatDelta(revenueQuarter, revenuePreviousQuarter, 'vs trimestre precedent', 'Stable ce trimestre'),
    },
    {
      title: 'Cette annee',
      amount: revenueYear,
      deltaLabel: formatDelta(revenueYear, revenuePreviousYear, 'vs annee precedente', 'Stable cette annee'),
    },
  ];

  const monthWindow = useMemo(() => {
    const months: Array<{ key: string; label: string }> = [];
    for (let offset = 11; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      months.push({
        key: toMonthKey(date),
        label: date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase(),
      });
    }
    return months;
  }, [now]);

  const monthlyRevenue = useMemo(() => {
    const byMonth = new Map(monthWindow.map((month) => [month.key, { month: month.label, revenue: 0 }]));
    completedPayments.forEach((payment) => {
      const key = toMonthKey(payment.date);
      const point = byMonth.get(key);
      if (point) point.revenue += Number(payment.amount || 0);
    });
    return monthWindow.map((month) => byMonth.get(month.key) || { month: month.label, revenue: 0 });
  }, [completedPayments, monthWindow]);

  const paymentMethods = useMemo(() => {
    const monthPayments = completedPayments.filter((payment) => toMonthKey(payment.date) === thisMonthKey);
    const totalAmount = sumAmount(monthPayments);
    const totalTransactions = monthPayments.length;
    const grouped = METHOD_ORDER.map((method) => {
      const methodPayments = monthPayments.filter((payment) => payment.method === method);
      const amount = sumAmount(methodPayments);
      const transactions = methodPayments.length;
      const ratio = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
      return { method, label: METHOD_LABELS[method], amount, transactions, ratio };
    });
    return { grouped, totalAmount, totalTransactions };
  }, [completedPayments, thisMonthKey]);

  const topSchools = useMemo(() => {
    const monthPayments = completedPayments.filter((payment) => toMonthKey(payment.date) === thisMonthKey);
    const totalAmount = sumAmount(monthPayments);
    const grouped = monthPayments.reduce<Record<string, number>>((acc, payment) => {
      const key = payment.schoolId || 'none';
      acc[key] = (acc[key] || 0) + Number(payment.amount || 0);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([currentSchoolId, amount]) => ({
        schoolId: currentSchoolId,
        schoolName: getSchoolName(currentSchoolId === 'none' ? '' : currentSchoolId, schoolById),
        amount,
        ratio: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [completedPayments, thisMonthKey, schoolById]);

  const filteredPayments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return payments
      .filter((payment) => {
        if (schoolFilter !== 'all' && (payment.schoolId || 'none') !== schoolFilter) return false;
        if (statusFilter !== 'all' && payment.status !== statusFilter) return false;
        if (methodFilter !== 'all' && payment.method !== methodFilter) return false;

        if (dateFilter !== 'all') {
          const date = toLocalDate(payment.date);
          if (dateFilter === 'today' && toDateKey(date) !== todayKey) return false;
          if (dateFilter === '7d' && date.getTime() < sevenDaysAgo.getTime()) return false;
          if (dateFilter === 'month' && toMonthKey(date) !== thisMonthKey) return false;
          if (dateFilter === 'quarter') {
            const value = date.getTime();
            if (value < thisQuarter.start.getTime() || value > thisQuarter.end.getTime()) return false;
          }
          if (dateFilter === 'year' && date.getFullYear() !== thisYear) return false;
        }

        if (!query) return true;

        const schoolName = getSchoolName(payment.schoolId, schoolById).toLowerCase();
        const method = METHOD_LABELS[payment.method].toLowerCase();

        return (
          payment.studentName.toLowerCase().includes(query)
          || schoolName.includes(query)
          || method.includes(query)
          || String(payment.amount).includes(query)
        );
      })
      .sort((a, b) => toLocalDate(b.date).getTime() - toLocalDate(a.date).getTime());
  }, [
    payments,
    searchQuery,
    schoolFilter,
    statusFilter,
    methodFilter,
    dateFilter,
    todayKey,
    thisMonthKey,
    thisQuarter.start,
    thisQuarter.end,
    thisYear,
    schoolById,
  ]);

  const handleValidatePayment = async (paymentId: string) => {
    if (!/^[a-f0-9]{24}$/i.test(paymentId)) {
      alert('Identifiant de paiement invalide.');
      return;
    }

    setValidatingPaymentId(paymentId);
    try {
      const ok = await paymentsApi.validatePayment(paymentId, 'COMPLETED');
      if (!ok) {
        alert('Validation impossible pour ce paiement.');
        return;
      }
      await loadData();
    } catch (error) {
      console.error('Erreur de validation paiement:', error);
      alert('Erreur lors de la validation du paiement.');
    } finally {
      setValidatingPaymentId(null);
    }
  };

  const handleValidateAll = async () => {
    const validatable = cashPaymentsToValidate.filter((payment) => /^[a-f0-9]{24}$/i.test(payment.id));
    if (validatable.length === 0) {
      alert('Aucun paiement cash en attente admin a confirmer.');
      return;
    }

    setIsValidatingAll(true);
    try {
      await Promise.all(validatable.map((payment) => paymentsApi.validatePayment(payment.id, 'COMPLETED')));
      await loadData();
    } catch (error) {
      console.error('Erreur validation globale:', error);
      alert('Validation globale partiellement echouee.');
    } finally {
      setIsValidatingAll(false);
    }
  };

  const exportCsv = () => {
    if (filteredPayments.length === 0) {
      alert('Aucune donnee a exporter.');
      return;
    }

    const rows = filteredPayments.map((payment) => ({
      date: toLocalDate(payment.date).toLocaleDateString('fr-FR'),
      ecole: getSchoolName(payment.schoolId, schoolById),
      eleve: payment.studentName,
      montant: Math.round(payment.amount || 0),
      methode: METHOD_LABELS[payment.method],
      statut: payment.status,
    }));

    const headers = ['Date', 'Ecole', 'Eleve', 'Montant_FCFA', 'Methode', 'Statut'];
    const csvBody = rows
      .map((row) => [
        row.date,
        row.ecole,
        row.eleve,
        row.montant.toString(),
        row.methode,
        row.statut,
      ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const csv = `${headers.join(',')}\n${csvBody}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `paiements-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const pendingTotalAmount = sumAmount(cashPaymentsToValidate);
  const refreshedAt = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="surface-card p-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <Wallet size={12} />
          Gestion des paiements
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="section-title">Gestion des Paiements - Vue Globale</h2>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mise a jour: {refreshedAt}</span>
        </div>
      </div>

      <div className="surface-card p-6">
        <h3 className="section-title mb-4">Revenus globaux</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {revenueCards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{card.title}</p>
              <p className="mt-3 text-2xl font-black text-slate-900">{formatCompactFcfa(card.amount)}</p>
              <p className={`mt-2 text-[11px] font-bold ${card.deltaLabel.startsWith('+') ? 'text-emerald-600' : card.deltaLabel.startsWith('-') ? 'text-rose-600' : 'text-slate-500'}`}>
                {card.deltaLabel}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="surface-card p-6">
        <h3 className="section-title mb-3">Evolution des revenus (12 mois)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="4 4" stroke="#e8e0d6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#7b746d' }} />
              <YAxis tick={{ fontSize: 11, fill: '#7b746d' }} tickFormatter={(value) => `${Math.round(Number(value || 0) / 1_000_000)}M`} />
              <Tooltip formatter={(value: number) => formatFcfa(Number(value || 0))} />
              <Line type="monotone" dataKey="revenue" stroke="#c9a227" strokeWidth={3} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="surface-card p-6">
          <h3 className="section-title mb-4">Repartition par methode de paiement</h3>
          <div className="space-y-3">
            {paymentMethods.grouped.map((row) => (
              <div key={row.method}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <p className="font-semibold text-slate-700">{row.label}</p>
                  <p className="font-black text-slate-900">{formatCompactFcfa(row.amount)}</p>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(row.ratio, 100))}%` }} />
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {row.ratio.toFixed(1)}% ({row.transactions.toLocaleString('fr-FR')} transactions)
                </p>
              </div>
            ))}
            <div className="border-t border-slate-100 pt-3 text-sm font-semibold text-slate-700">
              Total: <strong className="text-slate-900">{formatCompactFcfa(paymentMethods.totalAmount)}</strong>
              <span className="mx-2">|</span>
              Transactions: <strong className="text-slate-900">{paymentMethods.totalTransactions.toLocaleString('fr-FR')}</strong>
            </div>
          </div>
        </div>

        <div className="surface-card p-6">
          <h3 className="section-title mb-4">Top 5 ecoles par revenus (ce mois)</h3>
          <div className="space-y-3">
            {topSchools.length > 0 ? topSchools.map((school, index) => (
              <div key={school.schoolId + school.schoolName}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <p className="font-semibold text-slate-700">{index + 1}. {school.schoolName}</p>
                  <p className="font-black text-slate-900">{formatCompactFcfa(school.amount)}</p>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(0, Math.min(school.ratio, 100))}%` }} />
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">{school.ratio.toFixed(1)}% du revenu mensuel</p>
              </div>
            )) : (
              <p className="text-sm font-medium text-slate-500">Aucune transaction completee ce mois.</p>
            )}
          </div>
        </div>
      </div>

      <div className="surface-card p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="section-title">Paiements cash en attente de validation</h3>
          <button
            onClick={handleValidateAll}
            disabled={isValidatingAll || cashPaymentsToValidate.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 size={14} />
            {isValidatingAll ? 'Validation...' : 'Tout valider'}
          </button>
        </div>

        <div className="space-y-2">
          {cashPaymentsToValidate.slice(0, 8).map((payment) => (
            <div key={payment.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">{getSchoolName(payment.schoolId, schoolById)} - Parent: {payment.studentName}</p>
                <p className="text-xs font-semibold text-slate-500">
                  {formatFcfa(payment.amount)} | {METHOD_LABELS[payment.method]} | {toLocalDate(payment.date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <button
                onClick={() => handleValidatePayment(payment.id)}
                disabled={validatingPaymentId === payment.id}
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 size={13} />
                {validatingPaymentId === payment.id ? 'Validation...' : 'Valider'}
              </button>
            </div>
          ))}

          {cashPaymentsToValidate.length === 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
              Aucun paiement cash en attente de validation admin.
            </div>
          )}
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-600">
          Total en attente: <strong className="text-slate-900">{formatFcfa(pendingTotalAmount)}</strong> ({cashPaymentsToValidate.length} paiements)
        </p>
      </div>

      <div className="surface-card p-5">
        <h3 className="section-title mb-4">Recherche et filtres</h3>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[180px_150px_160px_160px_1fr] lg:items-center">
          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <option value="all">Ecole</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>{school.name}</option>
            ))}
            <option value="none">Sans ecole</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <option value="all">Statut</option>
            <option value="completed">Valide</option>
            <option value="pending">En attente</option>
            <option value="failed">Echoue</option>
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as MethodFilter)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <option value="all">Methode</option>
            <option value="ORANGE_MONEY">Orange Money</option>
            <option value="MOOV_MONEY">Moov Money</option>
            <option value="CASH">Especes</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <option value="all">Date</option>
            <option value="today">Aujourd hui</option>
            <option value="7d">7 derniers jours</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette annee</option>
          </select>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">
            <Download size={14} />
            Exporter Excel
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">
            <FileText size={14} />
            Exporter PDF
          </button>
          <button onClick={() => onNavigateTab?.('school-admin-reports')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">
            <TrendingUp size={14} />
            Rapport detaille
          </button>
        </div>
      </div>

      <div className="surface-card p-6">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h3 className="section-title">Transactions</h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Affichage {filteredPayments.length} sur {payments.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Ecole</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Methode</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredPayments.slice(0, 120).map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50/40">
                  <td className="px-4 py-3 font-semibold text-slate-700">{getSchoolName(payment.schoolId, schoolById)}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{payment.studentName}</td>
                  <td className="px-4 py-3 font-black text-emerald-600">{formatFcfa(payment.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{METHOD_LABELS[payment.method]}</td>
                  <td className="px-4 py-3 text-slate-600">{toLocalDate(payment.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
                      payment.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : payment.status === 'pending'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                    }`}>
                      {payment.status === 'completed' ? 'Valide' : payment.status === 'pending' ? 'En attente' : 'Echoue'}
                    </span>
                  </td>
                </tr>
              ))}

              {!isLoading && filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <div className="mx-auto flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                      <AlertTriangle size={16} />
                      Aucune transaction avec ces filtres.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredPayments.length > 120 && (
          <p className="mt-3 text-xs font-semibold text-slate-500">
            {filteredPayments.length - 120} autres transactions correspondent aux filtres.
          </p>
        )}

        {isLoading && (
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Chargement des paiements...
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;
