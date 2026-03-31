import React from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useIncidents } from '../../store';

export default function Statistics() {
  const { incidents } = useIncidents();

  const priorityData = [
    { name: 'Critique', value: incidents.filter(i => i.priority === 'Critique').length, color: '#ef4444' },
    { name: 'Haute',    value: incidents.filter(i => i.priority === 'Haute').length,    color: '#f97316' },
    { name: 'Moyenne',  value: incidents.filter(i => i.priority === 'Moyenne').length,  color: '#eab308' },
    { name: 'Basse',    value: incidents.filter(i => i.priority === 'Basse').length,    color: '#3b82f6' },
  ].filter(item => item.value > 0);

  const statusData = [
    { name: 'En attente', value: incidents.filter(i => i.status === 'En attente').length, color: '#f59e0b' },
    { name: 'En cours',   value: incidents.filter(i => i.status === 'En cours').length,   color: '#3b82f6' },
    { name: 'Résolu',     value: incidents.filter(i => i.status === 'Résolu').length,     color: '#10b981' },
  ].filter(item => item.value > 0);

  const zoneCounts: Record<string, number> = {};
  incidents.forEach(inc => { zoneCounts[inc.zone] = (zoneCounts[inc.zone] || 0) + 1; });
  const zoneData = Object.entries(zoneCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const tooltipStyle = { borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Priority Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Répartition par Priorité</h2>
            <p className="text-sm text-slate-500">Incidents classés par niveau de priorité</p>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={priorityData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {priorityData.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Répartition par Statut</h2>
            <p className="text-sm text-slate-500">État d'avancement des incidents</p>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {statusData.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Zone Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Incidents par Zone</h2>
            <p className="text-sm text-slate-500">Nombre total d'incidents signalés par secteur</p>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Nombre d'incidents" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40}>
                  {zoneData.map((_, i) => <Cell key={`cell-${i}`} fill={i % 2 === 0 ? '#6366f1' : '#818cf8'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}