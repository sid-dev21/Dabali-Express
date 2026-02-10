
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, Users, School, CreditCard, Clock, Utensils, CheckCircle } from 'lucide-react';
import { COLORS } from '../constants';
import { UserRole } from '../types';
import { mockApi } from '../services/mockApi';

interface DashboardProps {
  searchQuery?: string;
  userRole: UserRole;
  schoolId?: string;
}

type Activity = {
  id: string;
  user: string;
  action: string;
  time: string;
  amount?: string;
  schoolId?: string;
}

const StatsCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-black mt-2 text-slate-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${color} text-white shadow-lg`}>
        {icon}
      </div>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ searchQuery = '', userRole, schoolId }) => {
  const isSuperAdmin = userRole === UserRole.SUPER_ADMIN;

  // Calculs basés sur les données réelles du mockApi
  const students = useMemo(() => mockApi.getStudents(schoolId), [schoolId]);
  const schools = useMemo(() => mockApi.getSchools(), []);
  const payments = useMemo(() => mockApi.getPayments(schoolId), [schoolId]);
  const dailyAttendance = useMemo(() => mockApi.getAttendanceLogs(schoolId), [schoolId]);

  const activeSubs = students.filter(s => s.subscriptionStatus === 'active').length;
  const warningSubs = students.filter(s => s.subscriptionStatus === 'warning').length;
  const expiredSubs = students.filter(s => s.subscriptionStatus === 'expired' || s.subscriptionStatus === 'none').length;

  const totalRevenue = payments.reduce((acc, curr) => acc + curr.amount, 0);

  const subStatus = [
    { name: 'Actifs', value: activeSubs, color: '#10b981' },
    { name: 'Alertes', value: warningSubs, color: '#f59e0b' },
    { name: 'Expirés', value: expiredSubs, color: '#ef4444' },
  ];

  // Activités réelles (simulées à partir des paiements et abonnements pour rester exact)
  const realActivities = useMemo(() => {
    const acts: Activity[] = [];
    // Ajouter les 3 derniers paiements
    payments.slice(-3).forEach(p => {
      acts.push({
        id: `p-${p.id}`,
        user: p.studentName,
        action: `Paiement ${p.status === 'completed' ? 'validé' : 'en attente'}`,
        time: 'Récemment',
        amount: `${p.amount.toLocaleString()} FCFA`,
        schoolId: p.schoolId
      });
    });
    // Ajouter les derniers passages
    dailyAttendance.slice(-2).forEach(l => {
      acts.push({
        id: `l-${l.id}`,
        user: l.name,
        action: 'Passage cantine validé',
        time: l.time,
        schoolId: l.schoolId
      });
    });
    return acts.sort((a, b) => b.id.localeCompare(a.id));
  }, [payments, dailyAttendance]);

  const filteredActivities = realActivities.filter(act => {
    const matchesSearch = act.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         act.action.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Données de graphique basées sur la capacité réelle (élèves abonnés)
  const attendanceData = [
    { name: 'Lun', present: Math.floor((activeSubs + warningSubs) * 0.82) },
    { name: 'Mar', present: Math.floor((activeSubs + warningSubs) * 0.88) },
    { name: 'Mer', present: Math.floor((activeSubs + warningSubs) * 0.75) },
    { name: 'Jeu', present: Math.floor((activeSubs + warningSubs) * 0.91) },
    { name: 'Aujourd\'hui', present: dailyAttendance.length },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Élèves Inscrits" 
          value={students.length.toLocaleString()} 
          icon={<Users size={24} />} 
          color="bg-emerald-600" 
        />
        
        {isSuperAdmin ? (
          <StatsCard title="Écoles Partenaires" value={schools.length.toString()} icon={<School size={24} />} color="bg-amber-600" />
        ) : (
          <StatsCard title="Abonnements Valides" value={(activeSubs + warningSubs).toString()} icon={<CheckCircle size={24} />} color="bg-emerald-500" />
        )}

        <StatsCard 
          title="Recettes Totales" 
          value={`${totalRevenue.toLocaleString()} FCFA`} 
          icon={<CreditCard size={24} />} 
          color="bg-blue-600" 
        />
        <StatsCard 
          title="Repas du Jour" 
          value={dailyAttendance.length.toString()} 
          icon={<Utensils size={24} />} 
          color="bg-indigo-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-slate-800 flex items-center">
              <TrendingUp size={18} className="mr-2 text-emerald-600" />
              Historique de Présence
            </h4>
            <span className="text-[10px] font-black uppercase text-slate-400">Capacité max: {activeSubs + warningSubs}</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="present" fill={COLORS.primary} radius={[6, 6, 0, 0]}>
                  {attendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === "Aujourd'hui" ? COLORS.secondary : COLORS.primary} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h4 className="font-bold text-slate-800 mb-6">Répartition des Abonnements</h4>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={subStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                  {subStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 pr-4 shrink-0">
              {subStatus.map((item) => (
                <div key={item.name} className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{item.name}: <span className="text-slate-800">{item.value}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h4 className="font-bold text-slate-800">Derniers Événements Système</h4>
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Données exactes</span>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredActivities.length > 0 ? filteredActivities.map((activity) => (
            <div key={activity.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{activity.user}</p>
                  <p className={`text-[10px] font-black uppercase text-slate-400`}>{activity.action}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase">{activity.time}</p>
                {activity.amount && <p className="text-sm font-black text-emerald-600 mt-0.5">{activity.amount}</p>}
              </div>
            </div>
          )) : (
            <div className="p-12 text-center text-slate-400 font-medium">Aucun événement récent enregistré.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
