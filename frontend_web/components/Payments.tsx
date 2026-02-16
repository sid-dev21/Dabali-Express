import React, { useState, useEffect, useMemo } from 'react';
import { CreditCard, Search, CheckCircle } from 'lucide-react';
import { paymentsApi, studentsApi } from '../services/api';
import { Student } from '../types';

interface LocalPayment {
  id: string;
  studentId: string;
  studentName: string;
  schoolId: string;
  amount: number;
  date: string;
  method: string;
  status: 'COMPLETED' | 'WAITING_ADMIN_VALIDATION' | 'FAILED';
}

interface PaymentsProps {
  schoolId: string;
  initialSearch?: string;
}

type CashSubscriptionType = 'monthly' | 'quarterly' | 'annual';

const SUBSCRIPTION_PRICES: Record<CashSubscriptionType, number> = {
  monthly: 5000,
  quarterly: 15000,
  annual: 50000,
};

const Payments: React.FC<PaymentsProps> = ({ schoolId, initialSearch = '' }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  useEffect(() => {
    setSearchTerm(initialSearch);
  }, [initialSearch]);

  const [payments, setPayments] = useState<LocalPayment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [cashForm, setCashForm] = useState({
    studentId: '',
    studentName: '',
    amount: String(SUBSCRIPTION_PRICES.monthly),
    subscriptionType: 'monthly' as CashSubscriptionType,
    startDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [paymentsData, studentsData] = await Promise.all([
          Promise.resolve([]),
          Promise.resolve([])
        ]);
        setPayments(paymentsData);
        setStudents(studentsData);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setPayments([]);
        setStudents([]);
      }
    };
    
    loadData();
  }, [schoolId]);

  const filteredPayments = useMemo(() => 
    payments.filter(p => p.studentName.toLowerCase().includes(searchTerm.toLowerCase())),
    [payments, searchTerm]
  );

  const handleCashValidation = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amountValue = Number(cashForm.amount);
    const studentName = cashForm.studentName.trim();

    if (!studentName || Number.isNaN(amountValue) || amountValue <= 0) {
      alert('Veuillez renseigner le nom de l\'élève et un montant valide.');
      return;
    }

    const matchedStudent = students.find(s => s.id === cashForm.studentId) ||
      students.find(s => `${s.firstName} ${s.lastName}`.toLowerCase() === studentName.toLowerCase());

    const newPayment: LocalPayment = {
      id: `cash-${Date.now()}`,
      studentId: matchedStudent?.id || 'manual',
      studentName: matchedStudent ? `${matchedStudent.firstName} ${matchedStudent.lastName}` : studentName,
      schoolId: matchedStudent?.schoolId || schoolId || '',
      amount: amountValue,
      date: new Date().toISOString(),
      method: 'CASH',
      status: 'COMPLETED',
    };

    setPayments(prev => [newPayment, ...prev]);
    setCashForm(prev => ({
      ...prev,
      studentId: '',
      studentName: '',
      amount: String(SUBSCRIPTION_PRICES[prev.subscriptionType]),
      reference: '',
      notes: '',
    }));

    alert('Abonnement validé en espèces.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="surface-card p-6">
        <h3 className="section-title">Journal des Transactions</h3>
        <p className="text-xs text-slate-500 font-medium mt-1">Historique exact des encaissements.</p>
      </div>

      <div className="surface-card p-6 space-y-6">
        <div>
          <h3 className="section-title">Validation Abonnement Cash</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Pour School Admin et Super Admin : validez un abonnement payé en espèces.
          </p>
        </div>
        <form onSubmit={handleCashValidation} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1 md:col-span-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Élève</label>
            {students.length > 0 ? (
              <select
                value={cashForm.studentId}
                onChange={(e) => {
                  const studentId = e.target.value;
                  const student = students.find(s => s.id === studentId);
                  setCashForm(prev => ({
                    ...prev,
                    studentId,
                    studentName: student ? `${student.firstName} ${student.lastName}` : prev.studentName
                  }));
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                <option value="">Sélectionner un élève</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.firstName} {student.lastName}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={cashForm.studentName}
                onChange={(e) => setCashForm(prev => ({ ...prev, studentName: e.target.value }))}
                placeholder="Nom de l'élève"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant (FCFA)</label>
            <input
              type="number"
              value={cashForm.amount}
              onChange={(e) => setCashForm(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="Ex: 5000"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type d'abonnement</label>
            <select
              value={cashForm.subscriptionType}
              onChange={(e) => {
                const subscriptionType = e.target.value as CashSubscriptionType;
                setCashForm(prev => ({
                  ...prev,
                  subscriptionType,
                  amount: String(SUBSCRIPTION_PRICES[subscriptionType]),
                }));
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            >
              <option value="monthly">Mensuel - 5 000 FCFA</option>
              <option value="quarterly">Trimestriel - 15 000 FCFA</option>
              <option value="annual">Annuel - 50 000 FCFA</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date de début</label>
            <input
              type="date"
              value={cashForm.startDate}
              onChange={(e) => setCashForm(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Référence (optionnel)</label>
            <input
              type="text"
              value={cashForm.reference}
              onChange={(e) => setCashForm(prev => ({ ...prev, reference: e.target.value }))}
              placeholder="Reçu / Ticket"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
          </div>
          <div className="space-y-1 md:col-span-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes</label>
            <input
              type="text"
              value={cashForm.notes}
              onChange={(e) => setCashForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Informations complémentaires"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            />
          </div>
          <div className="md:col-span-3 flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-all font-black text-xs uppercase tracking-widest"
            >
              <CheckCircle size={16} />
              Valider le cash
            </button>
          </div>
        </form>
      </div>

      <div className="table-shell">
        <div className="p-6 border-b border-slate-100 flex justify-end">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Chercher un élève..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-700 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="table-head">
              <tr>
                <th className="px-8 py-5">Élève</th>
                <th className="px-8 py-5">Montant</th>
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Méthode</th>
                <th className="px-8 py-5 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredPayments.length > 0 ? filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-4 font-bold text-slate-800">{p.studentName}</td>
                  <td className="px-8 py-4 font-black text-emerald-600">{p.amount.toLocaleString()} FCFA</td>
                  <td className="px-8 py-4 text-slate-500 font-medium">{new Date(p.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-8 py-4">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                      p.method === 'ORANGE_MONEY' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                      p.method === 'MOOV_MONEY' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {p.method.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                      p.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 
                      p.status === 'WAITING_ADMIN_VALIDATION' ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        p.status === 'COMPLETED' ? 'bg-emerald-500' : 
                        p.status === 'WAITING_ADMIN_VALIDATION' ? 'bg-amber-500 animate-pulse' :
                        'bg-red-500'
                      }`}></div>
                      <span>
                        {p.status === 'COMPLETED' ? 'Validé' : 
                         p.status === 'WAITING_ADMIN_VALIDATION' ? 'En attente validation' :
                         'Échoué'}
                      </span>
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="p-20 text-center opacity-20">
                    <CreditCard size={48} className="mx-auto mb-4" />
                    <p className="font-black uppercase tracking-widest">Aucune transaction trouvée</p>
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

export default Payments;
