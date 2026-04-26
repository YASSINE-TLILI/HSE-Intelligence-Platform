// src/components/dashboard/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, BarChart3, Activity } from 'lucide-react';
import { useIncidents } from '../../store';
import KPICard from '../ui/KPICard';
import RecentIncidents from './RecentIncidents';
import ZoneHeatmap from './ZoneHeatmap';
import TopDeclarants from './TopDeclarants';
import { apiRequest } from '../../services/api';
import type { IncidentStats } from '../../types/index';

export default function Dashboard() {
  const [incidentFilter, setIncidentFilter] = useState('Tous');
  const { incidents } = useIncidents();
  const [stats, setStats] = useState<IncidentStats | null>(null);

  // Récupération des statistiques depuis l'API
  useEffect(() => {
    apiRequest<IncidentStats>('/api/incidents/stats')
      .then(setStats)
      .catch(() => setStats(null));
  }, [incidents]);

  // Calculs des statistiques
  const totalAlertes = stats?.total ?? incidents.length;
  const totalIncidents = stats?.total_incidents ?? incidents.filter(i => i.type_incident === 'incident').length;
  const totalAnomalies = stats?.total_anomalies ?? incidents.filter(i => i.type_incident === 'anomalie').length;
  const enCours = stats?.en_cours ?? incidents.filter(i => i.status === 'En attente').length;
  const resolus = stats?.resolus ?? incidents.filter(i => i.status === 'CLOTURE').length;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 md:gap-6 pb-8">
      {/* CSS animations inline */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .stat-card {
          animation: fadeInUp 0.4s ease both;
        }
      `}</style>

      {/* ── KPIs - Première ligne : 5 cartes ───────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <div className="stat-card" style={{ animationDelay: '0ms' }}>
          <KPICard 
            title="Total alertes" 
            value={totalAlertes.toString()} 
            trend="↑ 12%" 
            trendUp={true} 
            icon={BarChart3} 
            iconColor="text-blue-600" 
            iconBg="bg-blue-50" 
          />
        </div>
        <div className="stat-card" style={{ animationDelay: '40ms' }}>
          <KPICard 
            title="Total incidents" 
            value={totalIncidents.toString()} 
            trend="↑ 8" 
            trendUp={true} 
            icon={AlertTriangle} 
            iconColor="text-red-500" 
            iconBg="bg-red-50" 
          />
        </div>
        <div className="stat-card" style={{ animationDelay: '80ms' }}>
          <KPICard 
            title="Total anomalies" 
            value={totalAnomalies.toString()} 
            trend="↑ 4" 
            trendUp={true} 
            icon={BarChart3} 
            iconColor="text-amber-500" 
            iconBg="bg-amber-50" 
          />
        </div>
        <div className="stat-card" style={{ animationDelay: '120ms' }}>
          <KPICard 
            title="En attente" 
            value={enCours.toString()} 
            trend="↑ 3" 
            trendUp={true} 
            icon={Activity} 
            iconColor="text-amber-600" 
            iconBg="bg-amber-50" 
          />
        </div>
        <div className="stat-card" style={{ animationDelay: '160ms' }}>
          <KPICard 
            title="Cloture" 
            value={resolus.toString()} 
            trend="↑ 10%" 
            trendUp={true} 
            icon={CheckCircle2} 
            iconColor="text-emerald-600" 
            iconBg="bg-emerald-50" 
          />
        </div>
      </div>

      {/* ── Top Déclarants (remplace l'Evolution Chart + Risk Score) ────────── */}
      <div className="stat-card bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100"
           style={{ animationDelay: '200ms' }}>
        <TopDeclarants />
      </div>

      {/* ── Recent + Heatmap ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Recent Incidents */}
        <div className="stat-card bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 flex flex-col"
             style={{ animationDelay: '240ms' }}>
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4 md:mb-6">
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-900">Incidents récents</h2>
              <p className="text-xs md:text-sm text-slate-500">Triés par score de priorité</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {['Tous', 'Critiques'].map((f) => (
                <button
                  key={f}
                  onClick={() => setIncidentFilter(f)}
                  className={`px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium rounded-md transition-colors ${incidentFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <RecentIncidents filter={incidentFilter} />
          </div>
        </div>

        {/* Heatmap */}
        <div className="stat-card bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 flex flex-col"
             style={{ animationDelay: '280ms' }}>
          <div className="mb-4 md:mb-6">
            <h2 className="text-base md:text-lg font-bold text-slate-900">Heatmap des zones</h2>
            <p className="text-xs md:text-sm text-slate-500">Densité incidents par secteur</p>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <ZoneHeatmap />
          </div>
        </div>
      </div>
    </div>
  );
}