import React from 'react';
import { useIncidents } from '../../store';

export default function RecentIncidents({ filter = 'Tous' }: { filter?: string }) {
  const { incidents } = useIncidents();

  const filteredIncidents = filter === 'Critiques'
    ? incidents.filter(i => i.priority === 'Critique' || i.priority === 'Haute')
    : incidents;

  return (
    <div className="flex flex-col gap-3">
      {filteredIncidents.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">Aucun incident récent.</div>
      ) : (
        filteredIncidents.slice(0, 5).map((incident) => (
          <div key={incident.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group active:scale-[0.99]">
            <div className="flex-shrink-0 mt-1 self-start">
              <div className={`w-3 h-3 rounded-full ${
                incident.priority === 'Critique' ? 'bg-red-500 shadow-sm shadow-red-500/40' :
                incident.priority === 'Haute'    ? 'bg-orange-500 shadow-sm shadow-orange-500/40' :
                incident.priority === 'Moyenne'  ? 'bg-amber-500 shadow-sm shadow-amber-500/40' :
                'bg-blue-500 shadow-sm shadow-blue-500/40'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{incident.title}</h4>
              <p className="text-xs text-slate-500 mt-1 truncate">{incident.time} · Signalé par {incident.reporter}</p>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                incident.status === 'En attente' ? 'bg-amber-50 text-amber-700' :
                incident.status === 'En cours'   ? 'bg-blue-50 text-blue-700' :
                'bg-emerald-50 text-emerald-700'
              }`}>
                {incident.status}
              </span>
              <span className="text-lg font-bold text-slate-900 w-8 text-right">{incident.score}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}