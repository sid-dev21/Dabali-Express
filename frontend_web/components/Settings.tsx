
import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, ShieldCheck, User as UserIcon, Mail, RefreshCw, CheckCircle2, Trash2, Eye, EyeOff } from 'lucide-react';
import { User, UserRole } from '../types';
import { authApi } from '../services/api';

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

interface SettingsProps {
  currentUser: User;
  onUserUpdate: (user: User) => void;
}

const Settings: React.FC<SettingsProps> = ({ currentUser, onUserUpdate }) => {
  const [profileData, setProfileData] = useState<Partial<User>>({
    name: currentUser.name,
    email: currentUser.email,
    avatar: currentUser.avatar
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const [securityData, setSecurityData] = useState({
    newEmail: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false,
  });


  const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;
  const headerSubtitle = isSuperAdmin
    ? 'Gérez votre compte et la sécurité d’accès.'
    : 'Gérez votre profil et la sécurité de votre compte.';

  const handleSaveProfile = () => {
    setIsSavingProfile(true);
    const updatedUser = { ...currentUser, ...profileData, email: currentUser.email } as User;
    
    // Simulation de mise à jour (à remplacer par un vrai appel API)
    onUserUpdate(updatedUser);
    
    const storedUser = localStorage.getItem('current_user');
    if (storedUser) {
      try {
        const parsedStoredUser = JSON.parse(storedUser);
        localStorage.setItem('current_user', JSON.stringify({ ...parsedStoredUser, ...updatedUser }));
      } catch {
        localStorage.setItem('current_user', JSON.stringify(updatedUser));
      }
    }

    setTimeout(() => {
      setIsSavingProfile(false);
      setSuccessMsg("Votre profil a été mis à jour avec succès !");
      setTimeout(() => setSuccessMsg(null), 3000);
    }, 800);
  };

  const handleSaveSecurity = async () => {
    const normalizedNewEmail = securityData.newEmail.trim().toLowerCase();
    const wantsEmailChange = normalizedNewEmail.length > 0;
    const wantsPasswordChange = !!securityData.newPassword || !!securityData.confirmPassword;

    if (!wantsEmailChange && !wantsPasswordChange) {
      setSuccessMsg('Ajoutez un nouvel email et/ou un nouveau mot de passe.');
      setTimeout(() => setSuccessMsg(null), 3000);
      return;
    }

    if (!securityData.currentPassword) {
      setSuccessMsg('Le mot de passe actuel est requis.');
      setTimeout(() => setSuccessMsg(null), 3000);
      return;
    }

    if (wantsPasswordChange && securityData.newPassword !== securityData.confirmPassword) {
      setSuccessMsg('Les mots de passe ne correspondent pas.');
      setTimeout(() => setSuccessMsg(null), 3000);
      return;
    }

    setIsSavingSecurity(true);
    const result = await authApi.updateCredentials({
      currentPassword: securityData.currentPassword,
      ...(wantsEmailChange ? { newEmail: normalizedNewEmail } : {}),
      ...(wantsPasswordChange ? { newPassword: securityData.newPassword, confirmNewPassword: securityData.confirmPassword } : {}),
    });
    setIsSavingSecurity(false);

    if (!result.success || !result.data) {
      setSuccessMsg(result.message || 'Erreur lors de la mise à jour.');
      setTimeout(() => setSuccessMsg(null), 3000);
      return;
    }

    const mergedUser: User = {
      ...currentUser,
      ...result.data,
      avatar: currentUser.avatar || result.data.avatar,
    };
    onUserUpdate(mergedUser);
    setProfileData(prev => ({ ...prev, email: mergedUser.email }));
    setSecurityData(prev => ({
      ...prev,
      newEmail: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }));
    setSuccessMsg(result.message || 'Paramètres de sécurité mis à jour.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const regenerateAvatar = () => {
    const newAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`;
    setProfileData({ ...profileData, avatar: newAvatar });
  };

  const clearAvatar = () => {
    setProfileData({ ...profileData, avatar: '' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <SettingsIcon size={12} />
              Paramètres
            </div>
            <h2 className="text-2xl font-black text-slate-900">Paramètres du compte</h2>
            <p className="mt-2 text-sm text-slate-500">{headerSubtitle}</p>
          </div>
          {successMsg && (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700">
              <CheckCircle2 size={14} />
              {successMsg}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <UserIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Profil & sécurité</h3>
              <p className="text-xs text-slate-500">Gérez vos informations et vos accès.</p>
            </div>
          </div>
          <div className="space-y-6">

              <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {profileData.avatar ? (
                    <img
                      src={profileData.avatar}
                      alt="Profile Avatar"
                      className="h-16 w-16 rounded-2xl object-cover shadow-sm ring-2 ring-white"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-bold">
                      {getInitials(profileData.name || currentUser.name)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{profileData.name || currentUser.name}</p>
                    <p className="text-xs text-slate-500">{profileData.email || currentUser.email}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">
                      {profileData.avatar ? 'Avatar personnalisé' : 'Initiales par défaut'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={regenerateAvatar}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                    title="Changer de style"
                  >
                    <RefreshCw size={14} />
                    Régénérer
                  </button>
                  {profileData.avatar && (
                    <button
                      onClick={clearAvatar}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
                      title="Revenir aux initiales"
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 ml-1">Nom complet</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-200 focus:border-slate-300 transition-all text-sm font-medium text-slate-700 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 ml-1">Email de connexion</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="email"
                      value={profileData.email}
                      readOnly
                      className="w-full pl-12 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 outline-none cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 ml-1">Pour modifier l email, utilisez la section Sécurité.</p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="w-full flex items-center justify-center space-x-2 rounded-xl bg-slate-900 text-white py-3 text-sm font-semibold hover:bg-slate-800 transition-all disabled:opacity-50"
                  >
                    {isSavingProfile ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                    <span>{isSavingProfile ? 'Enregistrement...' : 'Mettre à jour mon profil'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Sécurité</h3>
                  <p className="text-xs text-slate-500">Mot de passe & accès</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type="email"
                    placeholder="Nouvel email (optionnel)"
                    value={securityData.newEmail}
                    onChange={(e) => setSecurityData({ ...securityData, newEmail: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-200 focus:border-slate-300 transition-all text-sm font-medium text-slate-700 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => !prev)}
                  className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showPasswords ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
                </button>
                <div className="relative">
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    placeholder="Mot de passe actuel"
                    value={securityData.currentPassword}
                    onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-200 focus:border-slate-300 transition-all text-sm font-medium text-slate-700 outline-none"
                  />
                </div>
                <div className="relative">
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    placeholder="Nouveau mot de passe"
                    value={securityData.newPassword}
                    onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-200 focus:border-slate-300 transition-all text-sm font-medium text-slate-700 outline-none"
                  />
                </div>
                <div className="relative">
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    placeholder="Confirmer le mot de passe"
                    value={securityData.confirmPassword}
                    onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-200 focus:border-slate-300 transition-all text-sm font-medium text-slate-700 outline-none"
                  />
                </div>
              </div>
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Activer la double authentification
                <input
                  type="checkbox"
                  checked={securityData.twoFactorEnabled}
                  onChange={(e) => setSecurityData({ ...securityData, twoFactorEnabled: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900"
                />
              </label>
              <button
                onClick={handleSaveSecurity}
                disabled={isSavingSecurity}
                className="w-full flex items-center justify-center space-x-2 rounded-xl bg-slate-900 text-white py-3 text-sm font-semibold hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {isSavingSecurity ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                <span>{isSavingSecurity ? 'Enregistrement...' : 'Mettre à jour la sécurité'}</span>
              </button>
            </div>

          </div>
        </div>
    </div>
  );
};

export default Settings;

