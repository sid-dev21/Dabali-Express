import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileText, Trash2, X } from 'lucide-react';

interface CanteenHistoryProps {
  schoolName: string;
  managerName: string;
}

type QuantityKey = 'haricot' | 'riz' | 'huile' | 'spaghetti';
type NumericQuantityMap = Record<QuantityKey, number | null>;

type StockReportRow = {
  rowNumber: number;
  preparationDate: string | null;
  preparationDateLabel: string;
  rationnairesCount: number | null;
  totalPresents: number | null;
  available: NumericQuantityMap;
  outgoing: NumericQuantityMap;
  remaining: NumericQuantityMap;
};

type StockReportPayload = {
  reportId: string;
  generatedAt: string;
  period: string;
  schoolName: string;
  managerName: string;
  opening: NumericQuantityMap;
  received: NumericQuantityMap;
  totals: NumericQuantityMap;
  rows: StockReportRow[];
};

const SENT_REPORTS_STORAGE_KEY = 'dabali_express_stock_reports_sent_v1';
const HISTORY_DELETED_KEY = 'dabali_express_canteen_history_deleted_v1';

const quantityKeys: QuantityKey[] = ['haricot', 'riz', 'huile', 'spaghetti'];
const quantityLabels: Record<QuantityKey, string> = {
  haricot: 'Haricot',
  riz: 'Riz',
  huile: 'Huile',
  spaghetti: 'Spaghetti'
};
const quantityUnits: Record<QuantityKey, string> = {
  haricot: 'kg',
  riz: 'kg',
  huile: 'L',
  spaghetti: 'paquet'
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const emptyQuantityMap = (): NumericQuantityMap => ({
  haricot: null,
  riz: null,
  huile: null,
  spaghetti: null
});

const parseQuantityMap = (raw: unknown): NumericQuantityMap => {
  if (!raw || typeof raw !== 'object') return emptyQuantityMap();
  const map = raw as Record<string, unknown>;
  return {
    haricot: toNumber(map.haricot),
    riz: toNumber(map.riz),
    huile: toNumber(map.huile),
    spaghetti: toNumber(map.spaghetti)
  };
};

const parseRows = (rawRows: unknown): StockReportRow[] => {
  if (!Array.isArray(rawRows)) return [];

  return rawRows.map((row, index) => {
    const item = (row && typeof row === 'object') ? row as Record<string, unknown> : {};
    const rawRowNumber = toNumber(item.rowNumber);
    return {
      rowNumber: rawRowNumber === null ? index + 1 : Math.max(1, Math.trunc(rawRowNumber)),
      preparationDate: item.preparationDate ? String(item.preparationDate) : null,
      preparationDateLabel: item.preparationDateLabel ? String(item.preparationDateLabel) : '',
      rationnairesCount: toNumber(item.rationnairesCount),
      totalPresents: toNumber(item.totalPresents),
      available: parseQuantityMap(item.available),
      outgoing: parseQuantityMap(item.outgoing),
      remaining: parseQuantityMap(item.remaining)
    };
  });
};

const parseReport = (raw: unknown, index: number): StockReportPayload | null => {
  if (!raw || typeof raw !== 'object') return null;
  const report = raw as Record<string, unknown>;

  const reportId = String(report.reportId || '').trim() || `STOCK-REPORT-${index + 1}`;
  const generatedAt = String(report.generatedAt || '').trim();
  const parsedDate = generatedAt ? new Date(generatedAt) : null;

  return {
    reportId,
    generatedAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : new Date().toISOString(),
    period: String(report.period || 'Periode non definie'),
    schoolName: String(report.schoolName || 'Ecole non renseignee'),
    managerName: String(report.managerName || 'Gestionnaire non renseigne'),
    opening: parseQuantityMap(report.opening),
    received: parseQuantityMap(report.received),
    totals: parseQuantityMap(report.totals),
    rows: parseRows(report.rows)
  };
};

const normalizeText = (value: string): string => value.trim().toLowerCase();

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('fr-FR');
};

const formatQuantity = (value: number | null): string => {
  if (value === null) return '-';
  const isInt = Number.isInteger(value);
  const display = isInt ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
  return display;
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const readDeletedIds = (): string[] => {
  try {
    const raw = localStorage.getItem(HISTORY_DELETED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((id) => String(id));
  } catch {
    return [];
  }
};

const CanteenHistory: React.FC<CanteenHistoryProps> = ({ schoolName, managerName }) => {
  const [reports, setReports] = useState<StockReportPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');

  const loadHistory = useCallback(() => {
    setLoading(true);
    try {
      const raw = localStorage.getItem(SENT_REPORTS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const deletedIds = new Set(readDeletedIds());
      const normalizedSchool = normalizeText(schoolName || '');
      const normalizedManager = normalizeText(managerName || '');

      const nextReports = (Array.isArray(parsed) ? parsed : [])
        .map((entry, index) => parseReport(entry, index))
        .filter((entry): entry is StockReportPayload => entry !== null)
        .filter((entry) => !deletedIds.has(entry.reportId))
        .filter((entry) => !normalizedSchool || normalizeText(entry.schoolName) === normalizedSchool)
        .filter((entry) => !normalizedManager || normalizeText(entry.managerName) === normalizedManager)
        .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

      setReports(nextReports);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [managerName, schoolName]);

  useEffect(() => {
    loadHistory();

    const onStorage = () => loadHistory();
    const onReportsUpdated = () => loadHistory();
    window.addEventListener('storage', onStorage);
    window.addEventListener('stock-reports:updated', onReportsUpdated as EventListener);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('stock-reports:updated', onReportsUpdated as EventListener);
    };
  }, [loadHistory]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.reportId === selectedId) || null,
    [reports, selectedId]
  );

  const handleExport = (report: StockReportPayload) => {
    const reportDate = new Date(report.generatedAt);
    const datePart = Number.isNaN(reportDate.getTime()) ? 'date-inconnue' : reportDate.toISOString().slice(0, 10);
    const fileName = `historique-rapport-${slugify(report.period) || 'rapport'}-${datePart}.json`;

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleDelete = (reportId: string) => {
    const confirmed = window.confirm('Supprimer ce rapport de votre historique ?');
    if (!confirmed) return;

    const currentIds = readDeletedIds();
    const nextIds = Array.from(new Set([...currentIds, reportId]));
    localStorage.setItem(HISTORY_DELETED_KEY, JSON.stringify(nextIds));
    setReports((prev) => prev.filter((report) => report.reportId !== reportId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="surface-card p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="section-title">Historique des rapports envoyes</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {schoolName || 'Ecole non renseignee'} | Gestionnaire: {managerName || 'Non renseigne'}
          </p>
        </div>
        <div className="surface-soft px-4 py-3 rounded-xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total rapports</p>
          <p className="text-lg font-black text-slate-800">{reports.length}</p>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Periode</th>
                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Date d'envoi</th>
                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Lignes</th>
                <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((report) => (
                <tr key={report.reportId} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-800">{report.period}</p>
                    <p className="text-xs text-slate-500">{report.reportId}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{formatDateTime(report.generatedAt)}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{report.rows.length}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedId(report.reportId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
                      >
                        <Eye size={14} />
                        Visualiser
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExport(report)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                      >
                        <Download size={14} />
                        Exporter
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(report.reportId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 size={14} />
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {reports.length === 0 && (
          <div className="p-10 text-center">
            <FileText className="mx-auto text-slate-300 mb-3" size={30} />
            <p className="text-sm font-semibold text-slate-600">Aucun rapport envoye dans l'historique.</p>
          </div>
        )}
      </div>

      {selectedReport && (
        <div
          className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-sm p-4 flex items-center justify-center"
          onClick={(event) => {
            if (event.currentTarget === event.target) setSelectedId('');
          }}
        >
          <div className="bg-white w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl border border-slate-200 shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">{selectedReport.period}</h3>
                <p className="text-sm text-slate-500">
                  Envoye le {formatDateTime(selectedReport.generatedAt)} | {selectedReport.reportId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId('')}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(92vh-82px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {quantityKeys.map((key) => (
                  <div key={key} className="surface-soft p-4 rounded-xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{quantityLabels[key]}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      Debut: <span className="font-bold text-slate-700">{formatQuantity(selectedReport.opening[key])} {quantityUnits[key]}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Recu: <span className="font-bold text-slate-700">{formatQuantity(selectedReport.received[key])} {quantityUnits[key]}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Total: <span className="font-bold text-slate-700">{formatQuantity(selectedReport.totals[key])} {quantityUnits[key]}</span>
                    </p>
                  </div>
                ))}
              </div>

              <div className="table-shell">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Jour</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Effectif</th>
                        {quantityKeys.map((key) => (
                          <th key={key} className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {quantityLabels[key]} (S/R)
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedReport.rows.map((row) => (
                        <tr key={`${selectedReport.reportId}-${row.rowNumber}`}>
                          <td className="px-4 py-3 font-bold text-slate-700">{row.rowNumber}</td>
                          <td className="px-4 py-3 text-slate-600">{row.preparationDateLabel || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{row.totalPresents ?? '-'}</td>
                          {quantityKeys.map((key) => (
                            <td key={`${row.rowNumber}-${key}`} className="px-4 py-3 text-slate-600">
                              {formatQuantity(row.outgoing[key])} / {formatQuantity(row.remaining[key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CanteenHistory;
