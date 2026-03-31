import React from 'react';
import { useIncidents } from '../../store';

const ZONES = [
  { id: 'C', name: 'Zone Production A',  color: 'bg-red-500',     bg: 'bg-red-50',     text: 'text-red-700' },
  { id: 'H', name: 'Zone Stockage Nord', color: 'bg-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700' },
  { id: 'M', name: 'Zone Maintenance',   color: 'bg-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700' },
  { id: 'L', name: 'Zone Administrative',color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
];

export default function RiskScore() {
  const { incidents } = useIncidents();

  const zoneStats = ZONES.map((zone) => {
    const zoneIncidents = incidents.filter(i => i.zone === zone.name && i.status !== 'Résolu');
    const score         = Math.min(100, zoneIncidents.reduce((acc, curr) => acc + curr.score, 0));
    return { ...zone, incidentsCount: zoneIncidents.length, score };
  }).sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col gap-4">
      {zoneStats.map((zone, index) => (
        <div key={index} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group active:scale-[0.99]">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${zone.bg} ${zone.text} group-hover:scale-105 transition-transform`}>
            {zone.id}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-slate-900">{zone.name}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{zone.incidentsCount} incidents actifs</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 w-24">
            <span className="text-base font-bold text-slate-900">{zone.score}</span>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${zone.color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${zone.score}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}