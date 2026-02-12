
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Info, Bell, DollarSign, ShieldCheck, User as UserIcon, Mail, RefreshCw, CheckCircle2, MessageSquare, Phone, ExternalLink, Trash2 } from 'lucide-react';
import { authApi } from '../services/api';
import { SystemSettings, User, UserRole } from '../types';

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
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [profileData, setProfileData] = useState<Partial<User>>({
    name: currentUser.name,
    email: currentUser.email,
    avatar: currentUser.avatar
  });
  const [isSavingSystem, setIsSavingSystem] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;

  useEffect(() => {
    if (isSuperAdmin) {
      // Simulation des paramètres système (à remplacer par un vrai appel API)
      setSystemSettings({
        systemName: 'Dabali Express',
        systemEmail: 'contact@dabali.bf',
        systemPhone: '+226 00 00 00 00',
        autoBackup: true,
        notificationEmails: true,
        maintenanceMode: false,
        maxUsersPerSchool: 500,
        subscriptionPrice: 2500,
        trialPeriodDays: 14
      });
    }
  }, [isSuperAdmin]);

  const handleSaveSystem = () => {
    if (!systemSettings) return;
    setIsSavingSystem(true);
    // Simulation de sauvegarde (à remplacer par un vrai appel API)
    setTimeout(() => {
      setIsSavingSystem(false);
      setSuccessMsg("Configuration système mise à jour !");
      setTimeout(() => setSuccessMsg(null), 3000);
    }, 800);
  };

  const handleSaveProfile = () => {
    setIsSavingProfile(true);
    const updatedUser = { ...currentUser, ...profileData } as User;
    
    // Simulation de mise à jour (à remplacer par un vrai appel API)
    onUserUpdate(updatedUser);
    
    const storedUser = localStorage.getItem('dabali_current_user');
    if (storedUser) {
      localStorage.setItem('dabali_current_user', JSON.stringify(updatedUser));
    }

    setTimeout(() => {
      setIsSavingProfile(false);
      setSuccessMsg("Votre profil a été mis à jour avec succès !");
      setTimeout(() => setSuccessMsg(null), 3000);
    }, 800);
  };

  const regenerateAvatar = () => {
    const newAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`;
    setProfileData({ ...profileData, avatar: newAvatar });
  };

  const clearAvatar = () => {
    setProfileData({ ...profileData, avatar: '' });
  };

  const contactWhatsApp = () => {
    const phone = "22670000000"; // Numéro de support fictif Burkina Faso
    const message = `Bonjour l'équipe Dabali Express, je suis ${currentUser.name} de l'école ${currentUser.schoolName || 'Administration'}. J'ai besoin d'une assistance technique sur la plateforme.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Paramètres du Compte</h2>
          <p className="text-sm text-slate-500 font-medium">Gérez vos informations personnelles {isSuperAdmin && "et la configuration système"}.</p>
        </div>
        {successMsg && (
          <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 animate-in slide-in-from-top-2">
            <CheckCircle2 size={16} />
            <span className="text-xs font-bold uppercase tracking-tight">{successMsg}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Section Mon Profil */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8">
          <div className="flex items-center space-x-3 text-slate-800 border-b border-slate-50 pb-6">
            <div className="p-3 bg-slate-100 rounded-2xl text-slate-600">
              <UserIcon size={24} />
            </div>
            <div>
              <h3 className="font-black text-lg">Mon Profil Personnel</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Identité & Accès</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center py-4 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <div className="relative group">
              {profileData.avatar ? (
                <img 
                  src={profileData.avatar} 
                  alt="Profile Avatar" 
                  className="w-24 h-24 rounded-3xl object-cover shadow-xl ring-4 ring-white" 
                />
              ) : (
                <div className="w-24 h-24 rounded-3xl bg-emerald-600 shadow-xl ring-4 ring-white flex items-center justify-center text-3xl font-black text-white">
                  {getInitials(profileData.name || currentUser.name)}
                </div>
              )}
              
              <div className="absolute -bottom-2 -right-2 flex space-x-1">
                <button 
                  onClick={regenerateAvatar}
                  className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg hover:scale-110 transition-transform"
                  title="Changer de style"
                >
                  <RefreshCw size={14} />
                </button>
                {profileData.avatar && (
                  <button 
                    onClick={clearAvatar}
                    className="p-2 bg-red-500 text-white rounded-xl shadow-lg hover:scale-110 transition-transform"
                    title="Revenir aux initiales"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
            <p className="mt-4 text-[10px] text-slate-400 font-black uppercase tracking-widest">
              {profileData.avatar ? 'Avatar personnalisé' : 'Initiales de base Dabali'}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom Complet</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-700 outline-none" 
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email de Connexion</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="email" 
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-700 outline-none" 
                />
              </div>
            </div>
            <div className="pt-4">
               <button 
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="w-full flex items-center justify-center space-x-2 bg-slate-800 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-slate-900 transition-all disabled:opacity-50 uppercase text-xs tracking-widest"
              >
                {isSavingProfile ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                <span>{isSavingProfile ? 'Enregistrement...' : 'Mettre à jour mon profil'}</span>
              </button>
            </div>
          </div>
        </div>

        {isSuperAdmin ? (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
              <div className="flex items-center space-x-3 text-emerald-600 border-b border-slate-50 pb-6">
                <div className="p-3 bg-emerald-50 rounded-2xl">
                  <DollarSign size={24} />
                </div>
                <div>
                  <h3 className="font-black text-lg">Grille Tarifaire (FCFA)</h3>
                  <p className="text-[10px] text-emerald-500/60 font-bold uppercase tracking-widest">Base nationale</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tarif Journalier Standard</label>
                  <input 
                    type="number" 
                    value={systemSettings?.dailyRate}
                    onChange={(e) => setSystemSettings(systemSettings ? {...systemSettings, dailyRate: parseInt(e.target.value)} : null)}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-700 outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Forfait Mensuel Standard</label>
                  <input 
                    type="number" 
                    value={systemSettings?.monthlyRate}
                    onChange={(e) => setSystemSettings(systemSettings ? {...systemSettings, monthlyRate: parseInt(e.target.value)} : null)}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-700 outline-none" 
                  />
                </div>
              </div>
            </div>
            <button 
                onClick={handleSaveSystem}
                disabled={isSavingSystem}
                className="w-full flex items-center justify-center space-x-2 bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-50 uppercase text-xs tracking-widest"
              >
                {isSavingSystem ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                <span>{isSavingSystem ? 'Enregistrement...' : 'Sauvegarder Configuration'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              
              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20">
                    <MessageSquare size={32} />
                  </div>
                  <span className="text-[10px] font-black bg-emerald-500 text-white px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
                    En ligne 24h/7
                  </span>
                </div>
                
                <div>
                  <h4 className="text-2xl font-black tracking-tight">Support Technique</h4>
                  <p className="text-blue-100 mt-2 font-medium leading-relaxed">
                    Besoin d'aide pour configurer votre établissement, ajouter des élèves ou un problème d'accès ? L'équipe Dabali Express vous répond en direct.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-4">
                  <button 
                    onClick={contactWhatsApp}
                    className="w-full flex items-center justify-center space-x-3 bg-white text-blue-600 py-4 rounded-2xl font-black shadow-xl hover:bg-blue-50 transition-all uppercase text-xs tracking-[0.1em]"
                  >
                    <ExternalLink size={18} />
                    <span>Ouvrir WhatsApp Support</span>
                  </button>
                  
                  <div className="flex space-x-3">
                    <a 
                      href="tel:+22670000000"
                      className="flex-1 flex items-center justify-center space-x-2 bg-blue-500/40 border border-white/20 py-3 rounded-2xl font-bold text-xs hover:bg-blue-500/60 transition-all"
                    >
                      <Phone size={14} />
                      <span>Appeler</span>
                    </a>
                    <a 
                      href="mailto:support@dabali.bf"
                      className="flex-1 flex items-center justify-center space-x-2 bg-blue-500/40 border border-white/20 py-3 rounded-2xl font-bold text-xs hover:bg-blue-500/60 transition-all"
                    >
                      <Mail size={14} />
                      <span>Email</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100 flex items-start space-x-5">
              <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl shadow-inner">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h4 className="font-black text-amber-900 text-lg">Conseils de Sécurité</h4>
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-amber-800 font-bold opacity-80 leading-relaxed">
                    • Ne partagez jamais vos identifiants à des tiers.<br/>
                    • Déconnectez-vous systématiquement sur les ordinateurs partagés.<br/>
                    • Changez votre mot de passe régulièrement via le support technique.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
