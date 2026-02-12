
import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCcw, Check, X, AlertCircle, Clock, Search, ChevronRight } from 'lucide-react';
import { subscriptionsApi, studentsApi } from '../services/api';
import { Student } from '../types';

interface SubscriptionsProps {
  schoolId?: string;
  initialSearch?: string;
}

const Subscriptions: React.FC<SubscriptionsProps> = ({ schoolId, initialSearch = '' }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'warning' | 'expired'>('all');

  const loadData = async () => {
    try {
      // Remplacer par un vrai appel API quand disponible
      const studentsData = await studentsApi.getStudents(schoolId);
      setStudents(studentsData);
    } catch (error) {
      console.error('Erreur lors du chargement des étudiants:', error);
      setStudents([]);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const filteredStudents = students.filter(s => {
    const matchesSearch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(initialSearch.toLowerCase()) || 
                         s.class.toLowerCase().includes(initialSearch.toLowerCase());
    const matchesStatus = filterStatus === 'all' || s.subscriptionStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const activeCount = students.filter(s => s.subscriptionStatus === 'active').length;
  const warningCount = students.filter(s => s.subscriptionStatus === 'warning').length;
  const expiredCount = students.filter(s => s.subscriptionStatus === 'expired' || s.subscriptionStatus === 'none').length;

  const handleSaveSubscription = async () => {
    if (!selectedStudent) return;
    
    try {
      // Remplacer par un vrai appel API quand disponible
      // await studentsApi.updateStudent(selectedStudent.id, updatedStudent);
      const updatedStudent = {
        ...selectedStudent,
        subscriptionStatus: 'active'
      };
      console.log('Simulation: Mise à jour abonnement', updatedStudent);
      await loadData();
      setIsModalOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'abonnement:', error);
    }
  };

  const handleRenew = (planType: 'weekly' | 'monthly') => {
    if (selectedStudent) {
      handleSaveSubscription();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-black text-slate-800">Gestion des Abonnements</h2>
        <p className="text-sm text-slate-500 font-medium italic">Suivez et renouvelez les droits d'accès à la cantine.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Check size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actifs</p>
            <h4 className="text-2xl font-black text-slate-800">{activeCount}</h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bientôt Expirés</p>
            <h4 className="text-2xl font-black text-slate-800">{warningCount}</h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expirés</p>
            <h4 className="text-2xl font-black text-slate-800">{expiredCount}</h4>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
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
              onClick={() => setFilterStatus('warning')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${filterStatus === 'warning' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400'}`}
            >
              Alerte
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
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="px-6 py-5">Élève</th>
                <th className="px-6 py-5">Classe</th>
                <th className="px-6 py-5">Statut</th>
                <th className="px-6 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${
                        student.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-700' : 
                        student.subscriptionStatus === 'warning' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {student.firstName[0]}{student.lastName[0]}
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
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider
                      ${student.subscriptionStatus === 'active' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : student.subscriptionStatus === 'warning'
                        ? 'bg-amber-50 text-amber-700 border-amber-100'
                        : 'bg-red-50 text-red-700 border-red-100'
                      }
                    `}>
                      {student.subscriptionStatus === 'active' ? 'Opérationnel' : 
                       student.subscriptionStatus === 'warning' ? 'Bientôt Expiré' : 
                       'Expiré'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => { setSelectedStudent(student); setIsModalOpen(true); }}
                      className={`flex items-center space-x-2 ml-auto px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        student.subscriptionStatus === 'active'
                        ? 'text-slate-400 bg-slate-50 hover:bg-slate-100'
                        : student.subscriptionStatus === 'warning'
                        ? 'text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/10'
                        : 'text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/10'
                      }`}
                    >
                      <RefreshCcw size={14} />
                      <span>{student.subscriptionStatus === 'active' ? 'Prolonger' : 'Réactiver'}</span>
                    </button>
                  </td>
                </tr>
              )) : (
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

      {/* MODAL DE RENOUVELLEMENT */}
      {isModalOpen && selectedStudent && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}
        >
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`p-8 text-white flex justify-between items-center ${
              selectedStudent.subscriptionStatus === 'expired' ? 'bg-red-600' : 'bg-emerald-600'
            }`}>
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
                  onClick={() => handleRenew('weekly')}
                  className="w-full p-5 border-2 border-slate-100 rounded-3xl flex items-center justify-between group hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-left"
                >
                  <div>
                    <p className="font-black text-slate-800 uppercase text-xs tracking-widest">Forfait Hebdomadaire</p>
                    <p className="text-sm font-bold text-emerald-600 mt-1">2 500 FCFA</p>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                </button>

                <button 
                  onClick={() => handleRenew('monthly')}
                  className="w-full p-5 border-2 border-slate-100 rounded-3xl flex items-center justify-between group hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-left"
                >
                  <div>
                    <p className="font-black text-slate-800 uppercase text-xs tracking-widest">Forfait Mensuel</p>
                    <p className="text-sm font-bold text-emerald-600 mt-1">10 000 FCFA</p>
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
