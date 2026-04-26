import React, { useEffect, useState } from 'react';
import { X, MapPin, Save, Loader2, Lock } from 'lucide-react';
import type { Zone } from '../../types/entities';
import { useZoneSelectData } from '../../hooks/useEntities';

interface ZoneModalProps {
  open: boolean;
  mode: 'create' | 'edit' | 'view';
  zone?: Zone | null;
  defaultEntiteId?: number;
  lockedEntite?: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Zone>) => Promise<void>;
}

// Formulaire typé explicitement pour éviter les erreurs "does not exist on type '{}'"
interface ZoneForm {
  id_zone?: number;
  nom_zone?: string;
  safety_score?: number;
  id_entite?: number;
  id_responsable_zone?: number;
  entite_nom?: string;
  responsable?: Zone['responsable'];
  nb_secteurs?: number;
}

const ZoneModal: React.FC<ZoneModalProps> = ({
  open, mode, zone, defaultEntiteId, lockedEntite = false, onClose, onSubmit,
}) => {
  const [form, setForm] = useState<ZoneForm>({});
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { entites, users, loading: loadingSelect } = useZoneSelectData(open);

  useEffect(() => {
    if (open) {
      if (zone) {
        setForm({ ...zone });
      } else {
        setForm({ id_entite: defaultEntiteId });
      }
      setErrors({});
    }
  }, [open, zone, defaultEntiteId]);

  const isView = mode === 'view';
  const title =
    mode === 'create' ? 'Nouvelle Zone' :
    mode === 'edit'   ? 'Modifier Zone'  :
                        'Détails Zone';

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nom_zone?.trim()) e.nom_zone  = 'Le nom est requis';
    if (!form.id_entite)        e.id_entite = "L'entité est requise";
    if (form.safety_score !== undefined && form.safety_score !== null) {
      if (Number(form.safety_score) < 0 || Number(form.safety_score) > 100)
        e.safety_score = 'Score entre 0 et 100';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const safetyColor = (score?: number | null): string => {
    if (score === undefined || score === null) return 'text-gray-400';
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const safetyLabel = (score: number): string => {
    if (score >= 80) return '🟢 BON';
    if (score >= 60) return '🟡 MOYEN';
    if (score >= 40) return '🟠 FAIBLE';
    return '🔴 CRITIQUE';
  };

  const entiteNom =
    form.entite_nom ??
    entites.find(e => e.id_entite === form.id_entite)?.nom_entite ??
    (form.id_entite ? `Entité #${form.id_entite}` : '-');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f1520] border border-[#1e2940] rounded-2xl w-full max-w-lg shadow-2xl z-10 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2940]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <MapPin size={18} className="text-emerald-400" />
            </div>
            <h2 className="text-white font-semibold text-base">{title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {loadingSelect && (
          <div className="flex items-center gap-2 px-6 py-2 bg-emerald-500/10 border-b border-emerald-500/20">
            <Loader2 size={13} className="animate-spin text-emerald-400" />
            <span className="text-emerald-300 text-xs">Chargement des données…</span>
          </div>
        )}

        <div className="px-6 py-5 space-y-4">

          {/* Nom */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Nom de la zone <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.nom_zone ?? ''}
              disabled={isView}
              onChange={e => setForm(f => ({ ...f, nom_zone: e.target.value }))}
              placeholder="Ex: Zone A"
              className={`w-full bg-[#1a2235] border rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600
                focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-60
                ${errors.nom_zone ? 'border-red-500' : 'border-[#2a3550]'}`}
            />
            {errors.nom_zone && <p className="text-red-400 text-xs mt-1">{errors.nom_zone}</p>}
          </div>

          {/* Entité */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                Entité <span className="text-red-400">*</span>
                {lockedEntite && !isView && <Lock size={10} className="text-gray-500" />}
              </span>
            </label>
            {isView || lockedEntite ? (
              <div className="bg-[#1a2235] border border-[#2a3550] rounded-xl px-4 py-2.5 text-white text-sm flex items-center justify-between">
                <span>{entiteNom}</span>
                {lockedEntite && !isView && <Lock size={12} className="text-gray-500" />}
              </div>
            ) : (
              <select
                value={form.id_entite ?? ''}
                disabled={loadingSelect}
                onChange={e => setForm(f => ({ ...f, id_entite: e.target.value ? Number(e.target.value) : undefined }))}
                className={`w-full bg-[#1a2235] border rounded-xl px-4 py-2.5 text-white text-sm
                  focus:outline-none focus:border-emerald-500 transition-colors appearance-none disabled:opacity-50
                  ${errors.id_entite ? 'border-red-500' : 'border-[#2a3550]'}`}
              >
                <option value="">{loadingSelect ? 'Chargement…' : 'Sélectionner une entité…'}</option>
                {entites.map(e => (
                  <option key={e.id_entite} value={e.id_entite}>{e.nom_entite}</option>
                ))}
              </select>
            )}
            {errors.id_entite && <p className="text-red-400 text-xs mt-1">{errors.id_entite}</p>}
          </div>

          {/* Safety Score */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Safety Score (0–100)
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={form.safety_score ?? ''}
                disabled={isView}
                onChange={e => setForm(f => ({
                  ...f,
                  safety_score: e.target.value ? Number(e.target.value) : undefined,
                }))}
                placeholder="Ex: 75.5"
                className={`w-full bg-[#1a2235] border rounded-xl px-4 py-2.5 text-sm placeholder-gray-600
                  focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-60
                  ${safetyColor(form.safety_score)}
                  ${errors.safety_score ? 'border-red-500' : 'border-[#2a3550]'}`}
              />
              {form.safety_score !== undefined && form.safety_score !== null && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <span className={`text-xs font-bold ${safetyColor(form.safety_score)}`}>
                    {safetyLabel(Number(form.safety_score))}
                  </span>
                </div>
              )}
            </div>
            {errors.safety_score && <p className="text-red-400 text-xs mt-1">{errors.safety_score}</p>}
          </div>

          {/* Responsable Zone */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Responsable Zone
            </label>
            {isView ? (
              <div className="bg-[#1a2235] border border-[#2a3550] rounded-xl px-4 py-2.5 text-white text-sm">
                {form.responsable
                  ? `${form.responsable.prenom} ${form.responsable.nom}`
                  : <span className="text-gray-500">Non assigné</span>}
              </div>
            ) : (
              <select
                value={form.id_responsable_zone ?? ''}
                disabled={loadingSelect}
                onChange={e => setForm(f => ({
                  ...f,
                  id_responsable_zone: e.target.value ? Number(e.target.value) : undefined,
                }))}
                className="w-full bg-[#1a2235] border border-[#2a3550] rounded-xl px-4 py-2.5 text-white text-sm
                  focus:outline-none focus:border-emerald-500 transition-colors appearance-none disabled:opacity-50"
              >
                <option value="">{loadingSelect ? 'Chargement…' : 'Aucun responsable'}</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.prenom} {u.nom} — {u.email}</option>
                ))}
              </select>
            )}
          </div>

          {/* Info entité en mode view */}
          {isView && form.entite_nom && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              <p className="text-xs text-emerald-300 font-medium">Entité rattachée</p>
              <p className="text-white text-sm mt-0.5">{entiteNom}</p>
            </div>
          )}
        </div>

        {!isView && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#1e2940] bg-[#0a0f1a]">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#2a3550] text-gray-400 hover:text-white text-sm font-medium transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || loadingSelect}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium
                transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {mode === 'create' ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZoneModal;