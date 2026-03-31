import React, { useState } from 'react';
import { useSafetyScores } from '../../hooks';

export default function SafetyScorePage() {
  const [zoneId, setZoneId]     = useState('1');
  const [sectorId, setSectorId] = useState('1');
  const { global, zone, sector, error, loadGlobal, loadZone, loadSector } = useSafetyScores();

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-4">Safety Score</h2>
      <div className="flex flex-wrap gap-3 mb-4">
        <button type="button" onClick={() => void loadGlobal()} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Global</button>
        <input value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="border rounded-lg px-3 py-2" placeholder="Zone ID" />
        <button type="button" onClick={() => void loadZone(Number(zoneId))} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Zone</button>
        <input value={sectorId} onChange={(e) => setSectorId(e.target.value)} className="border rounded-lg px-3 py-2" placeholder="Secteur ID" />
        <button type="button" onClick={() => void loadSector(Number(sectorId))} className="px-4 py-2 rounded-lg bg-cyan-600 text-white">Secteur</button>
      </div>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <pre className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 overflow-auto">{JSON.stringify(global,  null, 2)}</pre>
        <pre className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 overflow-auto">{JSON.stringify(zone,    null, 2)}</pre>
        <pre className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 overflow-auto">{JSON.stringify(sector,  null, 2)}</pre>
      </div>
    </div>
  );
}