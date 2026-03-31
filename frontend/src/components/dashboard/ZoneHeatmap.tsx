import React from 'react';

const ZONES    = ['ZA', 'ZB', 'ZC', 'ZD', 'ZE', 'ZF', 'ZG'];
const GRID_DATA = Array.from({ length: 21 }).map((_, i) => {
  if (i === 2 || i === 9 || i === 10) return { risk: 'high',   val: 6 };
  if (i === 6 || i === 15)            return { risk: 'medium', val: 4 };
  if (i === 8)                        return { risk: 'medium', val: 5 };
  return { risk: 'low', val: 0 };
});

export default function ZoneHeatmap() {
  return (
    <div className="flex flex-col items-center w-full max-w-sm">
      {/* Circular Score */}
      <div className="flex items-center justify-center gap-8 mb-10 w-full">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path className="text-slate-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path className="text-cyan-400"  strokeWidth="4" strokeDasharray="78, 100" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold text-slate-900 tracking-tight">78</span>
          </div>
          <p className="text-sm text-slate-500 font-medium mb-4">Score Sécurité Global</p>
          <div className="flex gap-5">
            <div><div className="text-emerald-500 font-bold text-base">+6</div><div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mt-0.5">vs mois préc.</div></div>
            <div><div className="text-blue-500 font-bold text-base">4</div><div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mt-0.5">zones actives</div></div>
            <div><div className="text-amber-500 font-bold text-base">12</div><div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mt-0.5">alertes IA</div></div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="w-full">
        <div className="grid grid-cols-7 gap-2.5 mb-3">
          {GRID_DATA.map((cell, i) => (
            <div key={i} className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold text-white transition-all hover:scale-110 cursor-pointer ${
              cell.risk === 'high'   ? 'bg-red-500 shadow-md shadow-red-500/30' :
              cell.risk === 'medium' ? 'bg-blue-600 shadow-md shadow-blue-600/30' :
              'bg-blue-100 hover:bg-blue-200'
            }`}>
              {cell.val > 0 ? cell.val : ''}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2.5 mt-3">
          {ZONES.map((zone, i) => (
            <div key={i} className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">{zone}</div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between w-full mt-8 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        <span>Faible</span>
        <div className="flex-1 mx-4 h-2 rounded-full bg-gradient-to-r from-blue-100 via-blue-500 to-red-500" />
        <span>Élevé</span>
      </div>
    </div>
  );
}