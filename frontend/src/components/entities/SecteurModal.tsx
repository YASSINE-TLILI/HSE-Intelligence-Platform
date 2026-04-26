import React, { useEffect, useState } from 'react';
import { X, Layers, Save, Loader2, Lock } from 'lucide-react';
import type { Secteur } from '../../types/entities';
import { useSecteurSelectData } from '../../hooks/useEntities';

interface SecteurModalProps {
  open: boolean;
  mode: 'create' | 'edit' | 'view';
  secteur?: Secteur | null;
  defaultZoneId?: number;
  lockedZone?: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Secteur>) => Promise<void>;
}

// Formulaire typé explicitement pour éviter les erreurs "does not exist on type '{}'"
interface SecteurForm {
  id_secteur?: number;
  nom_secteur?: string;
  description?: string;
  id_zone?: number;
  id_responsable_secteur?: number;
  zone_nom?: string;
  entite_nom?: string;
  responsable?: Secteur['responsable'];
}

const SecteurModal: React.FC<SecteurModalProps> = ({
  open, mode, secteur, defaultZoneId, lockedZone = false, onClose, onSubmit,
}) => {
  const [form, setForm] = useState<SecteurForm>({});
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { zones, users, loading: loadingSelect } = useSecteurSelectData(open);

  useEffect(() => {
    if (open) {
      if (secteur) {
        setForm({ ...secteur });
      } else {
        setForm({ id_zone: defaultZoneId });
      }
      setErrors({});
    }
  }, [open, secteur, defaultZoneId]);

  const isView = mode === 'view';
  const title =
    mode === 'create' ? 'Nouveau Secteur' :
    mode === 'edit'   ? 'Modifier Secteur'  :
                        'Détails Secteur';

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nom_secteur?.trim()) e.nom_secteur = 'Le nom est requis';
    if (!form.id_zone)             e.id_zone     = 'La zone est requise';
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

  const zoneNom =
    form.zone_nom ??
    zones.find(z => z.id_zone === form.id_zone)?.nom_zone ??
    (form.id_zone ? `Zone #${form.id_zone}` : '-');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f1520] border border-[#1e2940] rounded-2xl w-full max-w-lg shadow-2xl z-10 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2940]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Layers size={18} className="text-violet-400" />
            </div>
            <h2 className="text-white font-semibold text-base">{title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {loadingSelect && (
          <div className="flex items-center gap-2 px-6 py-2 bg-violet-500/10 border-b border-violet-500/20">
            <Loader2 size={13} className="animate-spin text-violet-400" />
            <span className="text-violet-300 text-xs">Chargement des données…</span>
          </div>
        )}

        <div className="px-6 py-5 space-y-4">

          {/* Nom */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Nom du secteur <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.nom_secteur ?? ''}
              disabled={isView}
              onChange={e => setForm(f => ({ ...f, nom_secteur: e.target.value }))}
              placeholder="Ex: Secteur Production"
              className={`w-full bg-[#1a2235] border rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600
                focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-60
                ${errors.nom_secteur ? 'border-red-500' : 'border-[#2a3550]'}`}
            />
            {errors.nom_secteur && <p className="text-red-400 text-xs mt-1">{errors.nom_secteur}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Description
            </label>
            <textarea
              value={form.description ?? ''}
              disabled={isView}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description optionnelle…"
              rows={3}
              className="w-full bg-[#1a2235] border border-[#2a3550] rounded-xl px-4 py-2.5 text-white text-sm
                placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors
                disabled:opacity-60 resize-none"
            />
          </div>

          {/* Zone */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                Zone <span className="text-red-400">*</span>
                {lockedZone && !isView && <Lock size={10} className="text-gray-500" />}
              </span>
            </label>
            {isView || lockedZone ? (
              <div className="bg-[#1a2235] border border-[#2a3550] rounded-xl px-4 py-2.5 text-white text-sm flex items-center justify-between">
                <span>{zoneNom}</span>
                {lockedZone && !isView && <Lock size={12} className="text-gray-500" />}
              </div>
            ) : (
              <select
                value={form.id_zone ?? ''}
                disabled={loadingSelect}
                onChange={e => setForm(f => ({ ...f, id_zone: e.target.value ? Number(e.target.value) : undefined }))}
                className={`w-full bg-[#1a2235] border rounded-xl px-4 py-2.5 text-white text-sm
                  focus:outline-none focus:border-violet-500 transition-colors appearance-none disabled:opacity-50
                  ${errors.id_zone ? 'border-red-500' : 'border-[#2a3550]'}`}
              >
                <option value="">{loadingSelect ? 'Chargement…' : 'Sélectionner une zone…'}</option>
                {zones.map(z => (
                  <option key={z.id_zone} value={z.id_zone}>
                    {z.nom_zone}{z.entite_nom ? ` — ${z.entite_nom}` : ''}
                  </option>
                ))}
              </select>
            )}
            {errors.id_zone && <p className="text-red-400 text-xs mt-1">{errors.id_zone}</p>}
          </div>

          {/* Responsable Secteur */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Responsable Secteur
            </label>
            {isView ? (
              <div className="bg-[#1a2235] border border-[#2a3550] rounded-xl px-4 py-2.5 text-white text-sm">
                {form.responsable
                  ? `${form.responsable.prenom} ${form.responsable.nom}`
                  : <span className="text-gray-500">Non assigné</span>}
              </div>
            ) : (
              <select
                value={form.id_responsable_secteur ?? ''}
                disabled={loadingSelect}
                onChange={e => setForm(f => ({
                  ...f,
                  id_responsable_secteur: e.target.value ? Number(e.target.value) : undefined,
                }))}
                className="w-full bg-[#1a2235] border border-[#2a3550] rounded-xl px-4 py-2.5 text-white text-sm
                  focus:outline-none focus:border-violet-500 transition-colors appearance-none disabled:opacity-50"
              >
                <option value="">{loadingSelect ? 'Chargement…' : 'Aucun responsable'}</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.prenom} {u.nom} — {u.email}</option>
                ))}
              </select>
            )}
          </div>

          {/* Info entité parente en mode view */}
          {isView && form.entite_nom && (
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3">
              <p className="text-xs text-violet-300 font-medium">Entité parente</p>
              <p className="text-white text-sm mt-0.5">{form.entite_nom}</p>
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
              className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium
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

export default SecteurModal;