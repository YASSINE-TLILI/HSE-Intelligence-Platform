import React, { useState } from 'react';
import { AlertTriangle, Clock, CheckCircle2, Timer } from 'lucide-react';
import { useIncidents } from '../../store';
import KPICard from '../ui/KPICard';
import EvolutionChart from './EvolutionChart';
import RiskScore from './RiskScore';
import RecentIncidents from './RecentIncidents';
import ZoneHeatmap from './ZoneHeatmap';

export default function Dashboard() {
  const [chartRange, setChartRange]       = useState('30J');
  const [incidentFilter, setIncidentFilter] = useState('Tous');
  const { incidents } = useIncidents();

  const totalIncidents    = incidents.length;
  const criticalIncidents = incidents.filter(i => i.priority === 'Critique' || i.priority === 'Haute').length;
  const resolvedIncidents = incidents.filter(i => i.status === 'Résolu').length;
  const resolutionRate    = totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-8">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Incidents total"       value={totalIncidents.toString()}    trend="↑ 12%" trendUp={true}  icon={AlertTriangle} iconColor="text-red-500"     iconBg="bg-red-50" />
        <KPICard title="Incidents critiques"   value={criticalIncidents.toString()} trend="↑ 5"   trendUp={true}  icon={Timer}         iconColor="text-amber-500"   iconBg="bg-amber-50" />
        <KPICard title="Délai moyen traitement" value="4.2h"                        trend="↓ 18%" trendUp={false} icon={Clock}         iconColor="text-blue-500"    iconBg="bg-blue-50"    trendGood={true} />
        <KPICard title="Taux de clôture"        value={`${resolutionRate}%`}        trend="↑ 6%"  trendUp={true}  icon={CheckCircle2}  iconColor="text-emerald-500" iconBg="bg-emerald-50" trendGood={true} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Évolution des incidents</h2>
              <p className="text-sm text-slate-500">Incidents déclarés vs résolus</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {['7J', '30J', '90J'].map((r) => (
                <button key={r} onClick={() => setChartRange(r)} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${chartRange === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{r}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-[250px]">
            <EvolutionChart range={chartRange} />
          </div>
        </div>

        {/* Risk Score */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Score de risque par zone</h2>
            <p className="text-sm text-slate-500">Gravité × Probabilité × Exposition</p>
          </div>
          <div className="flex-1"><RiskScore /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Incidents récents</h2>
              <p className="text-sm text-slate-500">Triés par score de priorité</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {['Tous', 'Critiques'].map((f) => (
                <button key={f} onClick={() => setIncidentFilter(f)} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${incidentFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{f}</button>
              ))}
            </div>
          </div>
          <div className="flex-1"><RecentIncidents filter={incidentFilter} /></div>
        </div>

        {/* Heatmap */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Heatmap des zones</h2>
            <p className="text-sm text-slate-500">Densité incidents par secteur</p>
          </div>
          <div className="flex-1 flex items-center justify-center"><ZoneHeatmap /></div>
        </div>
      </div>
    </div>
  );
}