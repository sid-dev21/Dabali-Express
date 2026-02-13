
import React, { useState, useEffect, useCallback } from 'react';
import { Utensils, Save, CheckCircle, Trash2, ClipboardCheck } from 'lucide-react';
import { menuApi } from '../services/api';
import { MenuItem, UserRole } from '../types';
import MenuApproval from './MenuApproval';

interface MenusProps {
  schoolId?: string;
  initialSearch?: string;
  userRole?: UserRole;
}

const getDefaults = (schoolId: string): MenuItem[] => [
  { id: '1', schoolId, day: 'Lundi', mealName: '', description: '' },
  { id: '2', schoolId, day: 'Mardi', mealName: '', description: '' },
  { id: '3', schoolId, day: 'Mercredi', mealName: '', description: '' },
  { id: '4', schoolId, day: 'Jeudi', mealName: '', description: '' },
  { id: '5', schoolId, day: 'Vendredi', mealName: '', description: '' },
];

const Menus: React.FC<MenusProps> = ({ schoolId, initialSearch = '', userRole }) => {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);

  const loadMenus = useCallback(async () => {
    if (!schoolId) return;
    try {
      const savedMenus = await menuApi.getMenus(schoolId);
      if (savedMenus && savedMenus.length > 0) {
        setMenus(savedMenus);
      } else {
        setMenus(getDefaults(schoolId));
      }
    } catch (error) {
      console.error('Error loading menus:', error);
      setMenus(getDefaults(schoolId));
    }
  }, [schoolId]);

  useEffect(() => {
    loadMenus();
  }, [loadMenus]);

  const handleSave = async () => {
    if (!schoolId) return;
    try {
      await menuApi.saveMenus(menus, schoolId);
      await loadMenus();
      setSaveStatus("Planning de la semaine enregistré !");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Error saving menus:', error);
      setSaveStatus("Erreur lors de l'enregistrement");
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const getMonday = () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  };

  const handleDeleteWeek = async () => {
    if (!schoolId) return;
    const confirmed = confirm('Supprimer tous les menus PENDING de la semaine ?');
    if (!confirmed) return;

    const monday = getMonday();
    const ok = await menuApi.deleteWeek(schoolId, monday);
    if (ok) {
      setMenus(getDefaults(schoolId));
      setSaveStatus("Menus de la semaine supprimés.");
      setTimeout(() => setSaveStatus(null), 3000);
    } else {
      setSaveStatus("Erreur lors de la suppression");
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const updateMenu = (index: number, field: keyof MenuItem, value: string) => {
    const newMenus = [...menus];
    newMenus[index] = { ...newMenus[index], [field]: value };
    setMenus(newMenus);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Menu de la Semaine</h2>
          <p className="text-sm text-slate-500 font-medium italic">Définissez les plats qui seront servis aux élèves cette semaine.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {userRole === UserRole.SCHOOL_ADMIN && (
            <button
              onClick={() => setIsApprovalOpen(true)}
              className="flex items-center space-x-2 bg-amber-600 text-white px-6 py-3 rounded-2xl hover:bg-amber-700 transition-all shadow-xl shadow-amber-600/20 font-black uppercase text-xs tracking-widest"
            >
              <ClipboardCheck size={18} />
              <span>Valider les Menus</span>
            </button>
          )}
          <button
            onClick={handleDeleteWeek}
            className="flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 font-black uppercase text-xs tracking-widest"
          >
            <Trash2 size={18} />
            <span>Supprimer la Semaine</span>
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 bg-emerald-600 text-white px-8 py-3 rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 font-black uppercase text-xs tracking-widest"
          >
            <Save size={18} />
            <span>Enregistrer le Planning</span>
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-2xl flex items-center space-x-3 animate-in slide-in-from-top duration-300">
          <CheckCircle size={20} className="text-emerald-500" />
          <span className="text-sm font-black uppercase tracking-tight">{saveStatus}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {menus.map((item, index) => (
          <div key={item.day || index} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-xl hover:shadow-slate-200/50 transition-all group overflow-hidden">
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between group-hover:bg-emerald-50 transition-colors">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">{item.day}</span>
              <Utensils size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
            </div>
            <div className="p-6 flex-grow space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom du plat</label>
                <input 
                  placeholder="ex: Riz Gras au Poulet"
                  className="w-full bg-transparent border-b-2 border-slate-100 focus:border-emerald-500 py-1 font-bold text-slate-800 text-lg outline-none transition-all placeholder:text-slate-200"
                  value={item.mealName}
                  onChange={(e) => updateMenu(index, 'mealName', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Description / Ingrédients</label>
                <textarea 
                  placeholder="Détails nutritionnels ou accompagnements..."
                  className="w-full bg-slate-50/50 rounded-xl p-3 text-xs font-medium text-slate-600 border border-transparent focus:border-emerald-500/20 focus:bg-white outline-none min-h-[100px] resize-none transition-all placeholder:text-slate-300"
                  value={item.description}
                  onChange={(e) => updateMenu(index, 'description', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <MenuApproval
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        onMenuApproved={loadMenus}
      />
    </div>
  );
};

export default Menus;
