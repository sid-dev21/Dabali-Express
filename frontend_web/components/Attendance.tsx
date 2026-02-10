
import React, { useState, useEffect } from 'react';
import { Search, UserCheck, CheckCircle2, AlertCircle, Clock, Trash2, Users, Check } from 'lucide-react';
import { mockApi } from '../services/mockApi';
import { Student } from '../types';

interface Log {
  id: string;
  studentId: string;
  name: string;
  time: string;
  class: string;
  schoolId: string;
}

interface AttendanceProps {
  schoolId?: string;
  initialSearch?: string;
}

const Attendance: React.FC<AttendanceProps> = ({ schoolId, initialSearch = '' }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [recentLogs, setRecentLogs] = useState<Log[]>([]);

  const loadLogs = () => {
    const logs = mockApi.getAttendanceLogs(schoolId);
    setRecentLogs(logs.sort((a, b) => b.time.localeCompare(a.time)));
  };

  useEffect(() => {
    setStudents(mockApi.getStudents(schoolId));
    loadLogs();
  }, [schoolId]);

  const hasAlreadyEaten = (studentId: string) => {
    return recentLogs.some(log => log.studentId === studentId);
  };

  const handlePointer = (student: Student) => {
    if (hasAlreadyEaten(student.id)) return;

    const newLog: Log = {
      id: `log-${Math.random().toString(36).substr(2, 9)}`,
      studentId: student.id,
      name: `${student.firstName} ${student.lastName}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      class: student.class,
      schoolId: student.schoolId
    };
    
    mockApi.saveAttendanceLog(newLog);
    loadLogs();
  };

  const removeLog = (id: string) => {
    mockApi.removeAttendanceLog(id);
    loadLogs();
  };

  const filteredStudents = students.filter(s => 
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(initialSearch.toLowerCase()) ||
    s.class.toLowerCase().includes(initialSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Pointage de la Cantine</h2>
          <p className="text-sm text-slate-500 font-medium italic">Un seul passage autorisé par élève et par service.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Liste d'appel cantine</h4>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg font-black uppercase tracking-tighter">
                {filteredStudents.length} élèves affichés
              </span>
            </div>
            
            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px] custom-scrollbar">
              {filteredStudents.length > 0 ? filteredStudents.map((student) => {
                const canEat = student.subscriptionStatus === 'active' || student.subscriptionStatus === 'warning';
                const isWarning = student.subscriptionStatus === 'warning';
                const alreadyValidated = hasAlreadyEaten(student.id);
                
                return (
                  <div key={student.id} className={`p-5 flex items-center justify-between transition-colors group ${alreadyValidated ? 'bg-slate-50/80 opacity-60' : 'hover:bg-slate-50/50'}`}>
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all shadow-sm ${
                        alreadyValidated ? 'bg-slate-200 text-slate-500' :
                        canEat ? (isWarning ? 'bg-amber-100 text-amber-600' : 'bg-emerald-50 text-emerald-600') : 'bg-red-50 text-red-600'
                      }`}>
                        {alreadyValidated ? <Check size={20} /> : `${student.firstName[0]}${student.lastName[0]}`}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className={`font-bold ${alreadyValidated ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'}`}>
                            {student.firstName} {student.lastName}
                          </p>
                          {alreadyValidated && (
                            <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-black uppercase tracking-tighter flex items-center">
                              <CheckCircle2 size={10} className="mr-1" /> Présent
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Classe: {student.class}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <button 
                        onClick={() => handlePointer(student)}
                        disabled={!canEat || alreadyValidated}
                        className={`min-w-[140px] py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${
                          alreadyValidated
                          ? 'bg-slate-200 text-slate-500 cursor-default shadow-none'
                          : canEat 
                          ? (isWarning ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20') 
                          : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                        }`}
                      >
                        {alreadyValidated ? 'Déjà passé' : canEat ? 'Valider passage' : 'Paiement requis'}
                      </button>
                    </div>
                  </div>
                );
              }) : (
                <div className="p-24 text-center text-slate-400 font-medium">
                  <Users size={64} className="mx-auto mb-4 opacity-10" />
                  <p className="font-black uppercase tracking-widest text-sm">Aucun élève correspondant</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden sticky top-24">
            <div className="p-6 border-b border-slate-100 bg-slate-800 text-white flex justify-between items-center">
              <div>
                <h4 className="font-black uppercase text-[10px] tracking-widest opacity-70">Passages du jour</h4>
                <p className="text-xl font-black">{recentLogs.length}</p>
              </div>
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
            </div>
            
            <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto custom-scrollbar bg-slate-50/20">
              {recentLogs.length > 0 ? recentLogs.map((log) => (
                <div key={log.id} className="p-5 flex justify-between items-center hover:bg-white transition-colors animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                       <Clock size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm leading-tight">{log.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{log.class} • à {log.time}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeLog(log.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )) : (
                <div className="p-20 text-center">
                  <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.2em]">En attente de passage</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
