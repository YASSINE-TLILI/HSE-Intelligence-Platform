import React, { useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Legend,
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useReports } from '../../hooks';
import { apiRequest, apiUrl, getCurrentUserId } from '../../services/api';
import {AIInsightsPanel} from './index';
import type { ReportScopeType } from '../../types/index';

export default function ReportsPage() {
  const { reports, loading, error, generate } = useReports();
  const [dateStart, setDateStart]         = useState('');
  const [dateEnd, setDateEnd]             = useState('');
  const [scopeType, setScopeType]         = useState<ReportScopeType>('GLOBAL');
  const [scopeId, setScopeId]             = useState('');
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [selectedReport, setSelectedReport]     = useState<any | null>(null);
  const [reportError, setReportError]           = useState('');
  const currentUserId = getCurrentUserId();

  const getReportPdfUrl  = (id: number) => apiUrl(`/api/reports/${id}/pdf${currentUserId  ? `?userId=${currentUserId}`  : ''}`);
  const getReportXlsxUrl = (id: number) => apiUrl(`/api/reports/${id}/xlsx${currentUserId ? `?userId=${currentUserId}` : ''}`);

  const loadReportDetails = async (reportId: number) => {
    try {
      setReportError('');
      const query = currentUserId ? `?userId=${currentUserId}` : '';
      const data  = await apiRequest(`/api/reports/${reportId}${query}`);
      setSelectedReportId(reportId);
      setSelectedReport(data);
    } catch (e) {
      setReportError(e instanceof Error ? e.message : 'Erreur chargement rapport');
    }
  };

  const handleGenerate = async () => {
    try {
      setReportError('');
      const created = await generate({ dateStart, dateEnd, scopeType, scopeId: scopeId ? Number(scopeId) : null }) as any;
      if (created?.idReport) {
        await loadReportDetails(Number(created.idReport));
      } else if (created?.content) {
        setSelectedReportId(null);
        setSelectedReport({ id_report: null, contenu_json: created.content });
      }
    } catch (e) {
      setReportError(e instanceof Error ? e.message : 'Erreur génération');
    }
  };

  const analytics = selectedReport?.contenu_json?.analytics;
  const kpi        = selectedReport?.contenu_json?.kpi;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Generation panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Rapports HSE</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="border rounded-lg px-3 py-2" />
          <input type="date" value={dateEnd}   onChange={(e) => setDateEnd(e.target.value)}   className="border rounded-lg px-3 py-2" />
          <select value={scopeType} onChange={(e) => setScopeType(e.target.value as ReportScopeType)} className="border rounded-lg px-3 py-2">
            <option value="GLOBAL">GLOBAL</option>
            <option value="ZONE">ZONE</option>
            <option value="SECTEUR">SECTEUR</option>
          </select>
          <input value={scopeId} onChange={(e) => setScopeId(e.target.value)} placeholder="Scope ID (optionnel)" className="border rounded-lg px-3 py-2" />
          <button type="button" onClick={() => void handleGenerate()} className="rounded-lg bg-blue-600 text-white px-4 py-2">Générer</button>
        </div>
        {loading     && <p className="text-slate-500">Chargement rapports...</p>}
        {error       && <p className="text-red-600">{error}</p>}
        {reportError && <p className="text-red-600">{reportError}</p>}
        <div className="space-y-2">
          {reports.map((report) => (
            <div key={report.id_report} className="p-3 border rounded-lg bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">Rapport #{report.id_report}</p>
                <p className="text-xs text-slate-600">{report.periode_debut} → {report.periode_fin} ({report.scope_type})</p>
              </div>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => void loadReportDetails(report.id_report)} className="text-sm text-slate-700 font-medium">Voir graphes</button>
                <a href={getReportPdfUrl(report.id_report)}  target="_blank" rel="noreferrer" className="text-sm text-blue-600 font-medium">PDF</a>
                <a href={getReportXlsxUrl(report.id_report)} target="_blank" rel="noreferrer" className="text-sm text-emerald-600 font-medium">Excel</a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics panel */}
      {selectedReport && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <h3 className="text-lg font-bold text-slate-900">
            Analyse du rapport {selectedReport.id_report ? `#${selectedReport.id_report}` : ''}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500">Incidents</p><p className="text-xl font-semibold">{kpi?.totalIncidents ?? 0}</p></div>
            <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500">Risque moyen</p><p className="text-xl font-semibold">{Number(kpi?.averageRisk ?? 0).toFixed(2)}</p></div>
            <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500">Risque élevé</p><p className="text-xl font-semibold">{kpi?.highRiskIncidents ?? 0}</p></div>
            <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500">Taux clôture</p><p className="text-xl font-semibold">{Number(kpi?.closedRatePercent ?? 0).toFixed(2)}%</p></div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {[
              { title: 'Tendance journalière incidents', data: analytics?.trendDaily ?? [],       dataKey: 'incidents',  color: '#2563eb' },
              { title: 'Risque moyen journalier',        data: analytics?.averageRiskDaily ?? [], dataKey: 'averageRisk', color: '#dc2626' },
            ].map(({ title, data, dataKey, color }) => (
              <div key={dataKey} className="h-72 border rounded-lg p-3">
                <p className="text-sm font-semibold mb-2">{title}</p>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" /><YAxis /><Tooltip /><Legend />
                    <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
            {[
              { title: 'Répartition par statut',  data: analytics?.byStatus  ?? [], dataKey: 'count', xKey: 'statut',  color: '#0ea5e9' },
              { title: 'Répartition par gravité', data: analytics?.byGravite ?? [], dataKey: 'count', xKey: 'gravite', color: '#f97316' },
            ].map(({ title, data, dataKey, xKey, color }) => (
              <div key={xKey} className="h-72 border rounded-lg p-3">
                <p className="text-sm font-semibold mb-2">{title}</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={xKey} /><YAxis allowDecimals={false} /><Tooltip /><Legend />
                    <Bar dataKey={dataKey} fill={color} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDF preview */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Aperçu PDF</h3>
          <div className="flex items-center gap-3">
            {selectedReportId && (
              <>
                <a href={getReportPdfUrl(selectedReportId)}  download={`rapport_hse_${selectedReportId}.pdf`} className="text-sm bg-blue-600 text-white px-3 py-2 rounded-lg">Télécharger PDF</a>
                <a href={getReportXlsxUrl(selectedReportId)} className="text-sm bg-emerald-600 text-white px-3 py-2 rounded-lg">Télécharger Excel</a>
              </>
            )}
            {selectedReport && (
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(selectedReport.contenu_json || {}, null, 2)], { type: 'application/json' });
                  const url  = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url; link.download = `rapport_hse_${selectedReportId ?? 'draft'}.json`; link.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-sm bg-slate-700 text-white px-3 py-2 rounded-lg"
              >
                Télécharger JSON
              </button>
            )}
          </div>
        </div>
        {selectedReportId ? (
          <iframe title={`Rapport PDF ${selectedReportId}`} src={getReportPdfUrl(selectedReportId)} className="w-full h-[620px] border rounded-xl" />
        ) : (
          <div className="h-40 border rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
            Sélectionnez un rapport pour afficher son PDF ici.
          </div>
        )}
      </div>

      <AIInsightsPanel />
    </div>
  );
}