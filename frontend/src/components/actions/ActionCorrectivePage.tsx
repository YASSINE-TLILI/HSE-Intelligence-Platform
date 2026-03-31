import React, { useState } from 'react';
import { useActions } from '../../hooks';

export default function ActionCorrectivePage() {
  const { currentAction, error, load, createForIncident, validate, close } = useActions();
  const [incidentId, setIncidentId]       = useState('1');
  const [actionId, setActionId]           = useState('');
  const [description, setDescription]     = useState('');
  const [dateDebut, setDateDebut]         = useState('');
  const [dateFinPrevue, setDateFinPrevue] = useState('');

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Créer Action Corrective</h2>
        <input value={incidentId} onChange={(e) => setIncidentId(e.target.value)} placeholder="ID incident" className="w-full mb-2 border rounded-lg px-3 py-2" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="w-full mb-2 border rounded-lg px-3 py-2" />
        <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="w-full mb-2 border rounded-lg px-3 py-2" />
        <input type="date" value={dateFinPrevue} onChange={(e) => setDateFinPrevue(e.target.value)} className="w-full mb-3 border rounded-lg px-3 py-2" />
        <button
          type="button"
          onClick={() => void createForIncident(Number(incidentId), { description, dateDebut, dateFinPrevue })}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white"
        >
          Créer
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Gérer Action</h2>
        <input value={actionId} onChange={(e) => setActionId(e.target.value)} placeholder="ID action" className="w-full mb-2 border rounded-lg px-3 py-2" />
        <div className="flex gap-2 mb-3">
          <button type="button" onClick={() => void load(Number(actionId))}        className="px-3 py-2 rounded-lg bg-slate-800 text-white">Charger</button>
          <button type="button" onClick={() => void validate(Number(actionId))}    className="px-3 py-2 rounded-lg bg-emerald-600 text-white">Valider</button>
          <button type="button" onClick={() => void close(Number(actionId))}       className="px-3 py-2 rounded-lg bg-red-600 text-white">Clôturer</button>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {currentAction && (
          <pre className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 overflow-auto">
            {JSON.stringify(currentAction, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}