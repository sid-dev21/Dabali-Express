import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Student, School, Payment } from './types';
import { authApi, studentsApi, schoolsApi, paymentsApi } from './services/api';
import { getInitials } from './utils/helpers';

import Sidebar from './components/Sidebar';

import Dashboard from './components/Dashboard';

import Students from './components/Students';

import Attendance from './components/Attendance';

import Menus from './components/Menus';

import Schools from './components/Schools';

import Payments from './components/Payments';

import Users from './components/Users';

import Settings from './components/Settings';

import Subscriptions from './components/Subscriptions';

import CanteenManagers from './components/CanteenManagers';

import Auth from './components/Auth';

import { Menu, Bell, BellOff, Search, X, User as UserIcon, School as SchoolIcon, CreditCard, ArrowRight, CheckCircle2, Info } from 'lucide-react';



const App: React.FC = () => {

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [activeTab, setActiveTab] = useState('dashboard');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [globalSearch, setGlobalSearch] = useState('');

  const [showSearchResults, setShowSearchResults] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const [toast, setToast] = useState<{message: string, visible: boolean, type: 'success' | 'info'}>({

    message: '', 

    visible: false, 

    type: 'success'

  });

  const [searchResults, setSearchResults] = useState<{
    students: Student[];
    schools: School[];
    payments: Payment[];
  }>({ students: [], schools: [], payments: [] });
  

  const searchRef = useRef<HTMLDivElement>(null);



  // Chargement initial de l'utilisateur (seulement si pas déjà connecté)
  useEffect(() => {
    if (currentUser) return; // ❌ Ne pas charger si déjà connecté

    const loadUser = async () => {
      const user = await authApi.getCurrentUser();
      if (user) setCurrentUser(user);
      setIsInitialLoad(false);
    };

    loadUser();
  }, [currentUser]); // ✅ Dépendance ajoutée



  // Gestion du clic en dehors de la recherche

  useEffect(() => {

    const handleClickOutside = (event: MouseEvent) => {

      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {

        setShowSearchResults(false);

      }

    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);

  }, []);



  // Recherche globale

  useEffect(() => {
    let cancelled = false;

    const performSearch = async () => {
      if (!globalSearch || globalSearch.length < 2 || !currentUser) {
        setSearchResults({ students: [], schools: [], payments: [] });
        return;
      }


      const term = globalSearch.toLowerCase();

      const schoolId = currentUser.schoolId;



      try {

        const [allStudents, allSchools, allPayments] = await Promise.all([

          studentsApi.getStudents(schoolId),

          schoolsApi.getSchools(),

          paymentsApi.getPayments(schoolId),

        ]);



        if (cancelled) return;

        setSearchResults({
          students: allStudents
            .filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(term))
            .slice(0, 5),
          schools: currentUser.role === UserRole.SUPER_ADMIN

            ? allSchools.filter(s => s.name.toLowerCase().includes(term)).slice(0, 3)

            : [],

          payments: allPayments

            .filter(p => p.studentName?.toLowerCase().includes(term))

            .slice(0, 3),

        });

      } catch (error) {
        if (!cancelled) {
          console.error('Search error:', error);
          setSearchResults({ students: [], schools: [], payments: [] });
        }
      }
    };

    performSearch();

    return () => { cancelled = true; };
  }, [globalSearch, currentUser]);


  const handleLoginSuccess = (user: User) => {
    // ✅ Forcer la mise à jour de l'état
    setCurrentUser(user);
    setActiveTab('dashboard');
    setIsInitialLoad(false); // ✅ Arrêter le chargement initial
  };


  const handleLogout = () => {
    // ✅ Nettoyer complètement l'état
    authApi.logout();
    setCurrentUser(null);
    setActiveTab('dashboard');
    setGlobalSearch('');
    setIsInitialLoad(false); // ✅ Réinitialiser l'état de chargement
  };



  const toggleNotifications = () => {

    const newState = !notificationsEnabled;

    setNotificationsEnabled(newState);

    

    let msg = '';

    if (newState) {

      switch(currentUser?.role) {

        case UserRole.SUPER_ADMIN: 

          msg = "Monitoring national activé."; 

          break;

        case UserRole.SCHOOL_ADMIN: 

          msg = "Alertes école activées."; 

          break;

        case UserRole.CANTEEN_MANAGER: 

          msg = "Suivi cantine opérationnel."; 

          break;

        default: 

          msg = "Notifications activées.";

      }

      setToast({ message: msg, visible: true, type: 'success' });

    } else {

      msg = "Notifications suspendues pour cette session.";

      setToast({ message: msg, visible: true, type: 'info' });

    }

    

    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);

  };



  const hasResults = searchResults.students.length > 0 || 

                     searchResults.schools.length > 0 || 

                     searchResults.payments.length > 0;



  const renderContent = () => {

    const commonProps = {

      schoolId: currentUser?.schoolId,

      userRole: currentUser?.role || UserRole.CANTEEN_MANAGER,

      initialSearch: globalSearch

    };



    switch (activeTab) {

      case 'dashboard': return <Dashboard searchQuery={globalSearch} userRole={currentUser!.role} schoolId={currentUser?.schoolId} />;

      case 'students': return <Students {...commonProps} />;

      case 'subscriptions': return <Subscriptions {...commonProps} />;

      case 'attendance': return <Attendance {...commonProps} />;

      case 'menus': return <Menus schoolId={currentUser?.schoolId} initialSearch={globalSearch} />;

      case 'schools': return <Schools initialSearch={globalSearch} />;

      case 'payments': return <Payments schoolId={currentUser?.schoolId} initialSearch={globalSearch} />;

      case 'users': return <Users initialSearch={globalSearch} />;

      case 'canteen-managers': return <CanteenManagers initialSearch={globalSearch} />;

      case 'settings': return <Settings currentUser={currentUser!} onUserUpdate={setCurrentUser} />;

      default: return null;

    }

  };



  if (isInitialLoad) return null;

  if (!currentUser) return <Auth onLoginSuccess={handleLoginSuccess} />;

  // Forcer la mise à jour du currentUser avec schoolId si manquant
  if (currentUser && !currentUser.schoolId) {
    const updateUserWithSchool = async () => {
      try {
        const freshUser = await authApi.getCurrentUser();
        if (freshUser && freshUser.schoolId) {
          setCurrentUser(freshUser);
        }
      } catch (error) {
        console.error('Error updating user with school info:', error);
      }
    };
    updateUserWithSchool();
  }



  return (

    <div className="flex min-h-screen bg-slate-50 font-sans selection:bg-emerald-100 selection:text-emerald-900">

      <Sidebar 

        activeTab={activeTab} 

        setActiveTab={(tab) => { setActiveTab(tab); setGlobalSearch(''); }} 

        userRole={currentUser.role} 

        onLogout={handleLogout}

        isOpen={isSidebarOpen}

        setIsOpen={setIsSidebarOpen}

      />

      

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md h-16 border-b border-slate-100 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">

          <div className="flex items-center space-x-4 flex-1">

            <button 

              onClick={() => setIsSidebarOpen(true)}

              className="p-2 -ml-2 text-slate-600 lg:hidden hover:bg-slate-50 rounded-lg"

            >

              <Menu size={24} />

            </button>



            <div ref={searchRef} className="relative hidden md:block w-full max-w-xl">

              <div className={`flex items-center transition-all duration-300 ${globalSearch ? 'ring-2 ring-emerald-500/20 bg-white shadow-lg' : 'bg-slate-100/60'} px-4 py-2.5 rounded-2xl border border-slate-200/50`}>

                <Search size={18} className={`${globalSearch ? 'text-emerald-600' : 'text-slate-400'} mr-2`} />

                <input 

                  type="text" 

                  placeholder="Recherche rapide (élève, école, paiement)..." 

                  className="bg-transparent border-none text-sm focus:ring-0 p-0 w-full font-medium placeholder:text-slate-400" 

                  value={globalSearch}

                  onChange={(e) => {

                    setGlobalSearch(e.target.value);

                    setShowSearchResults(true);

                  }}

                  onFocus={() => setShowSearchResults(true)}

                />

              </div>



              {showSearchResults && globalSearch.length >= 2 && (

                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[400px] overflow-y-auto custom-scrollbar">

                  {!hasResults ? (

                    <div className="p-8 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">

                      Aucun résultat pour "{globalSearch}"

                    </div>

                  ) : (

                    <div className="p-2">

                      {searchResults.students.length > 0 && (

                        <div className="mb-2">

                          <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Élèves</p>

                          {searchResults.students.map(s => (

                            <button 

                              key={s.id}

                              onClick={() => { setShowSearchResults(false); setActiveTab('students'); }}

                              className="w-full flex items-center justify-between p-3 hover:bg-emerald-50 rounded-xl transition-colors group"

                            >

                              <div className="flex items-center space-x-3">

                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${

                                  s.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-700' : 

                                  s.subscriptionStatus === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'

                                }`}>

                                  {getInitials(`${s.firstName} ${s.lastName}`)}

                                </div>

                                <div className="text-left">

                                  <p className="text-sm font-bold text-slate-700">{s.firstName} {s.lastName}</p>

                                  <p className="text-[10px] text-slate-400 font-bold uppercase">{s.class}</p>

                                </div>

                              </div>

                              <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />

                            </button>

                          ))}

                        </div>

                      )}



                      {searchResults.schools.length > 0 && (

                        <div className="mb-2">

                          <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Écoles</p>

                          {searchResults.schools.map(s => (

                            <button 

                              key={s.id}

                              onClick={() => { setShowSearchResults(false); setActiveTab('schools'); }}

                              className="w-full flex items-center justify-between p-3 hover:bg-blue-50 rounded-xl transition-colors group"

                            >

                              <div className="flex items-center space-x-3">

                                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">

                                  <SchoolIcon size={16} />

                                </div>

                                <div className="text-left">

                                  <p className="text-sm font-bold text-slate-700">{s.name}</p>

                                  <p className="text-[10px] text-slate-400 font-bold uppercase">{s.city}</p>

                                </div>

                              </div>

                              <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />

                            </button>

                          ))}

                        </div>

                      )}



                      {searchResults.payments.length > 0 && (

                        <div className="mb-2">

                          <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Paiements</p>

                          {searchResults.payments.map(p => (

                            <button 

                              key={p.id}

                              onClick={() => { setShowSearchResults(false); setActiveTab('payments'); }}

                              className="w-full flex items-center justify-between p-3 hover:bg-purple-50 rounded-xl transition-colors group"

                            >

                              <div className="flex items-center space-x-3">

                                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">

                                  <CreditCard size={16} />

                                </div>

                                <div className="text-left">

                                  <p className="text-sm font-bold text-slate-700">{p.studentName}</p>

                                  <p className="text-[10px] text-slate-400 font-bold uppercase">{p.amount} FCFA</p>

                                </div>

                              </div>

                              <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />

                            </button>

                          ))}

                        </div>

                      )}

                    </div>

                  )}

                </div>

              )}

            </div>

          </div>



          <div className="flex items-center space-x-3 md:space-x-6 ml-4">

            <div className="hidden sm:block text-right mr-2">

              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{currentUser.schoolName || 'Administration Dabali'}</span>

            </div>

            

            <button 

              onClick={toggleNotifications}

              className={`relative p-2 rounded-xl transition-all duration-300 ${

                notificationsEnabled 

                ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 shadow-sm' 

                : 'text-slate-400 bg-slate-100 hover:bg-slate-200'

              }`}

            >

              {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}

            </button>



            <div className="flex items-center space-x-3 cursor-pointer group p-1 pr-2 rounded-xl hover:bg-slate-50 transition-all">

              {currentUser.avatar ? (

                <img src={currentUser.avatar} alt="Profile" className="w-9 h-9 rounded-lg object-cover ring-2 ring-emerald-500/20 shadow-sm" />

              ) : (

                <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-[10px] font-black text-white shadow-sm ring-2 ring-emerald-500/20">

                  {getInitials(currentUser.name)}

                </div>

              )}

              <div className="text-right hidden sm:block">

                <p className="text-xs font-bold text-slate-800 leading-tight">{currentUser.name}</p>

                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{currentUser.role.replace('_', ' ')}</p>

              </div>

            </div>

          </div>

        </header>



        {toast.visible && (

          <div className="fixed top-20 right-4 md:right-8 z-50 max-w-sm w-full animate-in slide-in-from-right-4 fade-in duration-300">

            <div className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md flex items-start space-x-3 ${

              toast.type === 'success' 

              ? 'bg-emerald-600/95 border-emerald-400 text-white' 

              : 'bg-slate-800/95 border-slate-700 text-white'

            }`}>

              <div className="flex-1">

                <p className="text-sm font-bold leading-relaxed">{toast.message}</p>

              </div>

              <button onClick={() => setToast(prev => ({ ...prev, visible: false }))}>

                <X size={16} />

              </button>

            </div>

          </div>

        )}



        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">

          <div className="max-w-7xl mx-auto pb-12">

            {renderContent()}

          </div>

        </div>

      </main>

    </div>

  );

};

export default App;
