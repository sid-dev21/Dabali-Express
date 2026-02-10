
import React, { useState, useEffect, useMemo } from 'react';
import { CreditCard, Search, ArrowUpRight, Clock, Target } from 'lucide-react';
import { mockApi } from '../services/mockApi';
import { Payment } from '../types';

interface PaymentsProps {
  schoolId?: string;
  initialSearch?: string;
}

const Payments: React.FC<PaymentsProps> = ({ schoolId, initialSearch = '' }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  useEffect(() => {
    setSearchTerm(initialSearch);
  }, [initialSearch]);

  const payments = useMemo(() => mockApi.getPayments(schoolId), [schoolId]);
  const students = useMemo(() => mockApi.getStudents(schoolId), [schoolId]);

  const filteredPayments = useMemo(() => 
    payments.filter(p => p.studentName.toLowerCase().includes(searchTerm.toLowerCase())),
    [payments, searchTerm]
  );

  const stats = useMemo(() => {
    const total = payments.reduce((acc, curr) => acc + curr.amount, 0);
    const pending = payments.filter(p => p.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);
    const count = payments.length;
    // Revenu moyen réel par élève inscrit
    const avgPerStudent = students.length > 0 ? Math.floor(total / students.length) : 0;
    return { total, pending, count, avgPerStudent };
  }, [payments, students]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 transition-all hover:shadow-md">
          <div className="flex justify-between items-center mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recettes de l'école</p>
          <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.total.toLocaleString()} FCFA</h3>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 transition-all hover:shadow-md">
          <div className="flex justify-between items-center mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Target size={20} />
            </div>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-wider">{stats.count} transactions</span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Moyenne / Élève inscrit</p>
          <h3 className="text-3xl font-black text-slate-800 mt-1">
            {stats.avgPerStudent.toLocaleString()} FCFA
          </h3>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 transition-all hover:shadow-md">
          <div className="flex justify-between items-center mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Clock size={20} />
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Montants en attente</p>
          <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.pending.toLocaleString()} FCFA</h3>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-800">Journal des Transactions</h3>
            <p className="text-xs text-slate-400 font-medium italic">Historique exact des encaissements.</p>
          </div>
          <div className="flex w-full md:w-auto">
            <div className="relative flex-grow md:w-72">
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]">
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
                      p.method === 'MOOV_MONEY' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {p.method.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${p.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${p.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                      <span>{p.status === 'completed' ? 'Validé' : 'En attente'}</span>
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
