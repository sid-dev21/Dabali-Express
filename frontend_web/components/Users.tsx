import React, { useEffect, useState } from 'react';
import { Plus, Edit, X, Check, Search, Trash2, Copy } from 'lucide-react';
import { usersApi, schoolsApi } from '../services/api';
import { User, UserRole, School } from '../types';

const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean);
  if (!parts.length) return 'NA';
  return parts
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

const parseName = (fullName: string) => {
  const parts = fullName.trim().split(' ').filter(Boolean);
  const first_name = parts[0] || '';
  const last_name = parts.slice(1).join(' ') || first_name;
  return { first_name, last_name };
};

interface UsersProps {
  initialSearch?: string;
}

interface CreatedCredentials {
  email: string;
  password: string;
}

const Users: React.FC<UsersProps> = ({ initialSearch = '' }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [draftRole, setDraftRole] = useState<UserRole>(UserRole.PARENT);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<'email' | 'password' | 'both' | null>(null);

  const loadData = async () => {
    try {
      const [usersData, schoolsData] = await Promise.all([
        usersApi.getUsers(),
        schoolsApi.getSchools(),
      ]);
      setUsers(usersData);
      setSchools(schoolsData);
    } catch (error) {
      console.error('Erreur lors du chargement des donnees:', error);
      setUsers([]);
      setSchools([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setDraftRole(user.role);
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setDraftRole(UserRole.PARENT);
    setIsModalOpen(true);
  };

  const copyToClipboard = async (value: string, field: 'email' | 'password' | 'both') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = value;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    }
  };

  const handleDeleteUser = async (user: User) => {
    const confirmed = window.confirm(`Supprimer l'utilisateur ${user.name} ?`);
    if (!confirmed) return;

    try {
      const deleted = await usersApi.deleteUser(user.id);
      if (!deleted) {
        alert('Suppression impossible.');
        return;
      }
      await loadData();
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      alert(error?.message || 'Erreur lors de la suppression.');
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const role = String(fd.get('role') || editingUser?.role || UserRole.PARENT) as UserRole;
    const schoolId = String(fd.get('schoolId') || '').trim();

    const isEmailRequired = editingUser ? true : role !== UserRole.SCHOOL_ADMIN;
    if (!fullName || (isEmailRequired && !email)) {
      alert(isEmailRequired ? 'Nom et email sont requis.' : 'Nom requis.');
      return;
    }

    if ((role === UserRole.SCHOOL_ADMIN || role === UserRole.CANTEEN_MANAGER) && !schoolId) {
      alert('Une ecole est requise pour ce role.');
      return;
    }

    const { first_name, last_name } = parseName(fullName);

    try {
      if (editingUser) {
        const updatedUser = await usersApi.updateUser(editingUser.id, {
          first_name,
          last_name,
          email,
          role,
          school_id: role === UserRole.SCHOOL_ADMIN || role === UserRole.CANTEEN_MANAGER ? schoolId : undefined,
        });

        if (!updatedUser) {
          alert('Impossible de mettre a jour cet utilisateur.');
          return;
        }
      } else {
        const created = await usersApi.createUser({
          first_name,
          last_name,
          email: email || undefined,
          role,
          school_id: role === UserRole.SCHOOL_ADMIN || role === UserRole.CANTEEN_MANAGER ? schoolId : undefined,
        });

        if (!created?.user) {
          alert('Impossible de creer cet utilisateur.');
          return;
        }

        if (created.temporary_password) {
          setCopiedField(null);
          setCreatedCredentials({
            email: created.user.email || email,
            password: created.temporary_password,
          });
        } else {
          alert('Compte cree avec succes.');
        }
      }

      setIsModalOpen(false);
      setEditingUser(null);
      await loadData();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde de l utilisateur:', error);
      const message = String(error?.message || '');
      if (/acces refuse|acc[èe]s refus[ée]/i.test(message)) {
        alert(`${message}\n\nConnectez-vous avec un compte SUPER_ADMIN pour creer/modifier les utilisateurs.`);
      } else {
        alert(message || 'Erreur lors de la mise a jour.');
      }
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = initialSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="surface-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="section-title">Comptes Utilisateurs</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Le Super Admin peut voir, creer, modifier et supprimer les utilisateurs autorises.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="btn-primary flex items-center space-x-2 px-5 py-2.5 font-bold text-sm"
        >
          <Plus size={18} />
          <span>Creer un compte</span>
        </button>
      </div>

      <div className="table-shell">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="table-head">
              <tr>
                <th className="px-6 py-4">Utilisateur</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Etablissement</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
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
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {user.role === UserRole.PARENT ? `${user.childrenCount || 0} enfant(s) inscrit(s)` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="action-icon text-slate-500 hover:text-emerald-600"
                          title="Modifier"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="action-icon text-slate-500 hover:text-red-600"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-16 text-center">
                    <div className="opacity-20 flex flex-col items-center">
                      <Search size={48} />
                      <p className="mt-4 font-black uppercase tracking-widest text-sm">Aucun utilisateur trouve</p>
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
              <h3 className="font-black text-2xl">{editingUser ? 'Modifier Compte' : 'Nouveau Compte'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:rotate-90 transition-transform">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom complet</label>
                <input
                  name="name"
                  required
                  defaultValue={editingUser?.name || ''}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                <input
                  name="email"
                  type="email"
                  required={editingUser ? true : draftRole !== UserRole.SCHOOL_ADMIN}
                  defaultValue={editingUser?.email || ''}
                  placeholder={!editingUser && draftRole === UserRole.SCHOOL_ADMIN ? 'Laisser vide pour generation automatique' : ''}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 font-medium"
                />
                {!editingUser && draftRole === UserRole.SCHOOL_ADMIN && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    Optionnel: si vide, l email du School Admin sera genere automatiquement.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</label>
                  <select
                    name="role"
                    required
                    value={draftRole}
                    onChange={(e) => setDraftRole(e.target.value as UserRole)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl bg-white font-medium"
                  >
                    {editingUser?.role === UserRole.SUPER_ADMIN ? (
                      <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                    ) : (
                      <>
                        <option value={UserRole.SCHOOL_ADMIN}>Directeur</option>
                        <option value={UserRole.CANTEEN_MANAGER}>Gerant</option>
                        <option value={UserRole.PARENT}>Parent</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ecole</label>
                  <select name="schoolId" defaultValue={editingUser?.schoolId || ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl bg-white font-medium">
                    <option value="">Aucune</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-black shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2"
                >
                  <Check size={20} />
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createdCredentials && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-emerald-600 text-white">
              <h3 className="font-black text-2xl">Identifiants du nouveau compte</h3>
              <button
                onClick={() => {
                  setCreatedCredentials(null);
                  setCopiedField(null);
                }}
                className="hover:rotate-90 transition-transform"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-5">
              <p className="text-sm text-slate-600 font-medium">
                Copiez ces informations pour les envoyer a la personne qui va se connecter.
              </p>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="text-sm font-bold text-slate-700 break-all">{createdCredentials.email}</p>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdCredentials.email, 'email')}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-2"
                  >
                    <Copy size={14} />
                    {copiedField === 'email' ? 'Copie' : 'Copier'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mot de passe temporaire</label>
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="text-sm font-bold text-slate-700 break-all">{createdCredentials.password}</p>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdCredentials.password, 'password')}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-2"
                  >
                    <Copy size={14} />
                    {copiedField === 'password' ? 'Copie' : 'Copier'}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => copyToClipboard(`Email: ${createdCredentials.email}\nMot de passe: ${createdCredentials.password}`, 'both')}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Copy size={16} />
                  {copiedField === 'both' ? 'Email + mot de passe copies' : 'Copier les deux'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedCredentials(null);
                    setCopiedField(null);
                  }}
                  className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
