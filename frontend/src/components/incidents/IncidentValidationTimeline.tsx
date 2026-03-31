import React, { useEffect } from 'react';
import { useValidations } from '../../hooks';

export default function IncidentValidationTimeline({ incidentId }: { incidentId: number }) {
  const { history, loadHistory } = useValidations();

  useEffect(() => { void loadHistory(incidentId); }, [incidentId]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Timeline de validation</h3>
      <div className="space-y-3">
        {history.map((item) => (
          <div key={item.id_validation} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-sm font-semibold text-slate-800">{item.niveau} - {item.statut}</p>
            <p className="text-xs text-slate-600">{item.description || '-'}</p>
          </div>
        ))}
        {history.length === 0 && (
          <p className="text-slate-500 text-sm">Aucune validation pour cet incident.</p>
        )}
      </div>
    </div>
  );
}