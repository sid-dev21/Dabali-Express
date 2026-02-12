import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Check, Users, AlertTriangle, Info } from 'lucide-react';
import { studentsApi, schoolsApi } from '../services/api';
import { Student } from '../types';

interface StudentsProps {
  schoolId?: string;
  initialSearch?: string;
}

const Students: React.FC<StudentsProps> = ({ schoolId, initialSearch = '' }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const loadStudents = async () => {
    try {
      const data = await studentsApi.getStudents(schoolId);
      setStudents(data);
    } catch (error) {
      console.error('Error loading students:', error);
      setStudents([]);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [schoolId]);

  const openDeleteModal = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setStudentToDelete(null);
  };

  const confirmDelete = async () => {
    if (studentToDelete) {
      try {
        await studentsApi.deleteStudent(studentToDelete.id);
        loadStudents();
        closeDeleteModal();
      } catch (error) {
        console.error('Error deleting student:', error);
      }
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const studentData: any = {
      id: editingStudent?.id || '',
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      class: formData.get('class'),
      parentPhone: formData.get('parentPhone'),
      schoolId: schoolId || '1',
      subscriptionStatus: editingStudent?.subscriptionStatus || 'none',
      qrCode: editingStudent?.qrCode || `QR_${Math.random()}`
    };
    try {
      if (editingStudent) {
        await studentsApi.updateStudent(editingStudent.id, studentData);
      } else {
        await studentsApi.createStudent(studentData);
      }
      loadStudents();
      setIsModalOpen(false);
      setEditingStudent(null);
    } catch (error) {
      console.error('Error saving student:', error);
    }
  };

  const filteredStudents = students.filter(s => 
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(initialSearch.toLowerCase()) ||
    s.class.toLowerCase().includes(initialSearch.toLowerCase()) ||
    s.parentPhone.includes(initialSearch)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Gestion des Élèves</h2>
          <p className="text-sm text-slate-500 font-medium">Répertoire complet des élèves inscrits à la cantine.</p>
        </div>
        <div className="flex">
          <button 
            onClick={() => { setEditingStudent(null); setIsModalOpen(true); }}
            className="flex items-center space-x-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10 font-black text-sm uppercase tracking-widest"
          >
            <Plus size={18} />
            <span>Nouvel Élève</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="px-6 py-5">Élève</th>
                <th className="px-6 py-5">Classe</th>
                <th className="px-6 py-5">Parent (Contact)</th>
                <th className="px-6 py-5">Abonnement</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                        {student.firstName[0]}{student.lastName[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{student.firstName} {student.lastName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: {student.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-600 px-3 py-1 bg-slate-100 rounded-lg">{student.class}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{student.parentPhone}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider
                      ${student.subscriptionStatus === 'active' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : student.subscriptionStatus === 'expired'
                        ? 'bg-amber-50 text-amber-700 border-amber-100'
                        : 'bg-slate-50 text-slate-700 border-slate-100'
                      }
                    `}>
                      {student.subscriptionStatus === 'active' ? 'Actif' : student.subscriptionStatus === 'expired' ? 'Expiré' : 'Aucun'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-1">
                      <button 
                        onClick={() => { setEditingStudent(student); setIsModalOpen(true); }} 
                        className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        title="Modifier"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => openDeleteModal(student)} 
                        className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="p-24 text-center">
                    <div className="flex flex-col items-center space-y-4 opacity-20">
                       <Users size={64} />
                       <p className="font-black text-xl uppercase tracking-widest">Aucun élève trouvé</p>
                       <p className="text-sm font-bold">Ajustez votre recherche ou créez un profil.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE SUPPRESSION */}
      {isDeleteModalOpen && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300"
          onClick={(e) => e.target === e.currentTarget && closeDeleteModal()}
        >
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-4 border-red-500/10">
            <div className="p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6">
                <AlertTriangle size={40} className="animate-pulse" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Supprimer l'élève ?</h3>
              <p className="text-slate-500 font-medium mb-6 leading-relaxed">
                Voulez-vous vraiment retirer <span className="text-red-600 font-bold">{studentToDelete?.firstName} {studentToDelete?.lastName}</span> du système ?
              </p>
              
              <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-left mb-8">
                <p className="text-[10px] font-black text-red-800 uppercase tracking-widest mb-2 flex items-center">
                  <Info size={12} className="mr-1" /> Conséquences immédiates :
                </p>
                <ul className="text-xs text-red-700 font-bold space-y-1 opacity-80">
                  <li>• Désactivation immédiate du badge QR</li>
                  <li>• Perte de l'historique des présences</li>
                  <li>• Suppression du compte de l'élève</li>
                </ul>
              </div>

              <div className="flex flex-col space-y-3">
                <button 
                  onClick={confirmDelete}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all uppercase text-xs tracking-widest"
                >
                  Supprimer définitivement
                </button>
                <button 
                  onClick={closeDeleteModal}
                  className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all uppercase text-xs tracking-widest"
                >
                  Conserver l'élève
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL D'AJOUT / MODIFICATION */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}
        >
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`p-8 flex justify-between items-center text-white ${editingStudent ? 'bg-blue-600' : 'bg-emerald-600'}`}>
              <div>
                <h3 className="font-black text-2xl">{editingStudent ? 'Modifier' : 'Nouvel'} Élève</h3>
                <p className="text-[10px] text-white/70 font-black uppercase tracking-widest mt-1">Scolarité Dabali Express</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="bg-white/20 p-2 rounded-full hover:bg-white/30 hover:rotate-90 transition-all"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom</label>
                  <input name="firstName" defaultValue={editingStudent?.firstName} required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-700 outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom</label>
                  <input name="lastName" defaultValue={editingStudent?.lastName} required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-700 outline-none transition-all" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Classe</label>
                <input name="class" defaultValue={editingStudent?.class} required placeholder="ex: CM2, 3ème, Terminale..." className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-700 outline-none transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone du Parent</label>
                <input name="parentPhone" defaultValue={editingStudent?.parentPhone} required placeholder="ex: 70 00 00 00" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-700 outline-none transition-all" />
              </div>
              <div className="pt-4 flex space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 px-4 py-4 border-2 border-slate-100 rounded-2xl font-black text-slate-400 hover:bg-slate-50 transition-colors uppercase text-xs tracking-widest"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className={`flex-1 px-4 py-4 text-white rounded-2xl font-black shadow-xl transition-all flex items-center justify-center space-x-2 uppercase text-xs tracking-widest ${editingStudent ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  <Check size={20} />
                  <span>Confirmer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
