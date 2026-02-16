import React, { useState, useEffect } from 'react';
import { Check, X, Clock, Utensils, Calendar, User, AlertCircle, CheckCircle } from 'lucide-react';
import { MenuItem } from '../src/types';
import { api } from '../services/api';

interface MenuApprovalProps {
  isOpen: boolean;
  onClose: () => void;
  onMenuApproved: () => void;
}

const MenuApproval: React.FC<MenuApprovalProps> = ({ isOpen, onClose, onMenuApproved }) => {
  const [pendingMenus, setPendingMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPendingMenus();
    }
  }, [isOpen]);

  const fetchPendingMenus = async () => {
    try {
      setLoading(true);
      const response: any = await api.get('/menus/pending');
      const payload = response?.data || response;
      setPendingMenus(payload?.data || payload || []);
    } catch (error) {
      console.error('Error fetching pending menus:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (menuId: string) => {
    try {
      setProcessingId(menuId);
      await api.put(`/menus/${menuId}/approve`, { approved: true });
      
      setPendingMenus(prev => prev.filter(menu => String(menu.id) !== String(menuId)));
      onMenuApproved();
      
      // Show success message
      alert('Menu approuvé avec succès!');
    } catch (error) {
      console.error('Error approving menu:', error);
      alert('Erreur lors de l\'approbation du menu');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedMenu || !rejectionReason.trim()) {
      alert('Veuillez fournir une raison de rejet');
      return;
    }

    try {
      setProcessingId(String(selectedMenu.id));
      await api.put(`/menus/${selectedMenu.id}/approve`, { 
        approved: false, 
        rejection_reason: rejectionReason 
      });
      
      setPendingMenus(prev => prev.filter(menu => String(menu.id) !== String(selectedMenu.id)));
      onMenuApproved();
      
      // Close dialog and reset
      setShowRejectionDialog(false);
      setSelectedMenu(null);
      setRejectionReason('');
      
      alert('Menu rejeté avec succès!');
    } catch (error) {
      console.error('Error rejecting menu:', error);
      alert('Erreur lors du rejet du menu');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectionDialog = (menu: MenuItem) => {
    setSelectedMenu(menu);
    setShowRejectionDialog(true);
    setRejectionReason('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="surface-card w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-semibold">Menus en Attente de Validation</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Clock className="w-8 h-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-500">Chargement...</span>
            </div>
          ) : pendingMenus.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun menu en attente
              </h3>
              <p className="text-gray-500">
                Tous les menus ont été traités
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingMenus.map((menu) => (
                <div key={menu.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                        Menu du jour
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {formatDate(menu.date)}
                      </div>
                    </div>
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                      EN ATTENTE
                    </span>
                  </div>

                  <div className="mb-3">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {menu.meal_name || menu.description || 'Menu non spécifié'}
                    </h4>
                    {menu.description && menu.meal_name && (
                      <p className="text-sm text-gray-500 mb-1">{menu.description}</p>
                    )}
                    {menu.items && menu.items.length > 0 && (
                      <div className="text-sm text-gray-600">
                        <strong>Plats:</strong>{' '}
                        {menu.items
                          .map((item: any) => {
                            if (typeof item === 'string') return item;
                            const emoji = item?.emoji ? `${item.emoji} ` : '';
                            return `${emoji}${item?.name || ''}`.trim();
                          })
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    )}
                    {menu.allergens && menu.allergens.length > 0 && (
                      <div className="text-sm text-red-600 mt-1">
                        <strong>Allergènes:</strong> {menu.allergens.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <User className="w-4 h-4" />
                      <span>Créé par: {menu.creator_first_name} {menu.creator_last_name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(menu.id)}
                        disabled={processingId === menu.id}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {processingId === menu.id ? (
                          <Clock className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Approuver
                      </button>
                      
                      <button
                        onClick={() => openRejectionDialog(menu)}
                        disabled={processingId === menu.id}
                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {processingId === menu.id ? (
                          <Clock className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        Rejeter
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rejection Dialog */}
      {showRejectionDialog && selectedMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center">
          <div className="surface-card w-full max-w-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold">Rejeter le Menu</h3>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Menu: <strong>{selectedMenu.meal_name || selectedMenu.description}</strong>
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Raison du rejet <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                rows={4}
                placeholder="Veuillez expliquer pourquoi ce menu est rejeté..."
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectionDialog(false);
                  setSelectedMenu(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processingId === selectedMenu.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processingId === selectedMenu.id ? (
                  <Clock className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuApproval;
