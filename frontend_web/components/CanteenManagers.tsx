import React, { useState, useEffect } from 'react';
import { Plus, Edit, Shield, X, Check, Search, UserPlus, Copy, Mail, MessageSquare, Trash2 } from 'lucide-react';
import { authApi, schoolsApi } from '../services/api';
import { UserRole, School } from '../types';

interface CanteenManager {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  school_id: string | { _id?: string; id?: string; name?: string };
  school_name?: string;
  temporary_password?: string;
  created_at: string;
}

const toStringId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const obj = value as { _id?: unknown; id?: unknown };
    if (obj._id) return String(obj._id);
    if (obj.id) return String(obj.id);
  }
  return String(value);
};

const resolveManagerSchoolName = (
  manager: any,
  schoolsData: School[],
  fallbackSchoolId?: string,
  fallbackSchoolName?: string
): string => {
  if (typeof manager?.school_name === 'string' && manager.school_name.trim()) {
    return manager.school_name.trim();
  }
  if (typeof manager?.schoolName === 'string' && manager.schoolName.trim()) {
    return manager.schoolName.trim();
  }
  if (manager?.school && typeof manager.school.name === 'string' && manager.school.name.trim()) {
    return manager.school.name.trim();
  }
  if (manager?.school_id && typeof manager.school_id === 'object' && typeof manager.school_id.name === 'string' && manager.school_id.name.trim()) {
    return manager.school_id.name.trim();
  }

  const schoolId = fallbackSchoolId || toStringId(manager?.school_id || manager?.schoolId || manager?.school?._id || manager?.school?.id);
  const school = schoolsData.find((entry) => entry.id === schoolId);
  if (school?.name) return school.name;

  if (fallbackSchoolName && fallbackSchoolName.trim()) return fallbackSchoolName.trim();
  return 'Ecole non trouvee';
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

interface CanteenManagersProps {
  initialSearch?: string;
}

const CanteenManagers: React.FC<CanteenManagersProps> = ({ initialSearch = '' }) => {
  const [canteenManagers, setCanteenManagers] = useState<CanteenManager[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<CanteenManager | null>(null);
  const [createdManager, setCreatedManager] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const loadData = async () => {
    try {
      const [schoolsData, freshUser] = await Promise.all([
        schoolsApi.getSchools(),
        authApi.getCurrentUser()
      ]);
      const currentUserData = freshUser || getCurrentUserFromStorage();
      
      setSchools(schoolsData);
      let resolvedUser = currentUserData;

      if (resolvedUser && !resolvedUser.schoolId) {
        const matchedSchool = schoolsData.find(s =>
          s.adminId === resolvedUser.id || s.adminId === (resolvedUser as any)._id
        );
        if (matchedSchool) {
          resolvedUser = {
            ...resolvedUser,
            schoolId: matchedSchool.id,
            schoolName: matchedSchool.name
          };
          localStorage.setItem('current_user', JSON.stringify(resolvedUser));
        }
      }

      if (resolvedUser?.schoolId) {
        const schoolMatch = schoolsData.find(s => s.id === resolvedUser.schoolId);
        if (schoolMatch && schoolMatch.name !== resolvedUser.schoolName) {
          resolvedUser = {
            ...resolvedUser,
            schoolName: schoolMatch.name
          };
          localStorage.setItem('current_user', JSON.stringify(resolvedUser));
        }
      }

      setCurrentUser(resolvedUser);
      
      // Charger les gestionnaires de cantine de l'école du school admin
      if (resolvedUser?.schoolId) {
        await loadCanteenManagers(resolvedUser.schoolId, schoolsData, resolvedUser);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setSchools([]);
    }
  };

  const getCurrentUserFromStorage = () => {
    const storedUser = localStorage.getItem('current_user');
    return storedUser ? JSON.parse(storedUser) : null;
  };

  const loadCanteenManagers = async (
    schoolId: string,
    schoolsData: School[] = schools,
    currentUserData: any = currentUser
  ) => {
    try {
      // Utiliser le bon endpoint avec le school_id en paramètre
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/canteen-managers/school/${schoolId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const normalizedManagers: CanteenManager[] = (data.data || []).map((manager: any) => {
          const managerSchoolId = toStringId(
            manager.school_id || manager.schoolId || manager.school?._id || manager.school?.id
          ) || schoolId;

          return {
            ...manager,
            id: toStringId(manager.id || manager._id),
            school_id: managerSchoolId,
            school_name: resolveManagerSchoolName(
              manager,
              schoolsData,
              managerSchoolId,
              currentUserData?.schoolName
            )
          };
        });

        setCanteenManagers(normalizedManagers);
      } else {
        console.error('Erreur lors du chargement des gestionnaires:', response.status);
        setCanteenManagers([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des gestionnaires:', error);
      setCanteenManagers([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateManager = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formElement = e.currentTarget;
    if (!(formElement instanceof HTMLFormElement)) {
      console.error('FormData error: currentTarget is not a form element');
      alert('Erreur technique: formulaire invalide. Veuillez recharger la page.');
      return;
    }
    const fd = new FormData(formElement);
    
    // AUDIT COMPLET - ÉTAPE 1: Vérification de base
    console.log('=== AUDIT COMPLET CRÉATION GESTIONNAIRE ===');
    
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('current_user');
    
    console.log('1. ÉTAT LOCAL STORAGE:');
    console.log('   - Token présent:', !!token);
    console.log('   - Token (20 premiers chars):', token?.substring(0, 20) + '...');
    console.log('   - User stocké:', storedUser);
    
    if (!token) {
      alert('Erreur: Vous n\'êtes pas connecté. Veuillez vous reconnecter.');
      return;
    }
    
    // AUDIT COMPLET - ÉTAPE 2: Rafraîchir l'utilisateur via /auth/me
    console.log('2. APPEL DIRECT À /auth/me:');
    const freshUser = await authApi.getCurrentUser();
    if (freshUser) {
      console.log('   - ✅ Mise à jour du currentUser avec schoolId');
      setCurrentUser(freshUser);
    }
    
    // AUDIT COMPLET - ÉTAPE 3: Vérification du currentUser React
    const effectiveUser = freshUser || currentUser;

    console.log('3. ÉTAT CURRENTUSER REACT:');
    console.log('   - effectiveUser.schoolId:', effectiveUser?.schoolId);
    console.log('   - effectiveUser.schoolName:', effectiveUser?.schoolName);
    console.log('   - effectiveUser.role:', effectiveUser?.role);
    console.log('   - effectiveUser complet:', effectiveUser);
    
    if (!effectiveUser?.schoolId) {
      console.log('❌ ERREUR: SchoolId manquant');
      alert('Erreur: Aucune école associée à votre compte. Veuillez vous reconnecter.');
      return;
    }
    
    // AUDIT COMPLET - ÉTAPE 4: Traitement du formulaire
    console.log('4. TRAITEMENT DU FORMULAIRE:');
    
    const managerData = {
      first_name: ((fd.get('firstName') as string) || '').trim(),
      last_name: ((fd.get('lastName') as string) || '').trim(),
      email: ((fd.get('email') as string) || '').trim().toLowerCase(),
      phone: ((fd.get('phone') as string) || '').trim(),
      school_id: (fd.get('schoolId') as string) || effectiveUser?.schoolId || '',
    };

    console.log('   - Données brutes du formulaire:');
    fd.forEach((value, key) => console.log(`     ${key}: ${value}`));
    
    console.log('   - Données structurées:');
    console.log('     - Prénom:', managerData.first_name);
    console.log('     - Nom:', managerData.last_name);
    console.log('     - Email:', managerData.email);
    console.log('     - Téléphone:', managerData.phone);
    console.log('     - School ID du formulaire:', managerData.school_id);
    console.log('     - School ID du currentUser:', effectiveUser?.schoolId);
    
    // AUDIT COMPLET - ÉTAPE 5: Validation
    console.log('5. VALIDATION:');
    const validationErrors = [];
    if (!managerData.first_name) validationErrors.push('first_name manquant');
    if (!managerData.last_name) validationErrors.push('last_name manquant');
    if (!managerData.email) validationErrors.push('email manquant');
    if (!managerData.school_id) validationErrors.push('school_id manquant');
    const gmailRegex = /^[^\s@]+@gmail\.com$/;
    if (!gmailRegex.test(managerData.email)) {
      validationErrors.push('email doit finir par @gmail.com');
    }
    
    if (validationErrors.length > 0) {
      console.error('❌ Erreurs de validation:', validationErrors);
      alert(`Erreur de validation: ${validationErrors.join(', ')}`);
      return;
    }
    
    console.log('   - ✅ Validation réussie');
    console.log('========================================');

    // AUDIT COMPLET - ÉTAPE 6: Appel API
    console.log('6. APPEL API CRÉATION:');
    try {
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/canteen-managers`;
      
      console.log('   - URL:', apiUrl);
      console.log('   - Méthode: POST');
      console.log('   - Headers:', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token?.substring(0, 20)}...`
      });
      console.log('   - Body:', JSON.stringify(managerData, null, 2));
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(managerData),
      });

      console.log('   - Status:', response.status);
      console.log('   - Status Text:', response.statusText);

      let result;
      try {
        result = await response.json();
        console.log('   - Body JSON:', result);
      } catch (e) {
        const text = await response.text();
        console.log('   - Body texte:', text);
      }

      if (response.ok && result?.success) {
        console.log('7. ✅ SUCCÈS: Gestionnaire créé');
        setCreatedManager(result.data);
        setIsModalOpen(false);
        await loadCanteenManagers(managerData.school_id);
      } else {
        console.log('7. ❌ ERREUR SERVEUR:');
        console.log('   - Message:', result?.message || 'Erreur inconnue');
        console.log('   - Success:', result?.success);
        alert(`Erreur: ${result?.message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.log('7. ❌ ERREUR RÉSEAU:');
      console.log('   - Type:', (error as Error).constructor.name);
      console.log('   - Message:', (error as Error).message);
      console.log('   - Stack:', (error as Error).stack);
      alert(`Erreur réseau: ${(error as Error).message}`);
    }
  };

  const handleDeleteManager = async (managerId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce gestionnaire ?')) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/canteen-managers/${managerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        await loadCanteenManagers(currentUser?.schoolId);
      } else {
        console.error('Erreur lors de la suppression du gestionnaire');
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Mot de passe copié dans le presse-papiers!');
  };

  const sendPasswordByEmail = async () => {
    if (!createdManager) return;
    
    console.log('Simulation: Envoi d\'email à', createdManager.user.email);
    alert(`Email envoyé à ${createdManager.user.email} avec le mot de passe temporaire.`);
  };

  const sendPasswordBySMS = async () => {
    if (!createdManager) return;
    
    console.log('Simulation: Envoi SMS à', createdManager.user.phone);
    alert(`SMS envoyé au ${createdManager.user.phone} avec le mot de passe temporaire.`);
  };

  const filteredManagers = canteenManagers.filter(m => 
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(initialSearch.toLowerCase()) || 
    m.email.toLowerCase().includes(initialSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="surface-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="section-title">Gestionnaires de Cantine</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Gérez les comptes des gestionnaires de votre établissement.</p>
        </div>
        <div className="flex space-x-3">
          {/* Debug temporaire pour afficher le rôle de l'utilisateur */}
          {currentUser && (
            <div className="px-3 py-1 bg-gray-100 rounded text-xs">
              Role: {currentUser.role}
            </div>
          )}
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl hover:bg-slate-900 transition-all shadow-md font-bold text-sm"
          >
            <UserPlus size={18} />
            <span>Ajouter un Gestionnaire</span>
          </button>
        </div>
      </div>

      <div className="table-shell">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="table-head">
              <tr>
                <th className="px-6 py-4">Gestionnaire</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Téléphone</th>
                <th className="px-6 py-4">Établissement</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredManagers.length > 0 ? filteredManagers.map((manager) => (
                <tr key={manager.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                        {getInitials(`${manager.first_name} ${manager.last_name}`)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{manager.first_name} {manager.last_name}</div>
                        <div className="text-xs text-slate-400">Gestionnaire de cantine</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-600">{manager.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-600">{manager.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-600">
                      {manager.school_name || schools.find((entry) => entry.id === toStringId(manager.school_id))?.name || currentUser?.schoolName || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleDeleteManager(manager.id)}
                        className="action-icon text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <UserPlus size={32} className="text-slate-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">Aucun gestionnaire trouvé</h3>
                        <p className="text-sm text-slate-500">Commencez par ajouter votre premier gestionnaire de cantine.</p>
                      </div>
                      <button 
                        onClick={() => setIsModalOpen(true)}
                        className="btn-primary flex items-center space-x-2 px-4 py-2 font-bold"
                      >
                        <Plus size={16} />
                        <span>Ajouter un Gestionnaire</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-800 text-white">
              <h3 className="font-black text-2xl">Ajouter un Gestionnaire de Cantine</h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:rotate-90 transition-transform"><X size={24} /></button>
            </div>
            <form onSubmit={handleCreateManager} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prénom</label>
                  <input name="firstName" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 font-medium" placeholder="Traoré" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom</label>
                  <input name="lastName" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 font-medium" placeholder="Moussa" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Gmail</label>
                <input
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  onInput={(e) => {
                    const target = e.currentTarget;
                    target.value = target.value.replace(/\s+/g, '').toLowerCase();
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 font-medium"
                  placeholder="moussa.traore@gmail.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Téléphone</label>
                <input name="phone" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 font-medium" placeholder="+22670333333" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">École</label>
                
                {/* Trouver le nom de l'école à partir du schoolId de l'utilisateur */}
                {(() => {
                  const userSchool = schools.find(s => s.id === currentUser?.schoolId);
                  const schoolName = userSchool?.name || currentUser?.schoolName || 'École non trouvée';
                  
                  return (
                    <>
                      <input 
                        type="text" 
                        name="schoolName" 
                        required 
                        readOnly
                        value={schoolName}
                        className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl bg-white font-medium text-slate-600"
                        placeholder="École de l'administrateur"
                      />
                      <input 
                        type="hidden" 
                        name="schoolId" 
                        value={currentUser?.schoolId || ''}
                      />
                    </>
                  );
                })()}
              </div>
              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-colors">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-slate-800 text-white rounded-xl font-black shadow-lg hover:bg-slate-900 transition-all flex items-center justify-center space-x-2">
                  <Check size={20} />
                  <span>Créer le Gestionnaire</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createdManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-800 text-white">
              <h3 className="font-black text-2xl">Gestionnaire Créé avec Succès</h3>
              <button onClick={() => setCreatedManager(null)} className="hover:rotate-90 transition-transform"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h4 className="font-bold text-green-800 mb-2">Informations du gestionnaire:</h4>
                <div className="space-y-1 text-sm text-green-700">
                  <p><strong>Nom:</strong> {createdManager.user.first_name} {createdManager.user.last_name}</p>
                  <p><strong>Email:</strong> {createdManager.user.email}</p>
                  <p><strong>Téléphone:</strong> {createdManager.user.phone}</p>
                  <p><strong>Rôle:</strong> Gestionnaire de Cantine</p>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h4 className="font-bold text-amber-800 mb-2">Mot de passe temporaire:</h4>
                <div className="flex items-center space-x-2">
                  <input 
                    type="text" 
                    value={createdManager.temporary_password} 
                    readOnly 
                    className="flex-1 px-4 py-2 bg-white border border-amber-300 rounded-lg font-mono text-amber-800"
                  />
                  <button 
                    onClick={() => copyToClipboard(createdManager.temporary_password)}
                    className="p-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <p className="text-xs text-amber-600 mt-2">Le gestionnaire devra changer ce mot de passe lors de sa première connexion.</p>
              </div>

              <div className="flex space-x-3">
                <button 
                  onClick={sendPasswordByEmail}
                  className="flex-1 px-4 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all flex items-center justify-center space-x-2"
                >
                  <Mail size={16} />
                  <span>Envoyer par Email</span>
                </button>
                <button 
                  onClick={sendPasswordBySMS}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all flex items-center justify-center space-x-2"
                >
                  <MessageSquare size={16} />
                  <span>Envoyer par SMS</span>
                </button>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => setCreatedManager(null)}
                  className="w-full px-4 py-3 bg-slate-800 text-white rounded-xl font-black shadow-lg hover:bg-slate-900 transition-all"
                >
                  Terminer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CanteenManagers;
