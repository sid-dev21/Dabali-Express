
import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Check,
  Copy,
  Edit,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserPlus,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import { schoolsApi, usersApi } from '../services/api';
import { School, User, UserRole } from '../types';

interface UsersProps {
  initialSearch?: string;
  onNavigateTab?: (tab: string) => void;
}

interface CreatedCredentials {
  email: string;
  password: string;
}

interface DeletedUserRecord {
  id: string;
  user: User;
  deletedAt: string;
  deletedBy: string;
}

type RowKind = 'active' | 'deleted';

type UserRow = {
  kind: RowKind;
  id: string;
  user: User;
  deletedAt?: string;
  deletedBy?: string;
};

const DELETED_USERS_STORAGE_KEY = 'dabali_express_deleted_users_v1';
const ITEMS_PER_PAGE = 5;

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: UserRole.SUPER_ADMIN, label: 'SUPER_ADMIN' },
  { value: UserRole.SCHOOL_ADMIN, label: 'SCHOOL_ADMIN' },
  { value: UserRole.CANTEEN_MANAGER, label: 'CANTEEN_MANAGER' },
  { value: UserRole.PARENT, label: 'PARENT' },
];

const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean);
  if (!parts.length) return 'NA';
  return parts.map((word) => word[0]).join('').toUpperCase().slice(0, 2);
};

const parseName = (fullName: string) => {
  const parts = fullName.trim().split(' ').filter(Boolean);
  const first_name = parts[0] || '';
  const last_name = parts.slice(1).join(' ') || first_name;
  return { first_name, last_name };
};

const toRoleLabel = (role: UserRole): string => role.replace('_', ' ');

const toRelativeTime = (value?: string): string => {
  if (!value) return 'Donnees indisponibles';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Donnees indisponibles';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Maintenant';
  if (minutes < 60) return `Il y a ${minutes}min`;
  if (hours < 24) return `Il y a ${hours}h`;
  return `Il y a ${days}j`;
};

const getRoleBadgeClass = (role: UserRole): string => {
  if (role === UserRole.SUPER_ADMIN) return 'bg-slate-100 text-slate-700 border-slate-200';
  if (role === UserRole.SCHOOL_ADMIN) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (role === UserRole.CANTEEN_MANAGER) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
};

const getStatusBadgeClass = (kind: RowKind, status: User['status']): string => {
  if (kind === 'deleted') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (status === 'blocked') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
};

const Users: React.FC<UsersProps> = ({ initialSearch = '', onNavigateTab }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<DeletedUserRecord[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [draftRole, setDraftRole] = useState<UserRole>(UserRole.PARENT);

  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<'email' | 'password' | 'both' | null>(null);

  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [schoolFilter, setSchoolFilter] = useState<'all' | string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked' | 'deleted'>('all');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = async () => {
    try {
      const [usersData, schoolsData] = await Promise.all([
        usersApi.getUsers(),
        schoolsApi.getSchools(),
      ]);
      setUsers(usersData || []);
      setSchools(schoolsData || []);
    } catch (error) {
      console.error('Erreur lors du chargement des donnees:', error);
      setUsers([]);
      setSchools([]);
    }
  };

  useEffect(() => {
    loadData();
    try {
      const raw = localStorage.getItem(DELETED_USERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DeletedUserRecord[];
        setDeletedUsers(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setDeletedUsers([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(deletedUsers));
  }, [deletedUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, schoolFilter, statusFilter, includeDeleted, searchQuery]);

  const schoolNameById = useMemo(() => {
    const map = new Map<string, string>();
    schools.forEach((school) => {
      map.set(school.id, school.name);
    });
    return map;
  }, [schools]);

  const normalizedUsers = useMemo(() => {
    return users.map((user) => ({
      ...user,
      schoolName: user.schoolName || (user.schoolId ? schoolNameById.get(user.schoolId) : undefined) || '-',
    }));
  }, [users, schoolNameById]);

  const userRows = useMemo<UserRow[]>(() => {
    const activeRows: UserRow[] = normalizedUsers.map((user) => ({ kind: 'active', id: user.id, user }));
    const deletedRows: UserRow[] = includeDeleted
      ? deletedUsers.map((item) => ({ kind: 'deleted', id: item.id, user: item.user, deletedAt: item.deletedAt, deletedBy: item.deletedBy }))
      : [];

    return [...activeRows, ...deletedRows];
  }, [normalizedUsers, deletedUsers, includeDeleted]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return userRows.filter((row) => {
      const matchRole = roleFilter === 'all' || row.user.role === roleFilter;
      const matchSchool = schoolFilter === 'all' || (row.user.schoolId || '-') === schoolFilter;

      const computedStatus = row.kind === 'deleted' ? 'deleted' : (row.user.status === 'blocked' ? 'blocked' : 'active');
      const matchStatus = statusFilter === 'all' || computedStatus === statusFilter;

      const schoolLabel = row.user.schoolName || (row.user.schoolId ? schoolNameById.get(row.user.schoolId) : '-') || '-';
      const matchSearch = !query
        || row.user.name.toLowerCase().includes(query)
        || row.user.email.toLowerCase().includes(query)
        || row.user.role.toLowerCase().includes(query)
        || schoolLabel.toLowerCase().includes(query);

      return matchRole && matchSchool && matchStatus && matchSearch;
    });
  }, [userRows, roleFilter, schoolFilter, statusFilter, searchQuery, schoolNameById]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = filteredRows.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const roleStats = useMemo(() => {
    const source = includeDeleted
      ? [...normalizedUsers, ...deletedUsers.map((item) => item.user)]
      : normalizedUsers;

    const countByRole = source.reduce<Record<UserRole, number>>((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {
      [UserRole.SUPER_ADMIN]: 0,
      [UserRole.SCHOOL_ADMIN]: 0,
      [UserRole.CANTEEN_MANAGER]: 0,
      [UserRole.PARENT]: 0,
    } as Record<UserRole, number>);

    return {
      superAdmins: countByRole[UserRole.SUPER_ADMIN],
      schoolAdmins: countByRole[UserRole.SCHOOL_ADMIN],
      canteenManagers: countByRole[UserRole.CANTEEN_MANAGER],
      parents: countByRole[UserRole.PARENT],
      total: source.length,
    };
  }, [normalizedUsers, deletedUsers, includeDeleted]);

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setDraftRole(user.role);
    setIsModalOpen(true);
  };

  const handleOpenCreate = (role: UserRole = UserRole.PARENT) => {
    setEditingUser(null);
    setDraftRole(role);
    setIsModalOpen(true);
  };

  const copyToClipboard = async (value: string, field: 'email' | 'password' | 'both') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
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

      const deletedRecord: DeletedUserRecord = {
        id: `deleted-${user.id}-${Date.now()}`,
        user,
        deletedAt: new Date().toISOString(),
        deletedBy: 'Super Admin',
      };

      setDeletedUsers((prev) => [deletedRecord, ...prev]);
      setUsers((prev) => prev.filter((current) => current.id !== user.id));
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      alert(error?.message || 'Erreur lors de la suppression.');
    }
  };

  const handleRestoreUser = async (record: DeletedUserRecord) => {
    const confirmed = window.confirm(`Restaurer l'utilisateur ${record.user.name} ?`);
    if (!confirmed) return;

    const { first_name, last_name } = parseName(record.user.name || 'Utilisateur');

    try {
      const restored = await usersApi.createUser({
        first_name,
        last_name,
        email: record.user.email || undefined,
        role: record.user.role,
        school_id: (record.user.role === UserRole.SCHOOL_ADMIN || record.user.role === UserRole.CANTEEN_MANAGER)
          ? record.user.schoolId
          : undefined,
      });

      if (!restored?.user) {
        alert('Restauration impossible.');
        return;
      }

      setDeletedUsers((prev) => prev.filter((item) => item.id !== record.id));
      await loadData();

      if (restored.temporary_password) {
        setCreatedCredentials({
          email: restored.user.email,
          password: restored.temporary_password,
        });
      }
    } catch (error: any) {
      console.error('Erreur lors de la restauration:', error);
      alert(error?.message || 'Erreur lors de la restauration.');
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="surface-card p-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <UsersIcon size={12} /> Gestion des utilisateurs
        </div>
        <h2 className="section-title">Gestion des Utilisateurs</h2>
      </div>

      <div className="surface-card p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[190px_220px_180px_1fr_auto] lg:items-center">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <option value="all">Tous roles</option>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <option value="all">Ecole</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>{school.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'blocked' | 'deleted')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <option value="all">Statut</option>
            <option value="active">Actif</option>
            <option value="blocked">Bloque</option>
            <option value="deleted">Supprime</option>
          </select>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
            />
          </div>

          <button onClick={() => handleOpenCreate()} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-bold">
            <Plus size={16} /> Nouvel user
          </button>
        </div>

        <label className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          Afficher les utilisateurs supprimes
        </label>
      </div>

      <div className="surface-card p-5">
        <p className="text-sm font-semibold text-slate-600">
          Super Admins : <strong className="text-slate-800">{roleStats.superAdmins}</strong>
          <span className="mx-2">|</span>
          School Admins : <strong className="text-slate-800">{roleStats.schoolAdmins}</strong>
          <span className="mx-2">|</span>
          Canteen Managers : <strong className="text-slate-800">{roleStats.canteenManagers}</strong>
          <span className="mx-2">|</span>
          Parents : <strong className="text-slate-800">{roleStats.parents}</strong>
          <span className="mx-2">|</span>
          Total : <strong className="text-slate-900">{roleStats.total}</strong>
        </p>
      </div>

      <div className="surface-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="section-title">Liste des Utilisateurs</h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Affichage {paginatedRows.length} sur {filteredRows.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Ecole</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginatedRows.length > 0 ? paginatedRows.map((row) => {
                const schoolLabel = row.user.schoolName || (row.user.schoolId ? schoolNameById.get(row.user.schoolId) : '-') || '-';
                const statusLabel = row.kind === 'deleted'
                  ? 'Supprime'
                  : row.user.status === 'blocked'
                    ? 'Bloque'
                    : 'Actif';

                return (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-[10px] font-black text-white">
                          {getInitials(row.user.name)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{row.user.name}</p>
                          <p className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${getStatusBadgeClass(row.kind, row.user.status)}`}>
                            {statusLabel}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {row.kind === 'deleted'
                              ? `Supprime le: ${row.deletedAt ? new Date(row.deletedAt).toLocaleDateString('fr-FR') : '--'} par ${row.deletedBy || '--'}`
                              : `Derniere connexion: ${toRelativeTime(row.user.createdAt)}`}
                          </p>
                          {row.user.role === UserRole.PARENT && row.kind === 'active' && (
                            <p className="text-[11px] font-semibold text-slate-500">{row.user.childrenCount || 0} enfant(s)</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600 font-semibold">{row.user.email || '--'}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${getRoleBadgeClass(row.user.role)}`}>
                        {toRoleLabel(row.user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600 font-semibold">{schoolLabel}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {row.kind === 'deleted' ? (
                          <button
                            onClick={() => handleRestoreUser({ id: row.id, user: row.user, deletedAt: row.deletedAt || new Date().toISOString(), deletedBy: row.deletedBy || 'Super Admin' })}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-700 hover:bg-emerald-100 inline-flex items-center gap-1"
                          >
                            <RotateCcw size={12} /> Restaurer
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenEdit(row.user)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1"
                            >
                              <Edit size={12} /> Modifier
                            </button>
                            <button
                              onClick={() => handleDeleteUser(row.user)}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-rose-700 hover:bg-rose-100 inline-flex items-center gap-1"
                            >
                              <Trash2 size={12} /> Supprimer
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center text-slate-400 font-semibold">Aucun utilisateur trouve.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredRows.length > ITEMS_PER_PAGE && (
          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-9 w-9 rounded-lg border text-sm font-black ${page === safePage ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  {page}
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-slate-500">Page {safePage} / {totalPages}</p>
          </div>
        )}
      </div>

      <div className="surface-card p-5">
        <h3 className="section-title">Actions rapides</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <button onClick={() => handleOpenCreate(UserRole.SCHOOL_ADMIN)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"><UserPlus size={14} /> Creer School Admin</button>
          <button onClick={() => handleOpenCreate(UserRole.CANTEEN_MANAGER)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"><UserPlus size={14} /> Creer Canteen Manager</button>
          <button onClick={() => onNavigateTab?.('dashboard')} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"><BarChart3 size={14} /> Statistiques</button>
          <button onClick={() => { setIncludeDeleted(true); setStatusFilter('deleted'); }} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"><Trash2 size={14} /> Utilisateurs supprimes ({deletedUsers.length})</button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-emerald-600 text-white">
              <h3 className="font-black text-2xl">{editingUser ? 'Modifier compte' : 'Nouveau compte'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:rotate-90 transition-transform"><X size={24} /></button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom complet</label>
                <input name="name" required defaultValue={editingUser?.name || ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 font-medium" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                <input name="email" type="email" required={editingUser ? true : draftRole !== UserRole.SCHOOL_ADMIN} defaultValue={editingUser?.email || ''} placeholder={!editingUser && draftRole === UserRole.SCHOOL_ADMIN ? 'Laisser vide pour generation automatique' : ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 font-medium" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</label>
                  <select name="role" required value={draftRole} onChange={(e) => setDraftRole(e.target.value as UserRole)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl bg-white font-medium">
                    {editingUser?.role === UserRole.SUPER_ADMIN ? (
                      <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                    ) : (
                      <>
                        <option value={UserRole.SCHOOL_ADMIN}>School Admin</option>
                        <option value={UserRole.CANTEEN_MANAGER}>Canteen Manager</option>
                        <option value={UserRole.PARENT}>Parent</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ecole</label>
                  <select name="schoolId" defaultValue={editingUser?.schoolId || ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl bg-white font-medium">
                    <option value="">Aucune</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>{school.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-colors">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-black shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2"><Check size={20} /><span>Enregistrer</span></button>
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
              <button onClick={() => { setCreatedCredentials(null); setCopiedField(null); }} className="hover:rotate-90 transition-transform"><X size={24} /></button>
            </div>

            <div className="p-8 space-y-5">
              <p className="text-sm text-slate-600 font-medium">Copiez ces informations pour les envoyer a la personne qui va se connecter.</p>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="text-sm font-bold text-slate-700 break-all">{createdCredentials.email}</p>
                  <button type="button" onClick={() => copyToClipboard(createdCredentials.email, 'email')} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-2"><Copy size={14} />{copiedField === 'email' ? 'Copie' : 'Copier'}</button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mot de passe temporaire</label>
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="text-sm font-bold text-slate-700 break-all">{createdCredentials.password}</p>
                  <button type="button" onClick={() => copyToClipboard(createdCredentials.password, 'password')} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-2"><Copy size={14} />{copiedField === 'password' ? 'Copie' : 'Copier'}</button>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => copyToClipboard(`Email: ${createdCredentials.email}\nMot de passe: ${createdCredentials.password}`, 'both')} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"><Copy size={16} />{copiedField === 'both' ? 'Email + mot de passe copies' : 'Copier les deux'}</button>
                <button type="button" onClick={() => { setCreatedCredentials(null); setCopiedField(null); }} className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 transition-colors">Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
