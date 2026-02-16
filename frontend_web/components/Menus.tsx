import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Plus,
  Trash2,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { menuApi, schoolsApi } from '../services/api';
import { MenuItem, School, UserRole } from '../types';

interface MenusProps {
  schoolId?: string;
  initialSearch?: string;
  userRole?: UserRole;
}

const WEEK_DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'] as const;

const DEFAULT_MEAL_TYPE = 'LUNCH';

const allergenOptions = [
  { value: 'peanuts', label: 'Arachides' },
  { value: 'milk', label: 'Lait' },
  { value: 'eggs', label: 'Œufs' },
  { value: 'gluten', label: 'Gluten' },
  { value: 'fish', label: 'Poisson' },
  { value: 'shellfish', label: 'Crustacés' },
];

const getWeekStart = (date: Date) => {
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatWeekRange = (start: Date) => {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.toLocaleDateString('fr-FR', { month: 'long' });
  const endMonth = end.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  if (start.getMonth() === end.getMonth()) {
    return `${startDay} - ${endDay} ${endMonth}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
};

const formatDateLabel = (date: Date) => date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

const Menus: React.FC<MenusProps> = ({ schoolId, userRole }) => {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [showDeleteMenuModal, setShowDeleteMenuModal] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState<MenuItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [menuToView, setMenuToView] = useState<MenuItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState<'week' | 'menu'>('menu');
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>(
    { message: '', type: 'success', visible: false }
  );

  const [formData, setFormData] = useState({
    date: '',
    mealType: DEFAULT_MEAL_TYPE,
    name: '',
    items: [{ emoji: '???', name: '' }],
    allergens: [] as string[],
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  const isSuperAdmin = userRole === UserRole.SUPER_ADMIN;
  const effectiveSchoolId = isSuperAdmin ? selectedSchoolId : schoolId;

  useEffect(() => {
    if (!isSuperAdmin) return;
    let isMounted = true;
    const loadSchools = async () => {
      try {
        setSchoolsLoading(true);
        const data = await schoolsApi.getSchools();
        if (!isMounted) return;
        setSchools(data || []);
        if (!selectedSchoolId && data && data.length) {
          setSelectedSchoolId(data[0].id);
        }
      } catch (error) {
        console.error('Error loading schools:', error);
      } finally {
        if (isMounted) setSchoolsLoading(false);
      }
    };
    loadSchools();
    return () => {
      isMounted = false;
    };
  }, [isSuperAdmin, selectedSchoolId]);

  const loadMenus = useCallback(async (backgroundRefresh = false) => {
    if (!effectiveSchoolId) {
      setMenus([]);
      return;
    }
    try {
      if (!backgroundRefresh) {
        setLoading(true);
      }
      const savedMenus = await menuApi.getMenus(effectiveSchoolId);
      setMenus(savedMenus || []);
    } catch (error) {
      console.error('Error loading menus:', error);
      showToast('Erreur lors du chargement des menus.', 'error');
    } finally {
      if (!backgroundRefresh) {
        setLoading(false);
      }
    }
  }, [effectiveSchoolId]);

  useEffect(() => {
    loadMenus();
  }, [loadMenus]);

  useEffect(() => {
    if (!effectiveSchoolId) return;
    const intervalId = window.setInterval(() => {
      loadMenus(true);
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [effectiveSchoolId, loadMenus]);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 5; i += 1) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      days.push(date);
    }
    return days;
  }, [weekStart]);

  const weeklyMenus = useMemo(() => {
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 4);
    end.setHours(23, 59, 59, 999);

    return menus.filter(menu => {
      if (!menu.date) return false;
      const menuDate = new Date(menu.date);
      return menuDate >= start && menuDate <= end;
    });
  }, [menus, weekStart]);

  const menusByDate = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    weeklyMenus.forEach(menu => {
      if (!menu.date) return;
      const key = toISODate(new Date(menu.date));
      const existing = map.get(key) || [];
      existing.push(menu);
      map.set(key, existing);
    });

    return map;
  }, [weeklyMenus]);

  const openCreateModal = (date?: Date) => {
    setEditingMenu(null);
    setModalMode('menu');
    setFormData({
      date: date ? toISODate(date) : toISODate(weekStart),
      mealType: DEFAULT_MEAL_TYPE,
      name: '',
      items: [{ emoji: '???', name: '' }],
      allergens: [],
    });
    setIsModalOpen(true);
  };

  const handleNewMenuForNextWeek = () => {
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(weekStart.getDate() + 7);
    const nextWeekStart = getWeekStart(nextWeek);
    setEditingMenu(null);
    setModalMode('week');
    setFormData({
      date: toISODate(nextWeekStart),
      mealType: DEFAULT_MEAL_TYPE,
      name: '',
      items: [{ emoji: '???', name: '' }],
      allergens: [],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (menu: MenuItem) => {
    setEditingMenu(menu);
    setModalMode('menu');
    setFormData({
      date: menu.date || toISODate(weekStart),
      mealType: DEFAULT_MEAL_TYPE,
      name: menu.name || menu.mealName || '',
      items: menu.items && menu.items.length > 0
        ? menu.items.map((item) => ({ name: item.name || '', emoji: item.emoji || '???' }))
        : [{ emoji: '???', name: '' }],
      allergens: menu.allergens || [],
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingMenu(null);
  };

  const handleItemChange = (index: number, field: 'emoji' | 'name', value: string) => {
    const nextItems = formData.items.map((item, idx) => {
      if (idx !== index) return item;
      return { ...item, [field]: value };
    });
    setFormData(prev => ({ ...prev, items: nextItems }));
  };

  const addItem = () => {
    setFormData(prev => ({ ...prev, items: [...prev.items, { emoji: '???', name: '' }] }));
  };

  const removeItem = (index: number) => {
    const nextItems = formData.items.filter((_, idx) => idx !== index);
    setFormData(prev => ({ ...prev, items: nextItems.length ? nextItems : [{ emoji: '???', name: '' }] }));
  };

  const toggleAllergen = (value: string) => {
    setFormData(prev => {
      const exists = prev.allergens.includes(value);
      const next = exists ? prev.allergens.filter(item => item !== value) : [...prev.allergens, value];
      return { ...prev, allergens: next };
    });
  };

  const validateForm = () => {
    if (!formData.date) return false;
    if (modalMode === 'week') return true;
    if (!formData.name.trim()) return false;
    return true;
  };

  const handleFormSubmit = async () => {
    const activeSchoolId = effectiveSchoolId;
    if (!validateForm()) {
      showToast('Veuillez remplir tous les champs obligatoires.', 'error');
      return;
    }

    if (modalMode === 'week') {
      const selectedWeekStart = getWeekStart(new Date(formData.date));
      setWeekStart(selectedWeekStart);
      showToast('Nouvelle semaine créée.', 'success');
      closeModal();
      return;
    }

    const normalizedItems = formData.items
      .filter(item => item.name.trim())
      .map(item => ({ name: item.name.trim(), emoji: item.emoji || '???' }));
    const payload = {
      date: formData.date,
      mealType: DEFAULT_MEAL_TYPE,
      name: formData.name.trim(),
      description: normalizedItems[0]?.name || formData.name.trim(),
      items: normalizedItems,
      allergens: formData.allergens,
    };

    try {
      setIsSubmitting(true);
      if (editingMenu?.id && /^[a-f0-9]{24}$/i.test(editingMenu.id)) {
        const updated = await menuApi.updateMenu(editingMenu.id, payload);
        if (!updated) {
          throw new Error('Mise à jour du menu impossible.');
        }
      } else {
        if (!activeSchoolId) {
          showToast('École introuvable. Veuillez sélectionner une école.', 'error');
          return;
        }
        const created = await menuApi.createMenu({ ...payload, schoolId: activeSchoolId });
        if (!created) {
          throw new Error('Création du menu impossible.');
        }
      }
      await loadMenus();
      showToast('Menu enregistré avec succès.', 'success');
      closeModal();
    } catch (error: any) {
      console.error('Error saving menu:', error);
      showToast(error?.message || 'Erreur lors de l\'enregistrement.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMenu = async () => {
    if (!menuToDelete?.id) return;
    try {
      setIsSubmitting(true);
      await menuApi.deleteMenu(menuToDelete.id);
      await loadMenus();
      showToast('Menu supprimé.', 'success');
      setShowDeleteMenuModal(false);
      setMenuToDelete(null);
    } catch (error: any) {
      console.error('Error deleting menu:', error);
      showToast(error?.message || 'Erreur lors de la suppression.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveWeek = async () => {
    if (!effectiveSchoolId) {
      showToast('Sauvegarde impossible sans école sélectionnée.', 'error');
      return;
    }
    try {
      setIsSubmitting(true);
      await menuApi.submitWeek(effectiveSchoolId, toISODate(weekStart));
      await loadMenus();
      showToast('Menus sauvegardés et transmis.', 'success');
    } catch (error: any) {
      console.error('Error submitting week:', error);
      showToast(error?.message || 'Erreur lors de la sauvegarde.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const weekLabel = formatWeekRange(weekStart);
  const isEmptyWeek = weeklyMenus.length === 0;

  const openDetailsModal = (menu: MenuItem) => {
    setMenuToView(menu);
    setShowDetailsModal(true);
  };

  return (
    <div className="relative space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <Sparkles size={12} />
              Semaine active
            </div>
            <h2 className="text-2xl font-black text-slate-900">Gestion des menus</h2>
            <p className="mt-2 text-sm text-slate-500">
              Visualisez les menus publiés et la présence des élèves par repas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isSuperAdmin && (
              <div className="flex flex-col gap-1 min-w-[220px]">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">École</label>
                <select
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-slate-800 focus:ring-2 focus:ring-slate-800/20"
                >
                  <option value="">Sélectionner une école</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
              <button
                onClick={() => setWeekStart(getWeekStart(new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000)))}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-800 transition hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <CalendarDays size={16} />
                {weekLabel}
              </div>
              <button
                onClick={() => setWeekStart(getWeekStart(new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)))}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-800 transition hover:bg-slate-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500" />
            {(loading || schoolsLoading) && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABLEAU SEMAINE */}
      {isSuperAdmin && !selectedSchoolId ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-md">
          Sélectionnez une école pour consulter et modifier les menus.
        </div>
      ) : isEmptyWeek && (userRole === UserRole.SCHOOL_ADMIN || userRole === UserRole.SUPER_ADMIN) ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-md">
          Aucun menu disponible pour cette semaine.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {weekDays.map((dayDate, index) => {
              const dayLabel = WEEK_DAYS[index];
              const dateKey = toISODate(dayDate);
              const dayMenus = menusByDate.get(dateKey) || [];

              return (
                <div key={dateKey} className="flex flex-col border-r border-slate-200 last:border-r-0">
                  <div className="bg-slate-800 px-4 py-3 text-sm font-semibold text-white">
                    <div className="flex items-center justify-between">
                      <span>{dayLabel}</span>
                      <span className="text-xs text-slate-200">{formatDateLabel(dayDate)}</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 bg-[#f8fafc] p-4 min-h-[220px]">
                    {dayMenus.length === 0 ? (
                      userRole === UserRole.CANTEEN_MANAGER ? (
                        <button
                          onClick={() => openCreateModal(dayDate)}
                          className="w-full rounded-xl border-2 border-dashed border-slate-800 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                        >
                          + Ajouter menu
                        </button>
                      ) : null
                    ) : (
                      dayMenus.map(menu => {
                        const canEditMenu = userRole === UserRole.CANTEEN_MANAGER
                          || userRole === UserRole.SCHOOL_ADMIN
                          || userRole === UserRole.SUPER_ADMIN;
                        const canDeleteMenu = userRole === UserRole.CANTEEN_MANAGER;
                        return (
                          <div
                            key={menu.id}
                            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg max-h-[280px] overflow-hidden"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-semibold text-slate-800 truncate">{menu.name || menu.mealName || 'Menu'}</h4>
                                <p className="text-xs text-slate-500">Menu du jour</p>
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-2">
                              <button
                                onClick={() => openDetailsModal(menu)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                              >
                                Détails
                              </button>
                              {canEditMenu && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => openEditModal(menu)}
                                    aria-label="Éditer"
                                    title="Éditer"
                                    className="h-9 w-9 rounded-lg border border-[#10b981] text-[#10b981] transition hover:bg-emerald-50 flex items-center justify-center"
                                  >
                                    <Edit3 size={16} />
                                  </button>
                                  {canDeleteMenu && (
                                    <button
                                      onClick={() => {
                                        setMenuToDelete(menu);
                                        setShowDeleteMenuModal(true);
                                      }}
                                      aria-label="Supprimer"
                                      title="Supprimer"
                                      className="h-9 w-9 rounded-lg border border-[#ef4444] text-[#ef4444] transition hover:bg-red-50 flex items-center justify-center"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BOUTONS GLOBAUX */}
      {userRole === UserRole.CANTEEN_MANAGER && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={handleSaveWeek}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#10b981] px-6 py-3 text-sm font-semibold text-[#10b981] transition hover:bg-emerald-50 disabled:opacity-60"
          >
            <CheckCircle size={16} />
            Sauvegarder
          </button>
        </div>
      )}

      {/* TOAST */}
      {toast.visible && (
        <div className="fixed right-4 top-20 z-50">
          <div
            className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold shadow-lg ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            <CheckCircle size={16} />
            {toast.message}
          </div>
        </div>
      )}

      {/* MODAL CRÉATION / ÉDITION */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  {modalMode === 'week' ? 'Nouvelle semaine' : editingMenu ? 'Modifier le menu' : 'Nouveau menu'}
                </h3>
                <p className="text-sm text-slate-500">
                  {modalMode === 'week'
                    ? 'Sélectionnez la date de démarrage et le type par défaut.'
                    : 'Remplissez les informations du repas.'}
                </p>
              </div>
              <button onClick={closeModal} className="rounded-full p-2 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 px-6 py-5">
              {/* Date */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 focus:border-slate-800 focus:ring-2 focus:ring-slate-800/20"
                />
              </div>

              {modalMode === 'menu' && (
                <>
                  {/* Nom du plat */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600">Nom du plat</label>
                    <input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3 focus:border-slate-800 focus:ring-2 focus:ring-slate-800/20"
                      placeholder="Ex: Riz sauce tomate"
                    />
                  </div>

                  {/* Items */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-600">Items du menu</label>
                    <div className="space-y-2">
                      {formData.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            value={item.emoji}
                            onChange={(e) => handleItemChange(idx, 'emoji', e.target.value)}
                            className="h-10 w-16 rounded-xl border border-slate-200 text-center focus:border-slate-800"
                            placeholder="??"
                          />
                          <input
                            value={item.name}
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            className="h-10 flex-1 rounded-xl border border-slate-200 px-3 focus:border-slate-800"
                            placeholder="Riz blanc"
                          />
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
                          >
                            Supprimer
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addItem}
                      className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-800 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      <Plus size={16} />
                      Ajouter un item
                    </button>
                  </div>

                  {/* Allergènes */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600">Allergènes</label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {allergenOptions.map(allergen => (
                        <label key={allergen.value} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={formData.allergens.includes(allergen.value)}
                            onChange={() => toggleAllergen(allergen.value)}
                            className="h-4 w-4 rounded border-slate-300 text-[#ef4444]"
                          />
                          {allergen.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleFormSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-slate-900 disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION MENU */}
      {showDeleteMenuModal && menuToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-800">Supprimer ce menu ?</h3>
            <p className="mt-2 text-sm text-slate-500">Cette action est irréversible.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteMenuModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteMenu}
                disabled={isSubmitting}
                className="rounded-xl bg-[#ef4444] px-4 py-2 text-sm font-semibold text-white hover:bg-[#dc2626]"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && menuToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Détails du menu</h3>
                <p className="text-sm text-slate-500">{menuToView.name || menuToView.mealName || 'Menu'}</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setMenuToView(null);
                }}
                className="rounded-full p-2 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Date</span>
                <span>{menuToView.date || '-'}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Items</span>
                <div className="mt-2 space-y-1">
                  {menuToView.items && menuToView.items.length > 0 ? (
                    menuToView.items.map((item, idx) => (
                      <div key={`detail-${idx}`} className="flex items-center gap-2">
                        <span>{item.emoji || '???'}</span>
                        <span>{item.name}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400">Aucun item défini</div>
                  )}
                </div>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Allergènes</span>
                <div className="mt-2">
                  {menuToView.allergens && menuToView.allergens.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {menuToView.allergens.map(allergen => (
                        <span key={allergen} className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-[#ef4444]">
                          {allergen}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-400">Aucun allergène</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setMenuToView(null);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Menus;

















