
import React from 'react';
import { NAV_ITEMS } from '../constants';
import { UserRole } from '../types';
import { LogOut, X } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userRole, onLogout, isOpen, setIsOpen }) => {
  const filteredNavItems = NAV_ITEMS.filter(item => item.roles.includes(userRole));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 bottom-0 w-64 bg-emerald-900 text-white z-50 transition-transform duration-300 transform flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:h-screen
      `}>
        {/* Header Section (Logo) */}
        <div className="p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <div className="bg-emerald-500 p-1.5 rounded-lg">
              <span className="text-white font-bold text-xl">DX</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Dabali Express</h1>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-1 hover:bg-emerald-800 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Navigation Section */}
        <nav className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                ${activeTab === item.id 
                  ? 'bg-emerald-700 text-white shadow-lg translate-x-1' 
                  : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'}
              `}
            >
              <div className={activeTab === item.id ? 'text-emerald-400' : ''}>
                {item.icon}
              </div>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom Section (Logout) */}
        <div className="p-4 shrink-0 border-t border-emerald-800/50 mt-2 bg-emerald-950/20">
          <button 
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-red-300 hover:bg-red-900/40 hover:text-red-100 rounded-lg transition-all duration-200 font-bold group"
          >
            <div className="bg-red-900/20 p-2 rounded-lg group-hover:bg-red-900/40 transition-colors">
              <LogOut size={18} />
            </div>
            <span className="text-sm">Déconnexion</span>
          </button>
          <div className="mt-4 text-center">
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em] opacity-50">Burkina Faso • 2024</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
