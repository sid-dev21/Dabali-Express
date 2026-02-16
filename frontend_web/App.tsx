import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole } from './types';
import { authApi, notificationsApi } from './services/api';
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

import Stock from './components/Stock';

import CanteenReports from './components/CanteenReports';

import SuperAdminReports from './components/SuperAdminReports';

import CanteenHistory from './components/CanteenHistory';

import Auth from './components/Auth';
import Notifications from './components/Notifications';

import { Menu, Bell, BellOff, X } from 'lucide-react';



const App: React.FC = () => {

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [activeTab, setActiveTab] = useState('dashboard');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const [toast, setToast] = useState<{message: string, visible: boolean, type: 'success' | 'info'}>({

    message: '', 

    visible: false, 

    type: 'success'

  });

  const triedSchoolRefresh = useRef(false);



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
  useEffect(() => {
    const onUnauthorized = () => {
      setCurrentUser(null);
      setActiveTab('dashboard');
      setIsInitialLoad(false);
    };

    window.addEventListener('auth:unauthorized', onUnauthorized as EventListener);
    return () => {
      window.removeEventListener('auth:unauthorized', onUnauthorized as EventListener);
    };
  }, []);

  // Rafraîchir le currentUser une seule fois si le schoolId est manquant (hors SUPER_ADMIN)
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === UserRole.SUPER_ADMIN) return;
    if (currentUser.schoolId) return;
    if (triedSchoolRefresh.current) return;

    triedSchoolRefresh.current = true;
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
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setUnreadNotificationsCount(0);
      return;
    }

    let isMounted = true;
    const refreshUnreadCount = async () => {
      try {
        const result = await notificationsApi.getUnreadCount();
        if (isMounted) {
          setUnreadNotificationsCount(result.count || 0);
        }
      } catch (error) {
        // Ignore transient notification polling errors in topbar badge.
      }
    };

    refreshUnreadCount();
    const intervalId = window.setInterval(refreshUnreadCount, 15000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [currentUser, isNotificationsOpen]);



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
    setIsInitialLoad(false); // ✅ Réinitialiser l'état de chargement
  };



  const toggleNotifications = () => {

    const newState = !notificationsEnabled;

    setNotificationsEnabled(newState);

    

    let msg = '';

    if (newState) {

      switch(currentUser.role) {

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



  const renderContent = () => {

    const commonProps = {

      schoolId: currentUser.schoolId,

    };



    switch (activeTab) {

      case 'dashboard': return <Dashboard userRole={currentUser!.role} schoolId={currentUser.schoolId} />;

      case 'students': return <Students {...commonProps} />;

      case 'subscriptions': return <Subscriptions {...commonProps} />;

      case 'attendance': return <Attendance {...commonProps} />;

      case 'menus': return <Menus schoolId={currentUser.schoolId} userRole={currentUser.role} />;

      case 'schools': return <Schools />;

      case 'payments': return <Payments schoolId={currentUser.schoolId} />;

      case 'users': return <Users />;

      case 'canteen-managers': return <CanteenManagers />;

      case 'stock': return <Stock schoolId={currentUser.schoolId} schoolName={currentUser.schoolName} managerName={currentUser.name} />;

      case 'canteen-reports': return <CanteenReports schoolId={currentUser.schoolId} schoolName={currentUser.schoolName} adminName={currentUser.name} />;

      case 'canteen-history': return <CanteenHistory schoolName={currentUser.schoolName} managerName={currentUser.name} />;

      case 'school-admin-reports': return <SuperAdminReports />;

      case 'settings': return <Settings currentUser={currentUser!} onUserUpdate={setCurrentUser} />;

      default: return null;

    }

  };



  if (isInitialLoad) return null;

  if (!currentUser) return <Auth onLoginSuccess={handleLoginSuccess} />;

  // DEBUG: Afficher l'état actuel
  console.log('=== APP STATE DEBUG ===');
  console.log('currentUser:', currentUser);
  console.log('isInitialLoad:', isInitialLoad);
  console.log('========================');



  return (

    <div className="app-shell flex h-screen overflow-hidden font-sans selection:bg-emerald-100 selection:text-emerald-900">

      <Sidebar 

        activeTab={activeTab} 

        setActiveTab={(tab) => { setActiveTab(tab); }} 

        userRole={currentUser.role} 

        onLogout={handleLogout}

        isOpen={isSidebarOpen}

        setIsOpen={setIsSidebarOpen}

      />

      

      <main className="flex-1 flex flex-col min-h-0">
        <header className="app-topbar h-16 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">

          <div className="flex items-center space-x-4 flex-1">

            <button 

              onClick={() => setIsSidebarOpen(true)}

              className="p-2 -ml-2 text-slate-600 lg:hidden hover:bg-slate-50 rounded-lg"

            >

              <Menu size={24} />

            </button>




          </div>



          <div className="flex items-center space-x-3 md:space-x-6 ml-4">

            <div className="hidden sm:block text-right mr-2">

              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{currentUser.schoolName || 'Administration Dabali'}</span>

            </div>

            

            <button 
              onClick={() => setIsNotificationsOpen(true)}

              className={`relative p-2 rounded-full transition-all duration-300 border ${

                notificationsEnabled ?

                 'text-emerald-600 border-emerald-100 bg-emerald-50 hover:bg-emerald-100 shadow-sm' 

                : 'text-slate-400 border-slate-200 bg-white hover:bg-slate-100'

              }`}

            >

              {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-[18px] text-center">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}

            </button>



            <div className="flex items-center space-x-3 cursor-pointer group p-1 pr-2 rounded-full hover:bg-slate-50 transition-all">

              {currentUser.avatar ? (

                <img src={currentUser.avatar} alt="Profile" className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/20 shadow-sm" />

              ) : (

                <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-black text-white shadow-sm ring-2 ring-emerald-500/20">

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

              toast.type === 'success' ?

               'bg-emerald-600/95 border-emerald-400 text-white' 

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



        <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-10 custom-scrollbar">

          <div className="max-w-7xl mx-auto pb-16">

            {renderContent()}

          </div>

        </div>

      </main>
      <Notifications isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />

    </div>

  );

};

export default App;


