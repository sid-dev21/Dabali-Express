import React, { useEffect, useState } from 'react';
import { Calendar, RefreshCcw, X, AlertCircle, ChevronRight, Users } from 'lucide-react';
import { subscriptionsApi, studentsApi } from '../services/api';
import { Student } from '../types';

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

const toStudentSubscriptionStatus = (status: LocalSubscription['status']): Student['subscriptionStatus'] => {
  if (status === 'ACTIVE') return 'active';
  if (status === 'PENDING_PAYMENT') return 'warning';
  if (status === 'EXPIRED' || status === 'CANCELLED') return 'expired';
  return 'none';
};

const Subscriptions: React.FC<SubscriptionsProps> = ({ schoolId, initialSearch = '' }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [subscriptions, setSubscriptions] = useState<LocalSubscription[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending' | 'expired'>('all');

  const loadData = async () => {
    try {
      const [studentsData, subscriptionsData] = await Promise.all([
        studentsApi.getStudents(schoolId || ''),
        subscriptionsApi.getSubscriptions(schoolId || ''),
      ]);

      setStudents(studentsData);
      setSubscriptions((subscriptionsData || []).map(mapSubscriptionToLocal));
    } catch (error) {
      console.error('Erreur lors du chargement des abonnements:', error);
      setStudents([]);
      setSubscriptions([]);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const statusPriority: Record<Student['subscriptionStatus'], number> = {
    none: 0,
    expired: 1,
    warning: 2,
    active: 3,
  };

  const subscriptionStatusByStudentId = subscriptions.reduce<Record<string, Student['subscriptionStatus']>>((acc, sub) => {
    const studentId = String(sub.student_id || '').trim();
    if (!studentId) return acc;

    const nextStatus = toStudentSubscriptionStatus(sub.status);
    const currentStatus = acc[studentId];
    if (!currentStatus || statusPriority[nextStatus] > statusPriority[currentStatus]) {
      acc[studentId] = nextStatus;
    }
    return acc;
  }, {});

  const getResolvedStudentStatus = (student: Student): Student['subscriptionStatus'] =>
    subscriptionStatusByStudentId[student.id] || student.subscriptionStatus;

  const filteredStudents = students.filter((s) => {
    const matchesSearch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(initialSearch.toLowerCase())
      || s.class.toLowerCase().includes(initialSearch.toLowerCase());

    const resolvedStatus = getResolvedStudentStatus(s);

    const matchesStatus =
      filterStatus === 'all'
      || (filterStatus === 'active' && resolvedStatus === 'active')
      || (filterStatus === 'pending' && resolvedStatus === 'warning')
      || (filterStatus === 'expired' && resolvedStatus === 'expired');

    return matchesSearch && matchesStatus;
  });

  const handleSaveSubscription = async () => {
    if (!selectedStudent) return;

    try {
      const updatedStudent = {
        ...selectedStudent,
        subscriptionStatus: 'active' as const,
      };
      console.log('Simulation: Mise à jour abonnement', updatedStudent);
      await loadData();
      setIsModalOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'abonnement:', error);
    }
  };

  const handleRenew = (_planType: 'monthly' | 'quarterly' | 'annual') => {
    if (selectedStudent) {
      handleSaveSubscription();
    }
  };

  const activeSubscriptions = subscriptions.filter((s) => s.status === 'ACTIVE');

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
              {activeSubscriptions.length > 0 ? (
                activeSubscriptions.map((subscription) => (
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
                    <p className="text-xs text-slate-400 mt-2">Les élèves apparaîtront ici après validation du paiement</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-shell">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${filterStatus === 'all' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${filterStatus === 'active' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
            >
              Actifs
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${filterStatus === 'pending' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400'}`}
            >
              En attente
            </button>
            <button
              onClick={() => setFilterStatus('expired')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${filterStatus === 'expired' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}
            >
              Expirés
            </button>
          </div>
          {initialSearch && <span className="text-[10px] font-bold text-slate-400 uppercase">Filtre actif : "{initialSearch}"</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="table-head">
              <tr>
                <th className="px-6 py-5">Élève</th>
                <th className="px-6 py-5">Classe</th>
                <th className="px-6 py-5">Statut</th>
                <th className="px-6 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${
                            getResolvedStudentStatus(student) === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : getResolvedStudentStatus(student) === 'warning'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {student.firstName[0]}
                          {student.lastName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{student.firstName} {student.lastName}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Badge: {student.qrCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-600">{student.class}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                          getResolvedStudentStatus(student) === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : getResolvedStudentStatus(student) === 'warning'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-red-50 text-red-700 border-red-100'
                        }`}
                      >
                        {getResolvedStudentStatus(student) === 'active'
                          ? 'Opérationnel'
                          : getResolvedStudentStatus(student) === 'warning'
                            ? 'En attente paiement'
                            : 'Expiré'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedStudent({ ...student, subscriptionStatus: getResolvedStudentStatus(student) });
                          setIsModalOpen(true);
                        }}
                        className={`flex items-center space-x-2 ml-auto px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          getResolvedStudentStatus(student) === 'active'
                            ? 'text-slate-400 bg-slate-50 hover:bg-slate-100'
                            : getResolvedStudentStatus(student) === 'warning'
                              ? 'text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/10'
                              : 'text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/10'
                        }`}
                      >
                        <RefreshCcw size={14} />
                        <span>{getResolvedStudentStatus(student) === 'active' ? 'Prolonger' : 'Réactiver'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-24 text-center">
                    <div className="flex flex-col items-center space-y-4 opacity-20">
                      <Calendar size={64} />
                      <p className="font-black text-xl uppercase tracking-widest">Aucun abonnement trouvé</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedStudent && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}
        >
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`p-8 text-white flex justify-between items-center ${selectedStudent.subscriptionStatus === 'expired' ? 'bg-red-600' : 'bg-emerald-600'}`}>
              <div>
                <h3 className="font-black text-2xl">Renouvellement</h3>
                <p className="text-[10px] text-white/70 font-black uppercase tracking-widest mt-1">{selectedStudent.firstName} {selectedStudent.lastName}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Choisissez le forfait de cantine pour l'élève. Le badge sera instantanément réactivé après validation.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleRenew('monthly')}
                  className="w-full p-5 border-2 border-slate-100 rounded-3xl flex items-center justify-between group hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-left"
                >
                  <div>
                    <p className="font-black text-slate-800 uppercase text-xs tracking-widest">Forfait Mensuel</p>
                    <p className="text-sm font-bold text-emerald-600 mt-1">5 000 FCFA</p>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                </button>

                <button
                  onClick={() => handleRenew('quarterly')}
                  className="w-full p-5 border-2 border-slate-100 rounded-3xl flex items-center justify-between group hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-left"
                >
                  <div>
                    <p className="font-black text-slate-800 uppercase text-xs tracking-widest">Forfait Trimestriel</p>
                    <p className="text-sm font-bold text-emerald-600 mt-1">15 000 FCFA</p>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                </button>

                <button
                  onClick={() => handleRenew('annual')}
                  className="w-full p-5 border-2 border-slate-100 rounded-3xl flex items-center justify-between group hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-left"
                >
                  <div>
                    <p className="font-black text-slate-800 uppercase text-xs tracking-widest">Forfait Annuel</p>
                    <p className="text-sm font-bold text-emerald-600 mt-1">50 000 FCFA</p>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                </button>
              </div>

              <div className="pt-4 flex items-center space-x-2 text-slate-400">
                <AlertCircle size={16} />
                <p className="text-[10px] font-bold italic uppercase">Le paiement doit être encaissé avant validation</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
