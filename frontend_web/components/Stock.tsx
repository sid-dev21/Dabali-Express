import React, { useEffect, useState } from 'react';
import { FileText, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';

interface StockProps {
  schoolId?: string;
  schoolName?: string;
  managerName?: string;
}

type QuantityKey = 'haricot' | 'riz' | 'huile' | 'spaghetti';
type QuantityMap = Record<QuantityKey, string>;
type NumericQuantityMap = Record<QuantityKey, number | null>;
type DailyMetaMap = Record<number, { preparationDate: string; rationnairesCount: string }>;
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
  preparationDate: string | null;
  preparationDateLabel: string;
  rationnairesCount: number | null;
  totalPresents: number | null;
  opening: NumericQuantityMap;
  received: NumericQuantityMap;
  totals: NumericQuantityMap;
  rows: StockReportRow[];
};

const STORAGE_KEY = 'dabali_express_stock_page_data_v1';
const SENT_REPORTS_STORAGE_KEY = 'dabali_express_stock_reports_sent_v1';
const DEFAULT_STOCK_ROWS = Array.from({ length: 15 }, (_, index) => index + 1);
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
const createEmptyQuantityMap = (): QuantityMap => ({
  haricot: '',
  riz: '',
  huile: '',
  spaghetti: ''
});

const toLocalDateFromKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map((part) => Number(part));
  return new Date(year, month - 1, day);
};

const formatPreparationDate = (dateKey: string | null): string => {
  if (!dateKey) return '';
  const parsed = toLocalDateFromKey(dateKey);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const Stock: React.FC<StockProps> = ({ schoolName, managerName }) => {
  const [stockRows, setStockRows] = useState<number[]>(() => [...DEFAULT_STOCK_ROWS]);
  const [openingQuantities, setOpeningQuantities] = useState<QuantityMap>(createEmptyQuantityMap);
  const [receivedQuantities, setReceivedQuantities] = useState<QuantityMap>(createEmptyQuantityMap);
  const [outgoingQuantities, setOutgoingQuantities] = useState<Record<number, QuantityMap>>({});
  const [dailyMeta, setDailyMeta] = useState<DailyMetaMap>({});
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [resetKey, setResetKey] = useState<number>(0);

  const addRow = () => {
    const newRowCount = stockRows.length ? Math.max(...stockRows) + 1 : 1;
    setStockRows([...stockRows, newRowCount]);
  };

  const removeRow = (rowNumber: number) => {
    if (stockRows.length > 1) {
      setStockRows(stockRows.filter(row => row !== rowNumber));
      setOutgoingQuantities(prev => {
        const next = { ...prev };
        delete next[rowNumber];
        return next;
      });
      setDailyMeta(prev => {
        const next = { ...prev };
        delete next[rowNumber];
        return next;
      });
    }
  };

  const updateQuantity = (
    sectionSetter: React.Dispatch<React.SetStateAction<QuantityMap>>,
    key: QuantityKey,
    value: string
  ) => {
    sectionSetter(prev => ({ ...prev, [key]: value }));
  };

  const getDailyMetaEntry = (rowNumber: number): { preparationDate: string; rationnairesCount: string } =>
    dailyMeta[rowNumber] ?? { preparationDate: '', rationnairesCount: '' };

  const updateDailyMeta = (
    rowNumber: number,
    field: 'preparationDate' | 'rationnairesCount',
    value: string
  ) => {
    setDailyMeta((prev) => ({
      ...prev,
      [rowNumber]: {
        preparationDate: prev[rowNumber]?.preparationDate ?? '',
        rationnairesCount: prev[rowNumber]?.rationnairesCount ?? '',
        [field]: value
      }
    }));
  };

  const parseRationnairesCount = (value: string): number | null => {
    const normalized = value.trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return null;
    const integerValue = Math.trunc(parsed);
    return integerValue >= 0 ? integerValue : null;
  };

  const parseQuantity = (value: string): number | null => {
    const normalized = value.replace(',', '.').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const formatQuantity = (value: number): string => {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(2).replace(/\.?0+$/, '');
  };

  const totalQuantityValue = (key: QuantityKey): number | null => {
    const opening = parseQuantity(openingQuantities[key]);
    const received = parseQuantity(receivedQuantities[key]);

    if (opening === null && received === null) return null;
    return (opening ?? 0) + (received ?? 0);
  };

  const totalQuantity = (key: QuantityKey): string => {
    const value = totalQuantityValue(key);
    return value === null ? '' : formatQuantity(value);
  };

  const getOutgoingQuantity = (rowNumber: number, key: QuantityKey): string =>
    outgoingQuantities[rowNumber]?.[key] ?? '';

  const updateOutgoingQuantity = (rowNumber: number, key: QuantityKey, value: string) => {
    setOutgoingQuantities(prev => ({
      ...prev,
      [rowNumber]: {
        haricot: prev[rowNumber]?.haricot ?? '',
        riz: prev[rowNumber]?.riz ?? '',
        huile: prev[rowNumber]?.huile ?? '',
        spaghetti: prev[rowNumber]?.spaghetti ?? '',
        [key]: value
      }
    }));
  };

  const formatOptionalQuantity = (value: number | null): string =>
    value === null ? '' : formatQuantity(value);

  const stockFlowByIndex: Array<{ available: NumericQuantityMap; remaining: NumericQuantityMap }> = [];
  for (let index = 0; index < stockRows.length; index += 1) {
    const rowNumber = stockRows[index];
    const previousRemaining = index > 0 ? stockFlowByIndex[index - 1].remaining : null;

    const available: NumericQuantityMap = {
      haricot: null,
      riz: null,
      huile: null,
      spaghetti: null
    };
    const remaining: NumericQuantityMap = {
      haricot: null,
      riz: null,
      huile: null,
      spaghetti: null
    };

    quantityKeys.forEach((key) => {
      const availableValue = previousRemaining ? previousRemaining[key] : totalQuantityValue(key);
      const outgoingValue = parseQuantity(outgoingQuantities[rowNumber]?.[key] ?? '');

      available[key] = availableValue;
      remaining[key] = (availableValue === null || outgoingValue === null)
        ? null
        : availableValue - outgoingValue;
    });

    stockFlowByIndex.push({ available, remaining });
  }

  const getOutgoingQuantityValue = (rowNumber: number, key: QuantityKey): number | null =>
    parseQuantity(outgoingQuantities[rowNumber]?.[key] ?? '');

  const hasAnyValue = (values: NumericQuantityMap): boolean =>
    quantityKeys.some((key) => values[key] !== null);

  const buildReportPayload = (): StockReportPayload => {
    const now = new Date();
    const periodLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const reportId = `STOCK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${now.getTime()}`;

    const rows: StockReportRow[] = stockRows.map((rowNumber, index) => {
      const available = stockFlowByIndex[index]?.available ?? {
        haricot: null,
        riz: null,
        huile: null,
        spaghetti: null
      };
      const remaining = stockFlowByIndex[index]?.remaining ?? {
        haricot: null,
        riz: null,
        huile: null,
        spaghetti: null
      };
      const outgoing: NumericQuantityMap = {
        haricot: getOutgoingQuantityValue(rowNumber, 'haricot'),
        riz: getOutgoingQuantityValue(rowNumber, 'riz'),
        huile: getOutgoingQuantityValue(rowNumber, 'huile'),
        spaghetti: getOutgoingQuantityValue(rowNumber, 'spaghetti')
      };
      const daily = getDailyMetaEntry(rowNumber);
      const normalizedDate = daily.preparationDate.trim() || null;
      const totalPresents = parseRationnairesCount(daily.rationnairesCount);

      return {
        rowNumber,
        preparationDate: normalizedDate,
        preparationDateLabel: formatPreparationDate(normalizedDate),
        rationnairesCount: totalPresents,
        totalPresents,
        available,
        outgoing,
        remaining
      };
    }).filter((entry) =>
      entry.preparationDate !== null
      || entry.rationnairesCount !== null
      || hasAnyValue(entry.available)
      || hasAnyValue(entry.outgoing)
      || hasAnyValue(entry.remaining)
    );

    const firstRowWithDate = rows.find((entry) => entry.preparationDate !== null);
    const firstRowWithEffectif = rows.find((entry) => entry.rationnairesCount !== null);

    return {
      reportId,
      generatedAt: now.toISOString(),
      period: periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1),
      schoolName: schoolName || 'Ecole non renseignee',
      managerName: managerName || 'Gestionnaire non renseigne',
      preparationDate: firstRowWithDate?.preparationDate ?? null,
      preparationDateLabel: firstRowWithDate?.preparationDateLabel ?? '',
      rationnairesCount: firstRowWithEffectif?.rationnairesCount ?? null,
      totalPresents: firstRowWithEffectif?.totalPresents ?? null,
      opening: {
        haricot: parseQuantity(openingQuantities.haricot),
        riz: parseQuantity(openingQuantities.riz),
        huile: parseQuantity(openingQuantities.huile),
        spaghetti: parseQuantity(openingQuantities.spaghetti)
      },
      received: {
        haricot: parseQuantity(receivedQuantities.haricot),
        riz: parseQuantity(receivedQuantities.riz),
        huile: parseQuantity(receivedQuantities.huile),
        spaghetti: parseQuantity(receivedQuantities.spaghetti)
      },
      totals: {
        haricot: totalQuantityValue('haricot'),
        riz: totalQuantityValue('riz'),
        huile: totalQuantityValue('huile'),
        spaghetti: totalQuantityValue('spaghetti')
      },
      rows
    };
  };

  const handleSendReportToSchoolAdmin = () => {
    try {
      const reportPayload = buildReportPayload();
      const sentReportsRaw = localStorage.getItem(SENT_REPORTS_STORAGE_KEY);
      const sentReports = sentReportsRaw ? JSON.parse(sentReportsRaw) : [];
      const nextReports = Array.isArray(sentReports) ? sentReports : [];
      nextReports.push(reportPayload);
      localStorage.setItem(SENT_REPORTS_STORAGE_KEY, JSON.stringify(nextReports));
      setSaveMessage(`Rapport pret et envoye au School Admin le ${new Date().toLocaleString('fr-FR')}`);
    } catch {
      setSaveMessage('Erreur: envoi du rapport impossible pour le moment.');
    }
    setIsReportModalOpen(false);
  };

  const handleSaveData = () => {
    const payload = {
      stockRows,
      openingQuantities,
      receivedQuantities,
      outgoingQuantities,
      dailyMeta,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setSaveMessage(`Données sauvegardées le ${new Date().toLocaleString('fr-FR')}`);
  };

  const handleResetForNewMonth = () => {
    setStockRows([...DEFAULT_STOCK_ROWS]);
    setOpeningQuantities(createEmptyQuantityMap());
    setReceivedQuantities(createEmptyQuantityMap());
    setOutgoingQuantities({});
    setDailyMeta({});
    setIsReportModalOpen(false);
    setResetKey((previous) => previous + 1);
    localStorage.removeItem(STORAGE_KEY);
    setSaveMessage('Champs reinitialises pour un nouveau mois.');
  };

  useEffect(() => {
    const savedRaw = localStorage.getItem(STORAGE_KEY);
    if (!savedRaw) return;

    try {
      const saved = JSON.parse(savedRaw);
      if (Array.isArray(saved.stockRows)) {
        const sanitizedRows = saved.stockRows.filter((row: unknown) => Number.isInteger(row)) as number[];
        if (sanitizedRows.length > 0) {
          setStockRows(sanitizedRows);
        }
      }
      if (saved.openingQuantities) {
        setOpeningQuantities({
          haricot: String(saved.openingQuantities.haricot ?? ''),
          riz: String(saved.openingQuantities.riz ?? ''),
          huile: String(saved.openingQuantities.huile ?? ''),
          spaghetti: String(saved.openingQuantities.spaghetti ?? '')
        });
      }
      if (saved.receivedQuantities) {
        setReceivedQuantities({
          haricot: String(saved.receivedQuantities.haricot ?? ''),
          riz: String(saved.receivedQuantities.riz ?? ''),
          huile: String(saved.receivedQuantities.huile ?? ''),
          spaghetti: String(saved.receivedQuantities.spaghetti ?? '')
        });
      }
      if (saved.outgoingQuantities && typeof saved.outgoingQuantities === 'object') {
        const normalized: Record<number, QuantityMap> = {};
        Object.entries(saved.outgoingQuantities).forEach(([rowKey, values]) => {
          const rowNumber = Number(rowKey);
          if (!Number.isFinite(rowNumber) || typeof values !== 'object' || values === null) return;
          const entry = values as Record<string, unknown>;
          normalized[rowNumber] = {
            haricot: String(entry.haricot ?? ''),
            riz: String(entry.riz ?? ''),
            huile: String(entry.huile ?? ''),
            spaghetti: String(entry.spaghetti ?? '')
          };
        });
        setOutgoingQuantities(normalized);
      }
      if (saved.dailyMeta && typeof saved.dailyMeta === 'object') {
        const normalizedDaily: DailyMetaMap = {};
        Object.entries(saved.dailyMeta).forEach(([rowKey, values]) => {
          const rowNumber = Number(rowKey);
          if (!Number.isFinite(rowNumber) || typeof values !== 'object' || values === null) return;
          const entry = values as Record<string, unknown>;
          normalizedDaily[rowNumber] = {
            preparationDate: String(entry.preparationDate ?? ''),
            rationnairesCount: String(entry.rationnairesCount ?? '')
          };
        });
        setDailyMeta(normalizedDaily);
      }
    } catch {
      setSaveMessage('Impossible de charger la sauvegarde locale.');
    }
  }, []);

  const reportPreview = buildReportPayload();
  const hasReportData = hasAnyValue(reportPreview.totals) || reportPreview.rows.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="surface-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="section-title">Stock de la Cantine</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Passation des écritures d'un cahier de gestion.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleResetForNewMonth}
            className="flex items-center justify-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl hover:bg-amber-100 transition-all font-black text-xs uppercase tracking-widest border border-amber-200"
          >
            <RefreshCw size={16} />
            Rafraichir
          </button>
          <button
            type="button"
            onClick={handleSaveData}
            className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-200 transition-all font-black text-xs uppercase tracking-widest border border-slate-200"
          >
            <Save size={16} />
            Sauvegarder
          </button>
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl hover:bg-slate-900 transition-all font-black text-xs uppercase tracking-widest"
          >
            <FileText size={16} />
            Générer rapport
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="surface-soft px-4 py-3 text-xs font-bold text-slate-600">
          {saveMessage}
        </div>
      )}

      <div key={resetKey} className="surface-card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom de l'école</label>
            <input
              type="text"
              readOnly
              value={schoolName || ''}
              placeholder="Nom de l'établissement"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Année scolaire</label>
            <input
              type="text"
              placeholder="2025-2026"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Effectif de l'école (G / F / T)</label>
            <input
              type="text"
              placeholder="G: 0  F: 0  T: 0"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mois</label>
            <input
              type="text"
              placeholder="Ex: Janvier"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date de réception des vivres</label>
            <input
              type="date"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date de démarrage de la cantine</label>
            <input
              type="date"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
          </div>
        </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-end">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A - Quantité au début du mois</div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A1 - Haricot (kg)</label>
                <input type="text" value={openingQuantities.haricot} onChange={(e) => updateQuantity(setOpeningQuantities, 'haricot', e.target.value)} placeholder="Haricot (kg)" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A2 - Riz (kg)</label>
                <input type="text" value={openingQuantities.riz} onChange={(e) => updateQuantity(setOpeningQuantities, 'riz', e.target.value)} placeholder="Riz (kg)" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A3 - Huile (L)</label>
                <input type="text" value={openingQuantities.huile} onChange={(e) => updateQuantity(setOpeningQuantities, 'huile', e.target.value)} placeholder="Huile (L)" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A4 - Spaghetti (paquet)</label>
                <input type="text" value={openingQuantities.spaghetti} onChange={(e) => updateQuantity(setOpeningQuantities, 'spaghetti', e.target.value)} placeholder="Spaghetti (paquet)" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-end">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">B - Quantité reçue pendant le mois</div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">B1 - Haricot (kg)</label>
                <input type="text" value={receivedQuantities.haricot} onChange={(e) => updateQuantity(setReceivedQuantities, 'haricot', e.target.value)} placeholder="Haricot (kg)" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">B2 - Riz (kg)</label>
                <input type="text" value={receivedQuantities.riz} onChange={(e) => updateQuantity(setReceivedQuantities, 'riz', e.target.value)} placeholder="Riz (kg)" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">B3 - Huile (L)</label>
                <input type="text" value={receivedQuantities.huile} onChange={(e) => updateQuantity(setReceivedQuantities, 'huile', e.target.value)} placeholder="Huile (L)" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">B4 - Spaghetti (paquet)</label>
                <input type="text" value={receivedQuantities.spaghetti} onChange={(e) => updateQuantity(setReceivedQuantities, 'spaghetti', e.target.value)} placeholder="Spaghetti (paquet)" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-end">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">C - Quantité totale disponible (A + B)</div>
              <input type="text" value={totalQuantity('haricot')} readOnly placeholder="Haricot (kg)" className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-medium text-slate-600 cursor-not-allowed" />
              <input type="text" value={totalQuantity('riz')} readOnly placeholder="Riz (kg)" className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-medium text-slate-600 cursor-not-allowed" />
              <input type="text" value={totalQuantity('huile')} readOnly placeholder="Huile (L)" className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-medium text-slate-600 cursor-not-allowed" />
              <input type="text" value={totalQuantity('spaghetti')} readOnly placeholder="Spaghetti (paquet)" className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-medium text-slate-600 cursor-not-allowed" />
            </div>
          </div>

        <div className="table-shell">
          <div className="overflow-x-auto">
            <table className="w-full text-left stock-grid">
              <thead className="table-head">
                <tr>
                  <th rowSpan={2} className="px-4 py-4 text-center w-12">N°</th>
                  <th rowSpan={2} className="px-4 py-4 min-w-[180px]">Date du jour de préparation</th>
                  <th rowSpan={2} className="px-4 py-4 min-w-[160px] text-center">
                    Effectif
                    <div className="text-[10px] font-semibold tracking-normal normal-case">Nbre des rationnaires du jour</div>
                  </th>
                  <th colSpan={4} className="px-4 py-4 text-center min-w-[440px]">C - Quantité totale disponible / stock au magasin</th>
                  <th colSpan={4} className="px-4 py-4 text-center min-w-[420px]">Quantité sortie</th>
                  <th colSpan={4} className="px-4 py-4 text-center min-w-[420px]">Quantité restante</th>
                  <th rowSpan={2} className="px-4 py-4 min-w-[160px]">Observations</th>
                  <th rowSpan={2} className="px-4 py-4 text-center w-20">Actions</th>
                </tr>
                <tr>
                  <th className="px-4 py-3 text-center">Haricot (kg)</th>
                  <th className="px-4 py-3 text-center">Riz (kg)</th>
                  <th className="px-4 py-3 text-center">Huile (L)</th>
                  <th className="px-4 py-3 text-center">Spaghetti (paquet)</th>
                  <th className="px-4 py-3 text-center">Haricot (kg)</th>
                  <th className="px-4 py-3 text-center">Riz (kg)</th>
                  <th className="px-4 py-3 text-center">Huile (L)</th>
                  <th className="px-4 py-3 text-center">Spaghetti (paquet)</th>
                  <th className="px-4 py-3 text-center">Haricot (kg)</th>
                  <th className="px-4 py-3 text-center">Riz (kg)</th>
                  <th className="px-4 py-3 text-center">Huile (L)</th>
                  <th className="px-4 py-3 text-center">Spaghetti (paquet)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {stockRows.map((row, index) => (
                  <tr key={row} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-500 font-semibold">{row}</td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="date"
                        value={getDailyMetaEntry(row).preparationDate}
                        onChange={(e) => updateDailyMeta(row, 'preparationDate', e.target.value)}
                        className="w-full min-w-[170px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={getDailyMetaEntry(row).rationnairesCount}
                        onChange={(e) => updateDailyMeta(row, 'rationnairesCount', e.target.value)}
                        placeholder="-"
                        className="w-full min-w-[120px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-center text-slate-700"
                      />
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">{formatOptionalQuantity(stockFlowByIndex[index]?.available.haricot ?? null)}</td>
                    <td className="px-4 py-3 text-center text-slate-500">{formatOptionalQuantity(stockFlowByIndex[index]?.available.riz ?? null)}</td>
                    <td className="px-4 py-3 text-center text-slate-500">{formatOptionalQuantity(stockFlowByIndex[index]?.available.huile ?? null)}</td>
                    <td className="px-4 py-3 text-center text-slate-500">{formatOptionalQuantity(stockFlowByIndex[index]?.available.spaghetti ?? null)}</td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="text"
                        value={getOutgoingQuantity(row, 'haricot')}
                        onChange={(e) => updateOutgoingQuantity(row, 'haricot', e.target.value)}
                        placeholder="-"
                        className="w-full min-w-[90px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-center text-slate-700"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="text"
                        value={getOutgoingQuantity(row, 'riz')}
                        onChange={(e) => updateOutgoingQuantity(row, 'riz', e.target.value)}
                        placeholder="-"
                        className="w-full min-w-[90px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-center text-slate-700"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="text"
                        value={getOutgoingQuantity(row, 'huile')}
                        onChange={(e) => updateOutgoingQuantity(row, 'huile', e.target.value)}
                        placeholder="-"
                        className="w-full min-w-[90px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-center text-slate-700"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="text"
                        value={getOutgoingQuantity(row, 'spaghetti')}
                        onChange={(e) => updateOutgoingQuantity(row, 'spaghetti', e.target.value)}
                        placeholder="-"
                        className="w-full min-w-[90px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-center text-slate-700"
                      />
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">{formatOptionalQuantity(stockFlowByIndex[index]?.remaining.haricot ?? null)}</td>
                    <td className="px-4 py-3 text-center text-slate-500">{formatOptionalQuantity(stockFlowByIndex[index]?.remaining.riz ?? null)}</td>
                    <td className="px-4 py-3 text-center text-slate-500">{formatOptionalQuantity(stockFlowByIndex[index]?.remaining.huile ?? null)}</td>
                    <td className="px-4 py-3 text-center text-slate-500">{formatOptionalQuantity(stockFlowByIndex[index]?.remaining.spaghetti ?? null)}</td>
                    <td className="px-4 py-3 text-slate-500">&nbsp;</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {index === stockRows.length - 1 && (
                          <button
                            onClick={addRow}
                            className="action-icon text-slate-500 hover:text-emerald-600"
                            title="Ajouter une ligne"
                          >
                            <Plus size={16} />
                          </button>
                        )}
                        {stockRows.length > 1 && (
                          <button
                            onClick={() => removeRow(row)}
                            className="action-icon text-slate-500 hover:text-red-600"
                            title="Supprimer cette ligne"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isReportModalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
          onClick={(event) => event.target === event.currentTarget && setIsReportModalOpen(false)}
        >
          <div className="bg-white w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-[2rem] border border-slate-200 shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="section-title">Previsualisation du Rapport Stock</h3>
                <p className="text-sm text-slate-500 font-medium">
                  {reportPreview.schoolName} | Genere le {new Date(reportPreview.generatedAt).toLocaleString('fr-FR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-50"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={handleSendReportToSchoolAdmin}
                  disabled={!hasReportData}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Envoyer au School Admin
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(92vh-88px)]">
              {!hasReportData ? (
                <div className="surface-soft p-4 text-sm font-semibold text-slate-600">
                  Aucune donnee exploitable pour generer le rapport. Saisissez au moins une valeur.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {quantityKeys.map((key) => (
                      <div key={key} className="surface-soft p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total disponible</p>
                        <p className="mt-2 text-lg font-black text-slate-800">
                          {formatOptionalQuantity(reportPreview.totals[key]) || '-'} {quantityUnits[key]}
                        </p>
                        <p className="text-xs font-bold text-slate-500">{quantityLabels[key]}</p>
                      </div>
                    ))}
                  </div>

                  <div className="table-shell">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left stock-grid">
                        <thead className="table-head">
                          <tr>
                            <th className="px-4 py-3 text-center">Jour</th>
                            <th className="px-4 py-3 text-center">Date du menu</th>
                            <th className="px-4 py-3 text-center">Total presents</th>
                            {quantityKeys.map((key) => (
                              <th key={`a-${key}`} className="px-4 py-3 text-center">Stock {quantityLabels[key]}</th>
                            ))}
                            {quantityKeys.map((key) => (
                              <th key={`s-${key}`} className="px-4 py-3 text-center">Sortie {quantityLabels[key]}</th>
                            ))}
                            {quantityKeys.map((key) => (
                              <th key={`r-${key}`} className="px-4 py-3 text-center">Reste {quantityLabels[key]}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {reportPreview.rows.map((row) => (
                            <tr key={row.rowNumber}>
                              <td className="px-4 py-3 text-center font-bold text-slate-700">{row.rowNumber}</td>
                              <td className="px-4 py-3 text-center text-slate-600">{row.preparationDateLabel || '-'}</td>
                              <td className="px-4 py-3 text-center text-slate-600">{row.totalPresents ?? '-'}</td>
                              {quantityKeys.map((key) => (
                                <td key={`ra-${row.rowNumber}-${key}`} className="px-4 py-3 text-center text-slate-600">
                                  {formatOptionalQuantity(row.available[key])}
                                </td>
                              ))}
                              {quantityKeys.map((key) => (
                                <td key={`rs-${row.rowNumber}-${key}`} className="px-4 py-3 text-center text-slate-600">
                                  {formatOptionalQuantity(row.outgoing[key])}
                                </td>
                              ))}
                              {quantityKeys.map((key) => (
                                <td key={`rr-${row.rowNumber}-${key}`} className="px-4 py-3 text-center text-slate-600">
                                  {formatOptionalQuantity(row.remaining[key])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;
