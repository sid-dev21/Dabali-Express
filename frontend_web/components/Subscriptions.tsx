import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { subscriptionsApi } from '../services/api';

interface LocalSubscription {
  id: string;
  student_id: string;
  student_name: string;
  student_class: string;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'PENDING_PAYMENT' | 'EXPIRED' | 'CANCELLED';
  meal_plan: string;
  price: number;
}

interface SubscriptionsProps {
  schoolId?: string;
  initialSearch?: string;
}

const toSubscriptionStatus = (value: any): LocalSubscription['status'] => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'ACTIVE' || normalized === 'COMPLETED') return 'ACTIVE';
  if (normalized === 'EXPIRED' || normalized === 'FAILED') return 'EXPIRED';
  if (normalized === 'CANCELLED' || normalized === 'REJECTED') return 'CANCELLED';
  return 'PENDING_PAYMENT';
};

const toMealPlan = (value: any): string => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'MONTHLY') return 'Mensuel';
  if (normalized === 'QUARTERLY') return 'Trimestriel';
  if (normalized === 'YEARLY' || normalized === 'ANNUAL') return 'Annuel';
  if (normalized === 'WEEKLY') return 'Hebdomadaire';
  if (normalized === 'DAILY') return 'Journalier';
  return normalized || 'Inconnu';
};

const toIsoDate = (value: any): string => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const toEntityId = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return String(value._id || value.id || '');
  return String(value);
};

const mapSubscriptionToLocal = (raw: any): LocalSubscription => {
  const child = raw.child || raw.child_id || null;
  const firstName = child?.first_name || child?.firstName || '';
  const lastName = child?.last_name || child?.lastName || '';
  const className = child?.class_name || child?.className || child?.grade || '';

  const studentName = (
    raw.student_name
    || raw.studentName
    || raw.childName
    || `${firstName} ${lastName}`.trim()
    || 'Élève inconnu'
  );

  return {
    id: raw.id || raw._id || `${Date.now()}-${Math.random()}`,
    student_id: toEntityId(raw.childId || raw.child_id || child?.id || child?._id || child),
    student_name: studentName,
    student_class: raw.student_class || raw.class_name || className || '-',
    start_date: toIsoDate(raw.start_date || raw.startDate),
    end_date: toIsoDate(raw.end_date || raw.endDate),
    status: toSubscriptionStatus(raw.status),
    meal_plan: toMealPlan(raw.plan_type || raw.type),
    price: Number(raw.amount) || 0,
  };
};

const Subscriptions: React.FC<SubscriptionsProps> = ({ schoolId, initialSearch = '' }) => {
  const [subscriptions, setSubscriptions] = useState<LocalSubscription[]>([]);

  const loadData = async () => {
    try {
      const subscriptionsData = await subscriptionsApi.getSubscriptions(schoolId || '');
      setSubscriptions((subscriptionsData || []).map(mapSubscriptionToLocal));
    } catch (error) {
      console.error('Erreur lors du chargement des abonnements:', error);
      setSubscriptions([]);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const activeSubscriptions = subscriptions.filter((s) => s.status === 'ACTIVE');
  const normalizedSearch = initialSearch.trim().toLowerCase();
  const filteredActiveSubscriptions = activeSubscriptions.filter((subscription) => {
    if (!normalizedSearch) return true;
    return subscription.student_name.toLowerCase().includes(normalizedSearch)
      || subscription.student_class.toLowerCase().includes(normalizedSearch);
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="surface-card p-6">
        <h2 className="section-title">Gestion des Abonnements</h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Suivez et renouvelez les droits d'accès à la cantine.</p>
      </div>

      <div className="surface-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="section-title flex items-center gap-2">
              <Users size={20} />
              Liste des Abonnés Actifs
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Élèves avec un abonnement actif et paiement validé.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black text-emerald-600 uppercase">{activeSubscriptions.length} Actifs</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="table-head">
              <tr>
                <th className="px-6 py-5">Élève</th>
                <th className="px-6 py-5">Classe</th>
                <th className="px-6 py-5">Abonnement</th>
                <th className="px-6 py-5">Date d'expiration</th>
                <th className="px-6 py-5 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredActiveSubscriptions.length > 0 ? (
                filteredActiveSubscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                          {subscription.student_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{subscription.student_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-600">{subscription.student_class}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">{subscription.meal_plan}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{new Date(subscription.end_date).toLocaleDateString('fr-FR')}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter bg-emerald-50 text-emerald-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Actif</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-16 text-center opacity-20">
                    <Users size={48} className="mx-auto mb-4" />
                    <p className="font-black uppercase tracking-widest">Aucun abonné actif</p>
                    <p className="text-xs text-slate-400 mt-2">Les élèves apparaîtront ici après validation du paiement.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Subscriptions;
