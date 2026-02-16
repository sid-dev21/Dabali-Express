

import React, { useState, useEffect } from 'react';

import { Mail, Lock, User, School, MapPin, ArrowRight, CheckCircle2, AlertCircle, Loader2, ShieldCheck, Utensils, ChevronLeft, Eye, EyeOff } from 'lucide-react';

import { authApi } from '../services/api';

import { UserRole } from '../types';



interface AuthProps {

  onLoginSuccess: (user: any) => void;

}



const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {

  const [isLogin, setIsLogin] = useState(true);

  const [step, setStep] = useState<'ROLE' | 'FORM'>('ROLE');

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [emailValue, setEmailValue] = useState('');

  

  // Réinitialiser l'email au changement de rôle et de mode
  useEffect(() => {
    setEmailValue('');
  }, [selectedRole, isLogin]);

  // États pour la validation en temps réel à l'inscription

  const [password, setPassword] = useState('');

  const [confirmPassword, setConfirmPassword] = useState('');



  const roles = [

    { 

      id: UserRole.SUPER_ADMIN, 

      title: 'Super Admin', 

      desc: 'Gestion nationale et pilotage des écoles.', 

      icon: <ShieldCheck size={28} />,

      color: 'bg-indigo-50 text-indigo-600 border-indigo-100'

    },

    { 

      id: UserRole.SCHOOL_ADMIN, 

      title: "Directeur d'École", 

      desc: 'Gestion des élèves, menus et abonnements.', 

      icon: <School size={28} />,

      color: 'bg-emerald-50 text-emerald-600 border-emerald-100'

    },

    { 

      id: UserRole.CANTEEN_MANAGER, 

      title: 'Gérant de Cantine', 

      desc: 'Pointage quotidien et suivi des repas.', 

      icon: <Utensils size={28} />,

      color: 'bg-amber-50 text-amber-600 border-amber-100'

    }

  ];



  const handleRoleSelect = (role: UserRole) => {

    setSelectedRole(role);

    setStep('FORM');

    setError(null);

  };



  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Utiliser les valeurs contrôlées au lieu de FormData
    const formData = new FormData(e.currentTarget);
    const email = emailValue;
    const pass = formData.get('password') as string;

    if (!email || !pass) {
      setError('Veuillez remplir tous les champs');
      setIsLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const result = await authApi.login(email, pass);
        if (result.success && result.data) {
          onLoginSuccess(result.data);
        } else {
          setError(result.message || `Identifiants incorrects. Verifiez votre email et mot de passe pour le role ${roles.find(r => r.id === selectedRole)?.title}.`);
        }
      } else {
        const confirmPass = formData.get('confirmPassword') as string;
        if (pass !== confirmPass) {
          setError("Les mots de passe ne correspondent pas.");
          setIsLoading(false);
          return;
        }

        const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pass);
        if (!strongPassword) {
          setError("Le mot de passe doit contenir au moins 8 caracteres, une majuscule, une minuscule et un chiffre.");
          setIsLoading(false);
          return;
        }

        // Inscription standard - utilise register normal
        const registerResult = await authApi.register({
          email,
          password: pass,
          role: selectedRole!,
          first_name: formData.get('firstName') as string,
          last_name: formData.get('lastName') as string,
          phone: formData.get('phone') as string,
        });

        if (!registerResult.success) {
          setError(registerResult.message || "Impossible de creer le compte.");
          setIsLoading(false);
          return;
        }

        setSuccess("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
        setIsLogin(true);
        setStep('ROLE');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setError("Une erreur technique est survenue.");
    } finally {
      setIsLoading(false);
    }
  };



  const getPasswordStrength = () => {

    if (!password) return null;

    if (password.length < 8) return { label: 'Faible', color: 'text-red-500', bg: 'bg-red-500' };

    if (password.length < 12) return { label: 'Moyen', color: 'text-amber-500', bg: 'bg-amber-500' };

    return { label: 'Fort', color: 'text-emerald-500', bg: 'bg-emerald-500' };

  };



  const strength = getPasswordStrength();



  return (

    <div className="min-h-screen app-shell flex items-center justify-center font-sans">

      <div className="flex w-full max-w-6xl h-[800px] surface-card overflow-hidden m-4 animate-in fade-in zoom-in duration-500">

        

        {/* Partie Gauche: Branding */}

        <div className="hidden lg:flex w-5/12 bg-slate-800 p-12 text-white flex-col justify-between relative overflow-hidden">

          <div className="absolute top-0 right-0 p-8 opacity-10">

            <span className="text-9xl font-black">BF</span>

          </div>

          

          <div className="relative z-10">

            <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-6 shadow-inner">

              <span className="text-3xl font-black">DX</span>

            </div>

            <h1 className="text-4xl font-black leading-tight mb-4 text-white">Dabali Express</h1>

            <p className="text-white/70 text-lg font-medium leading-relaxed">

              La plateforme de confiance pour la gestion des cantines scolaires au Burkina Faso.

            </p>

          </div>



          <div className="relative z-10 space-y-4">

             <div className="p-6 rounded-3xl bg-white/10 backdrop-blur-md border border-white/10">

                <p className="text-xs font-black uppercase tracking-widest text-emerald-200 mb-4">Sécurité des données</p>

                <div className="space-y-3">

                  <div className="flex items-center space-x-3">

                    <CheckCircle2 size={16} className="text-emerald-300" />

                    <p className="text-sm font-bold">Cryptage des accès</p>

                  </div>

                  <div className="flex items-center space-x-3">

                    <CheckCircle2 size={16} className="text-emerald-300" />

                    <p className="text-sm font-bold">Authentification par rôle</p>

                  </div>

                  <div className="flex items-center space-x-3">

                    <CheckCircle2 size={16} className="text-emerald-300" />

                    <p className="text-sm font-bold">Conformité RGPD</p>

                  </div>

                </div>

             </div>

          </div>



          <div className="flex justify-between items-center relative z-10 pt-8 border-t border-white/10 text-[10px] font-black uppercase tracking-widest text-emerald-200">

            <span>BURKINA FASO 🇧🇫</span>

            <span>Sécurisé par Dabali-Cloud</span>

          </div>

        </div>



        {/* Partie Droite: Interface */}

        <div className="w-full lg:w-7/12 p-8 md:p-16 flex flex-col bg-white overflow-y-auto custom-scrollbar">

          <div className="max-w-md mx-auto w-full">

            

            <div className="mb-10 relative">
              {isLogin && step === 'FORM' && (
                <button 
                  onClick={() => { setStep('ROLE'); setError(null); }}
                  className="absolute -left-12 top-1 p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                >
                  <ChevronLeft size={24} />
                </button>
              )}
              
              {!isLogin && (
                <button 
                  onClick={() => {
                    setIsLogin(true);
                    setStep('ROLE');
                    setSelectedRole(null);
                    setError(null);
                    setPassword('');
                    setConfirmPassword('');
                    setEmailValue('');
                  }}
                  className="absolute -left-12 top-1 p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                  title="Retour à la connexion"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              <h2 className="text-3xl font-black text-slate-800">

                {isLogin ? (step === 'ROLE' ? 'Accès Portail' : 'Identifiants') : 'Inscription École'}

              </h2>

              <p className="text-slate-500 mt-2 font-medium">

                {isLogin 

                  ? (step === 'ROLE' ? 'Choisissez votre profil de connexion.' : `Connectez-vous en tant que ${roles.find(r => r.id === selectedRole)?.title}`) 

                  : 'Créez votre compte administrateur établissement.'}

              </p>

            </div>



            {error && (

              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center space-x-3 rounded-r-xl animate-in slide-in-from-top">

                <AlertCircle size={20} className="shrink-0" />

                <span className="text-sm font-bold">{error}</span>

              </div>

            )}



            {success && (

              <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 flex items-center space-x-3 rounded-r-xl animate-in slide-in-from-top">

                <CheckCircle2 size={20} className="shrink-0" />

                <span className="text-sm font-bold">{success}</span>

              </div>

            )}



            {isLogin && step === 'ROLE' && (

              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {roles.map((role) => (

                  <button

                    key={role.id}

                    onClick={() => handleRoleSelect(role.id)}

                    className="w-full flex items-center p-5 bg-white border border-slate-200 rounded-3xl hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/5 group transition-all text-left"

                  >

                    <div className={`p-4 rounded-2xl mr-5 transition-colors ${role.color} group-hover:bg-emerald-600 group-hover:text-white`}>

                      {role.icon}

                    </div>

                    <div className="flex-1">

                      <p className="font-black text-slate-800 text-lg group-hover:text-emerald-700 transition-colors">{role.title}</p>

                      <p className="text-xs text-slate-500 font-medium leading-relaxed">{role.desc}</p>

                    </div>

                    <ArrowRight size={20} className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />

                  </button>

                ))}

              </div>

            )}



            {(step === 'FORM' || !isLogin) && (
              <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-300">
                {!isLogin && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prénom</label>
                      <input name="firstName" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 font-medium outline-none transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom</label>
                      <input name="lastName" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 font-medium outline-none transition-all" />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Professionnel</label>

                  <div className="relative">

                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />

                    <input 
                      key={`email-input-${selectedRole}`}
                      name={`email-${selectedRole?.toLowerCase() || 'default'}`} 
                      type="email" 
                      required 
                      autoComplete="new-password"
                      value={emailValue}
                      onChange={(e) => setEmailValue(e.target.value)}
                      placeholder={selectedRole === UserRole.SUPER_ADMIN ? 'admin@gmail.com' : 'nom@domaine.bf'}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 font-medium transition-all outline-none" 
                    />

                  </div>

                </div>



                <div className="space-y-1">

                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mot de passe</label>

                  <div className="relative">

                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />

                    <input 

                      name="password" 

                      type={showPassword ? "text" : "password"} 

                      required 

                      value={password}

                      onChange={(e) => setPassword(e.target.value)}

                      className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 font-medium transition-all outline-none" 

                    />

                    <button 

                      type="button"

                      onClick={() => setShowPassword(!showPassword)}

                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600"

                    >

                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}

                    </button>

                  </div>

                  

                  {!isLogin && password && (

                    <div className="mt-2">

                       <div className="flex justify-between items-center mb-1">

                          <span className="text-[9px] font-black text-slate-400 uppercase">Force :</span>

                          <span className={`text-[9px] font-black uppercase ${strength?.color}`}>{strength?.label}</span>

                       </div>

                       <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">

                          <div className={`h-full transition-all duration-500 ${strength?.bg}`} style={{ width: password.length < 6 ? '33%' : password.length < 10 ? '66%' : '100%' }}></div>

                       </div>

                    </div>

                  )}

                </div>



                {!isLogin && (

                  <div className="space-y-1">

                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirmer le mot de passe</label>

                    <div className="relative">

                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 ${confirmPassword && password !== confirmPassword ? 'text-red-400' : 'text-slate-300'}`} size={18} />

                      <input 

                        name="confirmPassword" 

                        type={showPassword ? "text" : "password"} 

                        required 

                        value={confirmPassword}

                        onChange={(e) => setConfirmPassword(e.target.value)}

                        className={`w-full pl-12 pr-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-emerald-500/20 font-medium transition-all outline-none ${

                          confirmPassword && password !== confirmPassword ? 'border-red-200 bg-red-50/30' : 'border-slate-200'

                        }`} 

                      />

                    </div>

                  </div>

                )}



                <button 

                  type="submit" 

                  disabled={isLoading}

                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-emerald-700 hover:translate-y-[-2px] active:translate-y-[0px] transition-all flex items-center justify-center space-x-3 mt-8 disabled:opacity-70 disabled:translate-y-0"

                >

                  {isLoading ? (

                    <Loader2 size={24} className="animate-spin" />

                  ) : (

                    <>

                      <span>{isLogin ? 'Connexion Sécurisée' : 'Finaliser l\'Inscription'}</span>

                      <ArrowRight size={20} />

                    </>

                  )}

                </button>

              </form>

            )}

          </div>

        </div>

      </div>

    </div>

  );

};



export default Auth;





