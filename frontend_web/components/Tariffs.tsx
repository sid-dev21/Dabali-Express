import React, { useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Wallet, X } from 'lucide-react';
import { UserRole } from '../types';
import { SchoolTariffsPayload, tariffsApi } from '../services/api';

interface TariffsProps {
  schoolId?: string;
  schoolName?: string;
  adminName?: string;
  userRole?: UserRole;
}

type RateKey = 'monthly' | 'quarterly' | 'yearly';
type TariffRates = Record<RateKey, number>;

type HistoryEntry = {
  id: string;
  date: string;
  message: string;
  by: string;
};

const RATE_LABELS: Record<RateKey, string> = {
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  yearly: 'Annuel',
};

const DEFAULT_RATES: TariffRates = {
  monthly: 15000,
  quarterly: 40000,
  yearly: 150000,
};

const formatFcfa = (value: number): string => `${Math.round(value).toLocaleString('fr-FR')} FCFA`;

const formatDateFr = (isoDate: string): string => {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('fr-FR');
};

const normalizeRates = (payload: SchoolTariffsPayload | null): TariffRates => ({
  monthly: Number(payload?.rates?.monthly) || DEFAULT_RATES.monthly,
  quarterly: Number(payload?.rates?.quarterly) || DEFAULT_RATES.quarterly,
  yearly: Number(payload?.rates?.yearly) || DEFAULT_RATES.yearly,
});

const normalizeHistory = (payload: SchoolTariffsPayload | null): HistoryEntry[] => {
  if (!Array.isArray(payload?.history)) return [];
  return payload.history.map((entry) => ({
    id: String(entry.id || `${entry.date}-${entry.planType}`),
    date: String(entry.date || ''),
    message: String(entry.message || ''),
    by: String(entry.by || 'School Admin'),
  }));
};

const Tariffs: React.FC<TariffsProps> = ({ schoolId, schoolName, adminName, userRole }) => {
  const resolvedAdminName = adminName || 'School Admin';
  const resolvedSchoolName = schoolName || 'Mon ecole';
  const canEdit = Boolean(schoolId) && userRole === UserRole.SCHOOL_ADMIN;

  const [rates, setRates] = useState<TariffRates>(DEFAULT_RATES);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [editingKey, setEditingKey] = useState<RateKey | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const tariffKeys = useMemo(() => (['monthly', 'quarterly', 'yearly'] as RateKey[]), []);

  const applyPayload = (payload: SchoolTariffsPayload | null) => {
    setRates(normalizeRates(payload));
    setHistory(normalizeHistory(payload));
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!schoolId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const payload = await tariffsApi.getSchoolTariffs(schoolId);
        if (cancelled) return;
        applyPayload(payload);
      } catch (loadError: any) {
        if (cancelled) return;
        setError(loadError?.message || 'Impossible de charger les tarifs.');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  const startEdit = (key: RateKey) => {
    setFeedback('');
    setError('');
    setEditingKey(key);
    setEditValue(String(rates[key]));
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const saveEdit = async (key: RateKey) => {
    if (!schoolId || !canEdit) return;

    const next = Number(editValue);
    if (!Number.isFinite(next) || next <= 0) {
      setError('Le montant doit etre un nombre positif.');
      return;
    }

    const rounded = Math.round(next);
    if (rates[key] === rounded) {
      cancelEdit();
      return;
    }

    try {
      setError('');
      setFeedback('');
      const payload: Partial<Record<RateKey, number>> = { [key]: rounded };
      const updated = await tariffsApi.updateSchoolTariffs(schoolId, payload);
      applyPayload(updated);
      setFeedback(`Tarif ${RATE_LABELS[key].toLowerCase()} mis a jour avec succes.`);
      cancelEdit();
    } catch (saveError: any) {
      setError(saveError?.message || 'Echec de mise a jour du tarif.');
    }
  };

  if (!schoolId) {
    return (
      <div className="surface-card p-6">
        <h2 className="section-title">Tarifs</h2>
        <p className="mt-2 text-sm text-slate-500">
          Aucun etablissement selectionne. Les tarifs sont definis par le School Admin de chaque ecole.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="surface-card p-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <Wallet size={22} />
            GESTION DES TARIFS - {resolvedSchoolName}
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Tarifs utilises pour les abonnements parent (mensuel, trimestriel, annuel).
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            School Admin connecte : {resolvedAdminName}
          </p>
          {!canEdit && (
            <p className="mt-2 text-xs font-semibold text-amber-700">
              Consultation uniquement. Les tarifs sont modifiables par le School Admin.
            </p>
          )}
        </div>
      </div>

      <div className="surface-card p-6">
        <h3 className="section-title text-base">TARIFS EN VIGUEUR</h3>
        <p className="mt-1 text-xs text-slate-500">
          Les parents voient ces montants au moment de l abonnement.
        </p>

        {feedback && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {feedback}
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="mt-4 rounded-2xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">Chargement des tarifs...</div>
          ) : (
            tariffKeys.map((key) => (
              <div key={key} className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0">
                <p className="text-sm font-bold text-slate-700">{RATE_LABELS[key]}</p>
                <div className="flex items-center gap-3">
                  {editingKey === key ? (
                    <>
                      <input
                        type="number"
                        min={0}
                        value={editValue}
                        onChange={(event) => setEditValue(event.target.value)}
                        className="h-10 w-36 rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => saveEdit(key)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white"
                      >
                        <Check size={14} />
                        Valider
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700"
                      >
                        <X size={14} />
                        Annuler
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-black text-slate-900 min-w-[140px] text-right">{formatFcfa(rates[key])}</p>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => startEdit(key)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil size={14} />
                          Modifier
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="surface-card p-6">
        <h3 className="section-title text-base">HISTORIQUE DES MODIFICATIONS</h3>
        <div className="mt-4 space-y-2">
          {isLoading ? (
            <p className="text-sm text-slate-500">Chargement...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune modification enregistree.</p>
          ) : (
            history.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                <span className="font-black text-slate-700">{formatDateFr(entry.date)}</span>
                <span className="ml-3 text-slate-700">{entry.message}</span>
                <span className="ml-2 text-slate-500">Par: {entry.by}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Tariffs;
