
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Shield, ShieldAlert, X, Check, Search, UserPlus, Copy, Mail, MessageSquare } from 'lucide-react';
import { authApi, schoolsApi } from '../services/api';
import { User, UserRole, School } from '../types';

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

interface UsersProps {
  initialSearch?: string;
}

const Users: React.FC<UsersProps> = ({ initialSearch = '' }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const loadData = async () => {
    try {
      const [usersData, schoolsData] = await Promise.all([
        // Remplacer par un vrai appel API quand disponible
        Promise.resolve([]), // usersApi.getUsers()
        schoolsApi.getSchools()
      ]);
      setUsers(usersData);
      setSchools(schoolsData);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setUsers([]);
      setSchools([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (user: User) => {
    const updatedUser = { ...user, status: user.status === 'active' ? 'blocked' : 'active' } as User;
    
    try {
      // Remplacer par un vrai appel API quand disponible
      // await usersApi.updateUser(user.id, updatedUser);
      console.log('Simulation: Mise à jour du statut utilisateur', updatedUser);
      await loadData();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const schoolId = fd.get('schoolId') as string;
    const school = schools.find(s => s.id === schoolId);

    const userData: any = {
      id: editingUser?.id || '',
      name: fd.get('name'),
      email: fd.get('email'),
      role: fd.get('role'),
      schoolId: schoolId,
      schoolName: school?.name || '',
      status: editingUser?.status || 'active',
      avatar: editingUser?.avatar || '' // On laisse vide pour utiliser les initiales
    };
    
    try {
      // Remplacer par un vrai appel API quand disponible
      // if (editingUser) {
      //   await usersApi.updateUser(editingUser.id, userData);
      // } else {
      //   await usersApi.createUser(userData);
      // }
      console.log('Simulation: Sauvegarde utilisateur', userData);
      setIsModalOpen(false);
      await loadData();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'utilisateur:', error);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(initialSearch.toLowerCase()) || 
    u.email.toLowerCase().includes(initialSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Comptes Utilisateurs</h2>
          <p className="text-sm text-slate-500 font-medium">Contrôle des accès pour les directeurs et gérants de cantine.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
            className="flex items-center space-x-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-all shadow-md font-bold text-sm"
          >
            <Plus size={18} />
            <span>Créer un Compte</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">Utilisateur</th>
                <th className="px-6 py-4">Rôle</th>
                <th className="px-6 py-4">Établissement</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {user.avatar ? (
                        <img src={user.avatar} className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 shadow-sm object-cover" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                          {getInitials(user.name)}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-800 leading-tight">{user.name}</p>
                        <p className="text-xs text-slate-400 font-medium">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black uppercase text-slate-500 px-3 py-1 bg-slate-100 rounded-lg tracking-wider">
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-bold">
                    {user.schoolName || 'Plateforme Dabali'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center space-x-1.5 ${user.status === 'active' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {user.status === 'active' ? <Shield size={14} /> : <ShieldAlert size={14} />}
                      <span className="font-black uppercase text-[10px] tracking-widest">{user.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => handleToggleStatus(user)}
                        title={user.status === 'active' ? 'Bloquer' : 'Débloquer'}
                        className={`p-2 rounded-lg transition-colors ${user.status === 'active' ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                      >
                        {user.status === 'active' ? <ShieldAlert size={18} /> : <Shield size={18} />}
                      </button>
                      <button 
                         onClick={() => { setEditingUser(user); setIsModalOpen(true); }}
                         className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                   <td colSpan={5} className="p-16 text-center">
                      <div className="opacity-20 flex flex-col items-center">
                        <Search size={48} />
                        <p className="mt-4 font-black uppercase tracking-widest text-sm">Aucun utilisateur trouvé</p>
                      </div>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-emerald-600 text-white">
              <h3 className="font-black text-2xl">{editingUser ? 'Modifier' : 'Nouveau'} Compte</h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:rotate-90 transition-transform"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom Complet</label>
                <input name="name" required defaultValue={editingUser?.name} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Professionnel</label>
                <input name="email" type="email" required defaultValue={editingUser?.email} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 font-medium" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rôle</label>
                  <select name="role" required defaultValue={editingUser?.role} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl bg-white font-medium">
                    <option value={UserRole.SCHOOL_ADMIN}>Directeur</option>
                    <option value={UserRole.CANTEEN_MANAGER}>Gérant</option>
                    <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">École</label>
                  <select name="schoolId" required defaultValue={editingUser?.schoolId} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl bg-white font-medium">
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-colors">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-black shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2">
                  <Check size={20} />
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
