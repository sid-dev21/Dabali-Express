
import React, { useState, useEffect } from 'react';
import { School as SchoolIcon, Plus, MapPin, Trash2, X, Check, Search, Edit2, Users, Info, AlertTriangle, UserPlus } from 'lucide-react';
import { schoolsApi, studentsApi, authApi } from '../services/api';
import { School } from '../types';

interface SchoolsProps {
  initialSearch?: string;
}

const Schools: React.FC<SchoolsProps> = ({ initialSearch = '' }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);

  const loadSchools = async () => {
    try {
      const schoolsData = await schoolsApi.getSchools();
      setSchools(schoolsData);
    } catch (error: any) {
      console.error('Erreur lors du chargement des écoles:', error);
      setSchools([]);
    }
  };

  useEffect(() => {
    loadSchools();
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        closeDeleteModal();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSchool(null);
  };

  const [showCredentials, setShowCredentials] = useState<{email: string, password: string} | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const closeCredentialsModal = () => {
    setShowCredentials(null);
    closeModal();
    loadSchools();
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSchoolToDelete(null);
  };

  const openDeleteModal = (school: School) => {
    setSchoolToDelete(school);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (schoolToDelete) {
      try {
        const deleted = await schoolsApi.deleteSchool(schoolToDelete.id);
        if (!deleted) {
          alert('Suppression impossible.');
          return;
        }
        await loadSchools();
        closeDeleteModal();
      } catch (error: any) {
        alert(error?.message || 'Erreur lors de la suppression de l ecole.');
      }
    }
  };

  const handleEdit = (school: School) => {
    setEditingSchool(school);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      if (editingSchool) {
        // Mode modification - utiliser l'ancien système
        const schoolData = {
          name: formData.get('schoolName') as string,
          address: formData.get('schoolAddress') as string,
          city: formData.get('schoolCity') as string,
          adminName: formData.get('adminName') as string,
          studentCount: parseInt(formData.get('count') as string) || 0,
          status: formData.get('status') as 'active' | 'inactive',
          lastPaymentDate: editingSchool?.lastPaymentDate || new Date().toLocaleDateString()
        };
        
        const updated = await schoolsApi.updateSchool(editingSchool.id, schoolData);
        if (!updated) {
          alert('Impossible de modifier cette ecole.');
          return;
        }
        closeModal();
        await loadSchools();
      } else {
        // Mode création - utiliser le nouvel endpoint pour créer School Admin
        const schoolAdminData = {
          schoolName: formData.get('schoolName') as string,
          schoolAddress: formData.get('schoolAddress') as string,
          schoolCity: formData.get('schoolCity') as string,
          adminFirstName: formData.get('adminFirstName') as string,
          adminLastName: formData.get('adminLastName') as string,
          adminPhone: formData.get('adminPhone') as string || undefined,
        };
        
        console.log('Création School Admin avec données:', schoolAdminData);
        
        // Vérification du token
        const token = localStorage.getItem('auth_token');
        console.log('Token présent:', !!token);
        console.log('Token (20 premiers chars):', token?.substring(0, 20));
        
        if (!token) {
          alert('Erreur: Vous n\'êtes pas connecté. Veuillez vous reconnecter.');
          return;
        }
        
        // Appeler l'endpoint /schools existant avec les données du School Admin
        const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/schools`;
        console.log('URL de l\'API:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: schoolAdminData.schoolName,
            address: schoolAdminData.schoolAddress,
            city: schoolAdminData.schoolCity,
            // Ajouter les infos du School Admin dans adminName
            adminName: `${schoolAdminData.adminFirstName} ${schoolAdminData.adminLastName}`,
            // Marquer que c'est une création avec School Admin
            createWithAdmin: true,
            adminFirstName: schoolAdminData.adminFirstName,
            adminLastName: schoolAdminData.adminLastName,
            adminPhone: schoolAdminData.adminPhone,
          }),
        });
        
        console.log('Status de la réponse:', response.status);
        console.log('Status Text:', response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erreur HTTP:', response.status, errorText);
          
          try {
            const errorJson = JSON.parse(errorText);
            alert(`Erreur ${response.status}: ${errorJson.message || 'Erreur inconnue'}`);
          } catch (e) {
            alert(`Erreur ${response.status}: ${errorText || 'Erreur réseau'}`);
          }
          return;
        }
        
        const result = await response.json();
        console.log('Réponse succès:', result);
        
        if (response.ok && result.success) {
          console.log('School Admin créé avec succès:', result);
          
          // Afficher les identifiants générés dans une modal
          const credentials = result?.data?.credentials || result?.credentials;
          if (credentials?.email && credentials?.temporaryPassword) {
            setShowCredentials({
              email: credentials.email,
              password: credentials.temporaryPassword
            });
          } else {
            alert('École créée, mais aucun identifiant admin n\'a été renvoyé par le serveur.');
            closeModal();
            await loadSchools();
          }
        } else {
          console.error('Erreur lors de la création:', result);
          alert(`Erreur: ${result.message || 'Impossible de créer le School Admin'}`);
        }
      }
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert(error?.message || 'Erreur reseau lors de la sauvegarde. Veuillez reessayer.');
    }
  };

  const filteredSchools = schools.filter(s => 
    s.name.toLowerCase().includes(initialSearch.toLowerCase()) || 
    s.city.toLowerCase().includes(initialSearch.toLowerCase()) ||
    s.adminName.toLowerCase().includes(initialSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="surface-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="section-title">Écoles Partenaires</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Gestion du réseau national Dabali Express.</p>
        </div>
        <button 
          onClick={() => { setEditingSchool(null); setIsModalOpen(true); }}
          className="btn-primary flex items-center space-x-2 px-5 py-2.5 font-bold text-sm"
        >
          <Plus size={18} />
          <span>Ajouter un Établissement</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredSchools.length > 0 ? filteredSchools.map((school) => (
          <div key={school.id} className="surface-card overflow-hidden transition-all group relative hover:shadow-lg">
            <div className="p-7">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl transition-all shadow-inner ${
                  school.status === 'active' 
                  ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' 
                  : 'bg-slate-100 text-slate-400'
                }`}>
                  <SchoolIcon size={28} />
                </div>
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => handleEdit(school)}
                    className="action-icon text-slate-500 hover:text-slate-800"
                    title="Modifier"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => openDeleteModal(school)}
                    className="action-icon text-slate-500 hover:text-red-600"
                    title="Supprimer"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                   <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter border ${
                    school.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                    {school.status === 'active' ? 'Opérationnel' : 'Inactif'}
                  </span>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">ID: {school.id.substring(0, 8)}</p>
                </div>
                <h3 className="text-xl font-black text-slate-800 leading-tight group-hover:text-emerald-700 transition-colors">{school.name}</h3>
                <div className="flex items-center text-slate-500 text-xs font-bold">
                  <MapPin size={14} className="mr-1.5 text-emerald-500" />
                  {school.city}, {school.address}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-5 mt-6 border-y border-slate-50 bg-slate-50/50 -mx-7 px-7">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Effectif</p>
                  <div className="flex items-center space-x-2">
                    <Users size={14} className="text-slate-400" />
                    <p className="text-lg font-black text-slate-700">{school.studentCount.toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Directeur</p>
                  <p className="text-sm font-bold text-slate-700 truncate">{school.adminName}</p>
                </div>
              </div>

              <div className="mt-6 flex justify-between items-center">
                <button 
                  onClick={() => handleEdit(school)}
                  className="flex items-center space-x-2 text-emerald-600 text-xs font-black uppercase tracking-widest hover:bg-emerald-50 px-4 py-2 rounded-xl transition-all"
                >
                  <Info size={14} />
                  <span>Détails & Gestion</span>
                </button>
                <div className="text-[10px] text-slate-400 font-bold italic uppercase">
                  Dernier point: {school.lastPaymentDate || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-32 text-center card-muted rounded-[3rem] border-dashed">
             <div className="opacity-20 flex flex-col items-center">
                <Search size={64} />
                <p className="mt-4 font-black text-xl uppercase tracking-widest">Aucun établissement trouvé</p>
                <p className="text-sm font-bold">Ajustez votre recherche globale</p>
             </div>
          </div>
        )}
      </div>

      {/* MODAL DE SUPPRESSION (ALERTE) */}
      {isDeleteModalOpen && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300"
          onClick={(e) => e.target === e.currentTarget && closeDeleteModal()}
        >
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-4 border-red-500/10">
            <div className="p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6 animate-bounce">
                <AlertTriangle size={40} />
              </div>
              <h3 className="section-title mb-2">Supprimer l'école ?</h3>
              <p className="text-slate-500 font-medium mb-6">
                Vous êtes sur le point de supprimer <span className="text-red-600 font-bold">"{schoolToDelete?.name}"</span>. 
                Cette action est <span className="uppercase font-black text-red-600">irréversible</span>.
              </p>
              
              <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-left mb-8">
                <p className="text-[10px] font-black text-red-800 uppercase tracking-widest mb-2 flex items-center">
                  <Info size={12} className="mr-1" /> Conséquences :
                </p>
                <ul className="text-xs text-red-700 font-bold space-y-1 opacity-80">
                  <li>• Suppression de tous les comptes élèves</li>
                  <li>• Perte de l'historique des paiements</li>
                  <li>• Suppression des menus planifiés</li>
                  <li>• Désactivation des accès gérants</li>
                </ul>
              </div>

              <div className="flex flex-col space-y-3">
                <button 
                  onClick={confirmDelete}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all uppercase text-xs tracking-widest"
                >
                  Supprimer définitivement
                </button>
                <button 
                  onClick={closeDeleteModal}
                  className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all uppercase text-xs tracking-widest"
                >
                  Annuler l'action
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE MODIFICATION / AJOUT */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className={`p-6 flex justify-between items-center text-white shrink-0 ${editingSchool ? 'bg-slate-800' : 'bg-emerald-600'}`}>
              <div>
                <h3 className="font-black text-2xl">{editingSchool ? 'Modifier École' : 'Nouvelle École'}</h3>
                <p className="text-xs text-white/70 font-bold uppercase tracking-widest mt-1">
                  Dabali Express Administration
                </p>
              </div>
              <button 
                onClick={closeModal} 
                className="bg-white/20 p-2 rounded-full hover:bg-white/30 hover:rotate-90 transition-all focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom Officiel de l'établissement</label>
                <input 
                  name="schoolName" 
                  required 
                  defaultValue={editingSchool?.name}
                  placeholder="ex: Lycée Philippe Zinda Kaboré"
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-700 outline-none" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse Complète</label>
                <input name="schoolAddress" required defaultValue={editingSchool?.address} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-700 outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ville</label>
                <input name="schoolCity" required defaultValue={editingSchool?.city} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-700 outline-none" />
              </div>

              {!editingSchool && (
                <>
                  <div className="border-t border-slate-200 pt-6">
                    <h4 className="text-sm font-black text-slate-700 mb-4 flex items-center">
                      <UserPlus size={16} className="mr-2" />
                      Informations du School Admin
                    </h4>
                    <p className="text-xs text-slate-500 mb-4">
                      Les identifiants seront générés automatiquement et affichés après la création.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom de l'admin</label>
                      <input name="adminFirstName" required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-700 outline-none" placeholder="Jean" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom de l'admin</label>
                      <input name="adminLastName" required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-700 outline-none" placeholder="Traore" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone (optionnel)</label>
                    <input name="adminPhone" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-700 outline-none" placeholder="+22670333333" />
                  </div>
                </>
              )}

              {editingSchool && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Effectif Total</label>
                    <input name="count" type="number" required defaultValue={editingSchool?.studentCount} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-700 outline-none" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Statut du Partenariat</label>
                    <select name="status" defaultValue={editingSchool?.status || 'active'} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-700 outline-none appearance-none">
                      <option value="active">Opérationnel (Actif)</option>
                      <option value="inactive">Suspendu (Inactif)</option>
                    </select>
                  </div>
                </>
              )}

              <div className="pt-6 flex space-x-4 shrink-0 pb-2">
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="flex-1 px-4 py-4 border-2 border-slate-100 rounded-2xl font-black text-slate-400 hover:bg-slate-50 transition-colors uppercase text-xs tracking-widest"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className={`flex-1 px-4 py-4 text-white rounded-2xl font-black shadow-xl transition-all flex items-center justify-center space-x-2 uppercase text-xs tracking-widest ${editingSchool ? 'bg-slate-800 hover:bg-slate-900' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  <Check size={18} />
                  <span>{editingSchool ? 'Enregistrer' : 'Créer le compte'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DES IDENTIFIANTS */}
      {showCredentials && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300"
          onClick={(e) => e.target === e.currentTarget && closeCredentialsModal()}
        >
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-4 border-emerald-500/10">
            <div className="p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mb-6">
                <Check size={40} />
              </div>
              <h3 className="section-title mb-2">Compte Créé avec Succès !</h3>
              <p className="text-slate-500 font-medium mb-6">
                Veuillez sauvegarder ces identifiants et les transmettre au School Admin
              </p>
              
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-left mb-8">
                <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-4 flex items-center">
                  <Info size={12} className="mr-1" /> Identifiants de Connexion :
                </p>
                
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-xl border border-emerald-200">
                    <p className="text-[9px] font-black text-emerald-700 uppercase mb-1">Email</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-800 break-all">{showCredentials.email}</p>
                      <button 
                        onClick={() => copyToClipboard(showCredentials.email)}
                        className="ml-2 p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                        title="Copier l'email"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded-xl border border-emerald-200">
                    <p className="text-[9px] font-black text-emerald-700 uppercase mb-1">Mot de passe temporaire</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-mono font-bold text-slate-800">{showCredentials.password}</p>
                      <button 
                        onClick={() => copyToClipboard(showCredentials.password)}
                        className="ml-2 p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                        title="Copier le mot de passe"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-[9px] font-black text-amber-800 uppercase mb-1">⚠️ Important</p>
                  <p className="text-xs text-amber-700">
                    Le School Admin devra changer son mot de passe lors de la première connexion.
                  </p>
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <button 
                  onClick={() => {
                    copyToClipboard(`Email: ${showCredentials.email}\nMot de passe: ${showCredentials.password}`);
                  }}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all uppercase text-xs tracking-widest flex items-center justify-center space-x-2"
                >
                  <Check size={18} />
                  <span>Copier tout</span>
                </button>
                <button 
                  onClick={closeCredentialsModal}
                  className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all uppercase text-xs tracking-widest"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schools;
