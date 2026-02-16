import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Search, Trash2 } from 'lucide-react';

interface SchoolReport {
  id: string;
  schoolName: string;
  adminName: string;
  period: string;
  receivedAt: string;
  revenueTotal: number;
  attendanceRate: number;
  status: 'pending' | 'validated' | 'flagged';
  highlights: string[];
  recommendations: string[];
  content?: string;
  sourceReportId?: string;
}

const SUPER_ADMIN_REPORTS_STORAGE_KEY = 'dabali_express_super_admin_reports_v1';

const mockSchoolReports: SchoolReport[] = [
  {
    id: 'SAR-2026-02-OUA',
    schoolName: 'Ecole Primaire de Ouagadougou',
    adminName: 'Kone Ibrahim',
    period: 'Fevrier 2026',
    receivedAt: '2026-03-01',
    revenueTotal: 3675000,
    attendanceRate: 89.4,
    status: 'validated',
    highlights: [
      'Objectif financier depasse de +5%',
      'Taux de presence superieur a 85%',
      'Gaspillage maitrise (3%)'
    ],
    recommendations: [
      'Budget: 500,000 FCFA pour nouvel equipement (frigo).',
      'Systeme: ajout des QR codes eleves (cout estime 100,000 FCFA).',
      'Formation avancee gestion nutritionnelle (150,000 FCFA).'
    ]
  },
  {
    id: 'SAR-2026-02-BOB',
    schoolName: 'Ecole Primaire de Bobo',
    adminName: 'Sanon Pierre-Marie',
    period: 'Fevrier 2026',
    receivedAt: '2026-03-02',
    revenueTotal: 1980000,
    attendanceRate: 82.1,
    status: 'pending',
    highlights: [
      'Objectif financier non atteint (-8%)',
      'Presence en baisse semaine 2',
      'Retards de livraisons signales'
    ],
    recommendations: [
      'Renforcer la chaine d approvisionnement locale.',
      'Former l equipe sur le suivi des stocks.'
    ]
  },
  {
    id: 'SAR-2026-02-KDG',
    schoolName: 'College de Koudougou',
    adminName: 'Yameogo Felicite',
    period: 'Fevrier 2026',
    receivedAt: '2026-03-03',
    revenueTotal: 2450000,
    attendanceRate: 86.7,
    status: 'flagged',
    highlights: [
      'Ecart depenses > 10%',
      'Abonnements expires non renouveles eleves'
    ],
    recommendations: [
      'Audit des depenses operationnelles.',
      'Campagne de relance des abonnements expires.'
    ]
  }
];

const formatCurrency = (value: number) => new Intl.NumberFormat('fr-FR').format(value);

const SuperAdminReports: React.FC = () => {
  const [search, setSearch] = useState('');
  const [reports, setReports] = useState<SchoolReport[]>([]);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    const loadReports = () => {
      try {
        const raw = localStorage.getItem(SUPER_ADMIN_REPORTS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed)) {
          setReports(parsed as SchoolReport[]);
          return;
        }
      } catch {
        // Ignore parsing errors and keep fallback data.
      }

      setReports([]);
    };

    loadReports();
    const onStorage = () => loadReports();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (reports.length === 0) {
      setSelectedId('');
      return;
    }

    if (!reports.some((report) => report.id === selectedId)) {
      setSelectedId(reports[0].id);
    }
  }, [reports, selectedId]);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return reports;
    return reports.filter((report) => (
      report.schoolName.toLowerCase().includes(query)
      || report.adminName.toLowerCase().includes(query)
      || report.period.toLowerCase().includes(query)
    ));
  }, [reports, search]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedId),
    [reports, selectedId]
  );

  const handleDownload = () => {
    if (!selectedReport) return;

    const content = selectedReport.content?.trim()
      ? selectedReport.content
      : [
          `Rapport School Admin - ${selectedReport.period}`,
          `Ecole : ${selectedReport.schoolName}`,
          `School Admin : ${selectedReport.adminName}`,
          `Date de reception : ${selectedReport.receivedAt}`,
          `Revenus totaux : ${formatCurrency(selectedReport.revenueTotal)} FCFA`,
          `Taux de presence : ${selectedReport.attendanceRate}%`,
          '',
          'Points cles :',
          ...selectedReport.highlights.map((item) => `- ${item}`),
          '',
          'Recommandations :',
          ...selectedReport.recommendations.map((item) => `- ${item}`)
        ].join('\n');

    const blob = new Blob(['\ufeff', content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport_super_admin_${selectedReport.period.replace(/\s+/g, '_')}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDeleteReport = () => {
    if (!selectedReport) return;
    const confirmed = window.confirm(`Supprimer le rapport "${selectedReport.period}" de ${selectedReport.schoolName} ?`);
    if (!confirmed) return;

    const nextReports = reports.filter((report) => report.id !== selectedReport.id);
    setReports(nextReports);
    setSelectedId(nextReports[0]?.id || '');
    try {
      localStorage.setItem(SUPER_ADMIN_REPORTS_STORAGE_KEY, JSON.stringify(nextReports));
    } catch {
      // Ignore local storage write failures.
    }
  };

  const statusBadge = (status: SchoolReport['status']) => {
    if (status === 'validated') return 'bg-emerald-100 text-emerald-700';
    if (status === 'flagged') return 'bg-rose-100 text-rose-700';
    return 'bg-amber-100 text-amber-700';
  };

  const reportContent = selectedReport?.content?.trim()
    || [
      `Rapport School Admin - ${selectedReport?.period || '-'}`,
      `Ecole : ${selectedReport?.schoolName || '-'}`,
      `School Admin : ${selectedReport?.adminName || '-'}`,
      `Date de reception : ${selectedReport?.receivedAt || '-'}`,
      '',
      'Points cles :',
      ...(selectedReport?.highlights || []).map((item) => `- ${item}`),
      '',
      'Recommandations :',
      ...(selectedReport?.recommendations || []).map((item) => `- ${item}`)
    ].join('\n');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="surface-card p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="section-title">Rapports des ecoles</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Consultez les rapports envoyes par les School Admins.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDeleteReport}
            disabled={!selectedReport}
            className="flex items-center gap-2 bg-rose-600 text-white px-5 py-2.5 rounded-xl hover:bg-rose-700 transition-all font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
            Supprimer
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!selectedReport}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-all font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            Exporter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        <div className="surface-card p-6 space-y-4">
          <div className="flex items-center gap-2 card-muted px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une ecole..."
              className="w-full bg-transparent text-sm font-medium text-slate-600 outline-none"
            />
          </div>

          <div className="space-y-3">
            {filteredReports.length === 0 && (
              <div className="card-muted p-4 text-sm font-bold text-slate-600">
                Aucun rapport trouve.
              </div>
            )}

            {filteredReports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedId(report.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedId === report.id
                    ? 'border-emerald-500/30 bg-emerald-50/40'
                    : 'border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-slate-800">{report.schoolName}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{report.period}</p>
                    <p className="text-xs text-slate-500 mt-2">Admin : {report.adminName}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${statusBadge(report.status)}`}>
                    {report.status === 'validated' ? 'Valide' : report.status === 'flagged' ? 'A verifier' : 'En attente'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="surface-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="section-title">Resume du rapport</h3>
              <FileText size={18} className="text-slate-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card-muted p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ecole</p>
                <p className="mt-2 text-sm font-bold text-slate-800">{selectedReport?.schoolName || '-'}</p>
                <p className="text-xs text-slate-500">Admin : {selectedReport?.adminName || '-'}</p>
              </div>
              <div className="card-muted p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Revenus</p>
                <p className="mt-2 text-sm font-bold text-slate-800">{formatCurrency(selectedReport?.revenueTotal || 0)} FCFA</p>
                <p className="text-xs text-slate-500">Periode : {selectedReport?.period || '-'}</p>
              </div>
              <div className="card-muted p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Presence</p>
                <p className="mt-2 text-sm font-bold text-slate-800">{selectedReport?.attendanceRate || 0}%</p>
                <p className="text-xs text-slate-500">Recu le {selectedReport?.receivedAt || '-'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-black text-slate-800">Points cles</h4>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  {(selectedReport?.highlights || []).map((item, index) => (
                    <div key={`${item}-${index}`} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-black text-slate-800">Recommandations</h4>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  {(selectedReport?.recommendations || []).map((item, index) => (
                    <div key={`${item}-${index}`} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contenu complet du rapport recu</label>
              <textarea
                rows={16}
                readOnly
                value={reportContent}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminReports;
