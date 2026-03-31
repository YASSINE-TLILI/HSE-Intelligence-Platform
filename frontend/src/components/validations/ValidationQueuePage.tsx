import React, { useEffect, useState } from 'react';
import { useValidations } from '../../hooks';
import { AUTH_USER_KEY } from '../../constants/index';
import type { ValidationLevel } from '../../types/index';

const ROLE_BY_LEVEL: Record<ValidationLevel, string[]> = {
  SECTEUR: ['RESPONSABLE_SECTEUR', 'ADMINISTRATEUR'],
  ZONE:    ['RESPONSABLE_ZONE',    'ADMINISTRATEUR'],
  HSE:     ['RESPONSABLE_HSE',     'ADMINISTRATEUR'],
};

export default function ValidationQueuePage() {
  const [level, setLevel]     = useState<ValidationLevel>('SECTEUR');
  const [comment, setComment] = useState('');
  const [role, setRole]       = useState('');
  const { pending, loading, actionLoading, error, loadPending, decide } = useValidations();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      if (!raw) return;
      const user = JSON.parse(raw) as { role?: string };
      setRole(user.role || '');
    } catch { setRole(''); }
  }, []);

  useEffect(() => { void loadPending(level); }, [level]);

  const canDecide = ROLE_BY_LEVEL[level].includes(role);

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">File de validation</h2>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as ValidationLevel)}
          className="border border-slate-200 rounded-xl px-3 py-2"
        >
          <option value="SECTEUR">Niveau Secteur</option>
          <option value="ZONE">Niveau Zone</option>
          <option value="HSE">Niveau HSE</option>
        </select>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Commentaire validation/rejet"
        className="w-full mb-4 border border-slate-200 rounded-xl px-3 py-2"
      />

      {loading && <p className="text-slate-500">Chargement...</p>}
      {!canDecide && (
        <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-sm">
          Votre rôle `{role || 'INCONNU'}` ne peut pas valider au niveau {level}.
        </p>
      )}
      {error && <p className="text-red-600">{error}</p>}

      <div className="space-y-3">
        {pending.map((item) => (
          <div key={item.id_incident} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <p className="font-semibold text-slate-900">{item.titre}</p>
            <p className="text-sm text-slate-600 mb-3">{item.description}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void decide(item.id_incident, level, 'validate', comment)}
                disabled={!canDecide || actionLoading}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Valider
              </button>
              <button
                type="button"
                onClick={() => void decide(item.id_incident, level, 'reject', comment)}
                disabled={!canDecide || actionLoading}
                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Rejeter
              </button>
            </div>
          </div>
        ))}
        {pending.length === 0 && !loading && (
          <p className="text-slate-500 text-sm">Aucun incident en attente à ce niveau.</p>
        )}
      </div>
    </div>
  );
}