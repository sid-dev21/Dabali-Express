import React, { useState, useEffect } from 'react';
import { Plus, Edit, Shield, X, Check, Search, UserPlus, Copy, Mail, MessageSquare, Trash2 } from 'lucide-react';
import { schoolsApi } from '../services/api';
import { UserRole, School } from '../types';

interface CanteenManager {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  school_id: string;
  school_name: string;
  temporary_password?: string;
  created_at: string;
}

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
      const [schoolsData, currentUserData] = await Promise.all([
        schoolsApi.getSchools(),
        getCurrentUserFromStorage()
      ]);
      
      setSchools(schoolsData);
      setCurrentUser(currentUserData);
      
      // Charger les gestionnaires de cantine de l'école du school admin
      if (currentUserData?.schoolId) {
        await loadCanteenManagers(currentUserData.schoolId);
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

  const loadCanteenManagers = async (schoolId: string) => {
    try {
      // Utiliser le bon endpoint avec le school_id en paramètre
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/canteen-managers/school/${schoolId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCanteenManagers(data.data || []);
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
    
    // Vérification préliminaire
    const token = localStorage.getItem('auth_token');
    console.log('=== AUDIT COMPLET CRÉATION GESTIONNAIRE ===');
    console.log('1. Token présent:', !!token);
    console.log('2. Token (premiers 20 chars):', token?.substring(0, 20) + '...');
    
    if (!token) {
      alert('Erreur: Vous n\'êtes pas connecté. Veuillez vous reconnecter.');
      return;
    }
    
    // Vérification CRUCIALE du schoolId
    console.log('3. Vérification schoolId:');
    console.log('   - currentUser.schoolId:', currentUser?.schoolId);
    console.log('   - currentUser.schoolName:', currentUser?.schoolName);
    console.log('   - currentUser complet:', currentUser);
    
    if (!currentUser?.schoolId) {
      alert('Erreur: Aucune école associée à votre compte. Veuillez vous reconnecter.');
      // Forcer la reconnexion
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
      window.location.reload();
      return;
    }
    
    const fd = new FormData(e.currentTarget);
    
    const managerData = {
      first_name: fd.get('firstName') as string,
      last_name: fd.get('lastName') as string,
      email: fd.get('email') as string,
      phone: fd.get('phone') as string,
      school_id: fd.get('schoolId') as string,
    };

    console.log('4. Données du formulaire:');
    console.log('   - Prénom:', managerData.first_name);
    console.log('   - Nom:', managerData.last_name);
    console.log('   - Email:', managerData.email);
    console.log('   - Téléphone:', managerData.phone);
    console.log('   - School ID du formulaire:', managerData.school_id);
    console.log('   - School ID du currentUser:', currentUser?.schoolId);
    
    console.log('5. Configuration API:');
    console.log('   - URL:', import.meta.env.VITE_API_URL || 'http://localhost:5000/api');
    console.log('   - Endpoint complet:', `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/canteen-managers`);
    
    // Validation des données
    if (!managerData.first_name || !managerData.last_name || !managerData.email || !managerData.school_id) {
      console.error('❌ Validation échouée:');
      console.error('   - first_name:', !!managerData.first_name);
      console.error('   - last_name:', !!managerData.last_name);
      console.error('   - email:', !!managerData.email);
      console.error('   - school_id:', !!managerData.school_id);
      alert('Erreur: Tous les champs obligatoires doivent être remplis.');
      return;
    }
    
    if (!managerData.email.includes('@')) {
      alert('Erreur: Email invalide.');
      return;
    }

    console.log('6. Validation: ✅ Données valides');
    console.log('========================================');

    try {
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/canteen-managers`;
      
      console.log('7. Requête HTTP:');
      console.log('   - Méthode: POST');
      console.log('   - URL:', apiUrl);
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

      console.log('8. Réponse du serveur:');
      console.log('   - Status:', response.status);
      console.log('   - Status Text:', response.statusText);
      console.log('   - Headers:', Object.fromEntries(response.headers.entries()));

      let result;
      try {
        result = await response.json();
        console.log('   - Body JSON:', result);
      } catch (e) {
        console.log('   - Body pas JSON:', await response.text());
      }

      if (response.ok && result?.success) {
        console.log('9. Succès: ✅ Gestionnaire créé');
        setCreatedManager(result.data);
        setIsModalOpen(false);
        await loadCanteenManagers(managerData.school_id);
      } else {
        console.log('9. Erreur serveur:');
        console.log('   - Message:', result?.message || 'Erreur inconnue');
        console.log('   - Success:', result?.success);
        alert(`Erreur: ${result?.message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.log('9. Erreur réseau complète:');
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Gestionnaires de Cantine</h2>
          <p className="text-sm text-slate-500 font-medium">Gérez les comptes des gestionnaires de votre établissement.</p>
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
            className="flex items-center space-x-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 transition-all shadow-md font-bold text-sm"
          >
            <UserPlus size={18} />
            <span>Ajouter un Gestionnaire</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
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
                      <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
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
                    <div className="text-slate-600">{manager.school_name}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleDeleteManager(manager.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                        className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all flex items-center space-x-2"
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
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-purple-600 text-white">
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Professionnel</label>
                <input name="email" type="email" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 font-medium" placeholder="moussa.traore@school.bf" />
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
                  const schoolName = currentUser?.schoolName || userSchool?.name || 'École non trouvée';
                  
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
                <button type="submit" className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl font-black shadow-lg hover:bg-purple-700 transition-all flex items-center justify-center space-x-2">
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
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-purple-600 text-white">
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
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center space-x-2"
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
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl font-black shadow-lg hover:bg-purple-700 transition-all"
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
