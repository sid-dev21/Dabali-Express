import React, { useEffect, useMemo, useState } from 'react';
import { Users, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { ParentOverview } from '../types';
import { usersApi } from '../services/api';

interface ParentsProps {
  initialSearch?: string;
}

const statusLabel = (status: ParentOverview['children'][number]['subscriptionStatus']) => {
  switch (status) {
    case 'ACTIVE':
      return { text: 'Actif', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
    case 'EXPIRED':
      return { text: 'Expire', cls: 'bg-amber-50 text-amber-700 border-amber-100' };
    case 'CANCELLED':
      return { text: 'Annule', cls: 'bg-red-50 text-red-700 border-red-100' };
    default:
      return { text: 'Aucun', cls: 'bg-slate-50 text-slate-600 border-slate-200' };
  }
};

const Parents: React.FC<ParentsProps> = ({ initialSearch = '' }) => {
  const [parents, setParents] = useState<ParentOverview[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  useEffect(() => setSearchTerm(initialSearch), [initialSearch]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await usersApi.getParentsOverview();
        if (cancelled) return;
        setParents(data);
      } catch (err) {
        if (cancelled) return;
        setError("Impossible de charger la vue des parents.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, []);

  const filteredParents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter((parent) => {
      const fullName = `${parent.firstName} ${parent.lastName}`.toLowerCase();
      const childMatch = parent.children.some((child) =>
        `${child.firstName} ${child.lastName}`.toLowerCase().includes(q) ||
        child.className.toLowerCase().includes(q) ||
        child.schoolName.toLowerCase().includes(q)
      );
      return fullName.includes(q) || parent.email.toLowerCase().includes(q) || (parent.phone || '').toLowerCase().includes(q) || childMatch;
    });
  }, [parents, searchTerm]);

  const stats = useMemo(() => {
    const totalParents = parents.length;
    const totalChildren = parents.reduce((sum, parent) => sum + parent.childrenCount, 0);
    const activeChildren = parents.reduce((sum, parent) => sum + parent.activeChildrenCount, 0);
    return { totalParents, totalChildren, activeChildren };
  }, [parents]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100">
          <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">Parents inscrits</p>
          <p className="text-3xl font-black text-slate-800 mt-2">{stats.totalParents}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100">
          <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">Enfants inscrits</p>
          <p className="text-3xl font-black text-slate-800 mt-2">{stats.totalChildren}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100">
          <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">Abonnements actifs</p>
          <p className="text-3xl font-black text-emerald-600 mt-2">{stats.activeChildren}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h3 className="text-xl font-black text-slate-800">Parents et Enfants</h3>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Recherche parent/enfant/ecole..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="px-6 py-4 text-sm text-red-700 bg-red-50 border-b border-red-100">{error}</div>
        )}

        <div className="divide-y divide-slate-100">
          {filteredParents.length > 0 ? filteredParents.map((parent) => {
            const isOpen = expandedId === parent.id;
            return (
              <div key={parent.id}>
                <button
                  onClick={() => setExpandedId(isOpen ? null : parent.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                      <Users size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{parent.firstName} {parent.lastName}</p>
                      <p className="text-xs text-slate-500">{parent.email} {parent.phone ? `| ${parent.phone}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500">{parent.childrenCount} enfant(s)</span>
                    {isOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-5">
                    {parent.children.length > 0 ? (
                      <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 text-[10px] uppercase tracking-widest font-black text-slate-400">
                            <tr>
                              <th className="px-4 py-3">Enfant</th>
                              <th className="px-4 py-3">Classe</th>
                              <th className="px-4 py-3">Ecole</th>
                              <th className="px-4 py-3">Abonnement</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {parent.children.map((child) => {
                              const status = statusLabel(child.subscriptionStatus);
                              return (
                                <tr key={child.id}>
                                  <td className="px-4 py-3 font-bold text-slate-800">{child.firstName} {child.lastName}</td>
                                  <td className="px-4 py-3 text-slate-600">{child.className || '-'}</td>
                                  <td className="px-4 py-3 text-slate-600">{child.schoolName || '-'} {child.schoolCity ? `(${child.schoolCity})` : ''}</td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${status.cls}`}>
                                      {status.text}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-50 text-sm text-slate-500">Aucun enfant pour ce parent.</div>
                    )}
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="p-10 text-center text-slate-400 text-sm font-bold">
              {loading ? 'Chargement...' : 'Aucun parent trouve.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Parents;
