
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
        fixed top-0 left-0 bottom-0 w-64 sidebar-shell z-50 transition-transform duration-300 transform flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:h-screen
      `}>
        {/* Header Section (Logo) */}
        <div className="p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="sidebar-pill px-3 py-2 text-sm font-black tracking-[0.2em] text-white">
              DX
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">Dabali Express</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">Dashboard</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors">
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
                w-full flex items-center space-x-3 px-4 py-3 sidebar-item
                ${activeTab === item.id ? 'sidebar-item-active' : ''}
              `}
            >
              <div className={activeTab === item.id ? 'text-white' : ''}>
                {item.icon}
              </div>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom Section (Logout) */}
        <div className="p-4 shrink-0 border-t border-white/10 mt-2">
          <button 
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-rose-200 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-200 font-semibold group"
          >
            <div className="bg-white/10 p-2 rounded-lg group-hover:bg-white/20 transition-colors">
              <LogOut size={18} />
            </div>
            <span className="text-sm">Déconnexion</span>
          </button>
          <div className="mt-4 text-center">
            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-[0.2em]">Burkina Faso • 2024</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
