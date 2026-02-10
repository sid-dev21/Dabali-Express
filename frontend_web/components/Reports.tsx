import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Users, Utensils, TrendingUp, PieChart } from 'lucide-react';
import { mockApi } from '../services/mockApi';
import { Student } from '../types';

interface ReportsProps {
  schoolId?: string;
  userRole?: string;
}

const Reports: React.FC<ReportsProps> = ({ schoolId, userRole }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [menuData, setMenuData] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState<'attendance' | 'menu' | 'summary'>('attendance');

  useEffect(() => {
    if (schoolId) {
      setStudents(mockApi.getStudents(schoolId));
      // Mock data for reports
      setAttendanceData([
        { date: '2024-01-15', present: 45, absent: 5, total: 50 },
        { date: '2024-01-16', present: 48, absent: 2, total: 50 },
        { date: '2024-01-17', present: 42, absent: 8, total: 50 },
        { date: '2024-01-18', present: 47, absent: 3, total: 50 },
        { date: '2024-01-19', present: 44, absent: 6, total: 50 },
      ]);
      
      setMenuData([
        { date: '2024-01-15', meal: 'Riz sauce tomate', type: 'LUNCH', price: 500, consumed: 45 },
        { date: '2024-01-16', meal: 'Poulet DG', type: 'LUNCH', price: 600, consumed: 48 },
        { date: '2024-01-17', meal: 'Attieke poissons', type: 'LUNCH', price: 550, consumed: 42 },
        { date: '2024-01-18', meal: 'Foufou sauce graine', type: 'LUNCH', price: 500, consumed: 47 },
        { date: '2024-01-19', meal: 'Riz cantonais', type: 'LUNCH', price: 550, consumed: 44 },
      ]);
    }
  }, [schoolId]);

  const generateAttendanceReport = () => {
    const csvContent = [
      ['Date', 'Présents', 'Absents', 'Total', 'Taux de présence (%)'],
      ...attendanceData.map(item => [
        item.date,
        item.present,
        item.absent,
        item.total,
        ((item.present / item.total) * 100).toFixed(1)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_presence_${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateMenuReport = () => {
    const csvContent = [
      ['Date', 'Repas', 'Type', 'Prix (FCFA)', 'Consommés', 'Revenu (FCFA)'],
      ...menuData.map(item => [
        item.date,
        item.meal,
        item.type,
        item.price,
        item.consumed,
        item.price * item.consumed
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_menus_${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateSummaryReport = () => {
    const totalStudents = students.length;
    const activeSubscriptions = students.filter(s => s.subscriptionStatus === 'active').length;
    const totalPresent = attendanceData.reduce((sum, item) => sum + item.present, 0);
    const totalMeals = menuData.reduce((sum, item) => sum + item.consumed, 0);
    const totalRevenue = menuData.reduce((sum, item) => sum + (item.price * item.consumed), 0);
    
    const summaryData = {
      totalStudents,
      activeSubscriptions,
      subscriptionRate: ((activeSubscriptions / totalStudents) * 100).toFixed(1),
      avgDailyAttendance: (totalPresent / attendanceData.length).toFixed(1),
      avgDailyMeals: (totalMeals / menuData.length).toFixed(1),
      totalRevenue,
      avgMealPrice: (totalRevenue / totalMeals).toFixed(0)
    };
    
    const csvContent = [
      ['Indicateur', 'Valeur'],
      ['Total élèves', summaryData.totalStudents],
      ['Abonnements actifs', summaryData.activeSubscriptions],
      ['Taux d\'abonnement (%)', summaryData.subscriptionRate],
      ['Moyenne présences/jour', summaryData.avgDailyAttendance],
      ['Moyenne repas/jour', summaryData.avgDailyMeals],
      ['Revenu total (FCFA)', summaryData.totalRevenue],
      ['Prix moyen repas (FCFA)', summaryData.avgMealPrice]
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_synthese_${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderAttendanceReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1">Total élèves</p>
              <p className="text-3xl font-black text-blue-700">{students.length}</p>
            </div>
            <Users size={24} className="text-blue-500" />
          </div>
        </div>
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Abonnements actifs</p>
              <p className="text-3xl font-black text-emerald-700">
                {students.filter(s => s.subscriptionStatus === 'active').length}
              </p>
            </div>
            <TrendingUp size={24} className="text-emerald-500" />
          </div>
        </div>
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Taux moyen présence</p>
              <p className="text-3xl font-black text-amber-700">
                {attendanceData.length > 0 
                  ? ((attendanceData.reduce((sum, item) => sum + item.present, 0) / (attendanceData.length * students.length)) * 100).toFixed(1)
                  : '0'}%
              </p>
            </div>
            <PieChart size={24} className="text-amber-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Historique de présence</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-right">Présents</th>
                <th className="px-6 py-4 text-right">Absents</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-right">Taux (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceData.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{item.date}</td>
                  <td className="px-6 py-4 text-right text-emerald-600 font-black">{item.present}</td>
                  <td className="px-6 py-4 text-right text-amber-600 font-black">{item.absent}</td>
                  <td className="px-6 py-4 text-right text-slate-600 font-black">{item.total}</td>
                  <td className="px-6 py-4 text-right font-black">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black
                      ${((item.present / item.total) * 100) >= 90 ? 'bg-emerald-100 text-emerald-700' : 
                        ((item.present / item.total) * 100) >= 80 ? 'bg-amber-100 text-amber-700' : 
                        'bg-red-100 text-red-700'}`}>
                      {((item.present / item.total) * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderMenuReport = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Menus de la semaine</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Repas</th>
                <th className="px-6 py-4 text-left">Type</th>
                <th className="px-6 py-4 text-right">Prix (FCFA)</th>
                <th className="px-6 py-4 text-right">Consommés</th>
                <th className="px-6 py-4 text-right">Revenu (FCFA)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {menuData.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{item.date}</td>
                  <td className="px-6 py-4 text-slate-700 font-medium">{item.meal}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600 font-black">{item.price}</td>
                  <td className="px-6 py-4 text-right text-emerald-600 font-black">{item.consumed}</td>
                  <td className="px-6 py-4 text-right font-black text-blue-600">
                    {item.price * item.consumed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSummaryReport = () => {
    const totalStudents = students.length;
    const activeSubscriptions = students.filter(s => s.subscriptionStatus === 'active').length;
    const totalPresent = attendanceData.reduce((sum, item) => sum + item.present, 0);
    const totalMeals = menuData.reduce((sum, item) => sum + item.consumed, 0);
    const totalRevenue = menuData.reduce((sum, item) => sum + (item.price * item.consumed), 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total élèves</p>
                <p className="text-2xl font-black text-slate-800">{totalStudents}</p>
              </div>
              <Users size={24} className="text-slate-300" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Abonnements actifs</p>
                <p className="text-2xl font-black text-emerald-600">{activeSubscriptions}</p>
              </div>
              <TrendingUp size={24} className="text-emerald-500" />
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Taux: {((activeSubscriptions / totalStudents) * 100).toFixed(1)}%
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Revenu total</p>
                <p className="text-2xl font-black text-blue-600">{totalRevenue.toLocaleString()} FCFA</p>
              </div>
              <PieChart size={24} className="text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Moyenne repas/jour</p>
                <p className="text-2xl font-black text-amber-600">
                  {menuData.length > 0 ? (totalMeals / menuData.length).toFixed(1) : '0'}
                </p>
              </div>
              <Utensils size={24} className="text-amber-500" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Rapports et Analyses</h2>
          <p className="text-sm text-slate-500 font-medium italic">Suivi complet des performances de la cantine</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setReportType('attendance')}
              className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                reportType === 'attendance' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Présence
            </button>
            <button 
              onClick={() => setReportType('menu')}
              className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                reportType === 'menu' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Menus
            </button>
            <button 
              onClick={() => setReportType('summary')}
              className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                reportType === 'summary' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Synthèse
            </button>
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => {
                if (reportType === 'attendance') generateAttendanceReport();
                else if (reportType === 'menu') generateMenuReport();
                else generateSummaryReport();
              }}
              className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-all font-black text-xs uppercase tracking-widest"
            >
              <Download size={16} />
              <span>Télécharger CSV</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Calendar size={20} className="text-slate-400" />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-700 outline-none"
          />
        </div>

        {reportType === 'attendance' && renderAttendanceReport()}
        {reportType === 'menu' && renderMenuReport()}
        {reportType === 'summary' && renderSummaryReport()}
      </div>
    </div>
  );
};

export default Reports;