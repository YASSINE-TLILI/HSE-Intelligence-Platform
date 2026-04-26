import React, { useEffect, useState } from 'react';
import { X, Building2, Save, Loader2 } from 'lucide-react';
import type { Entite } from '../../types/entities';
import { useEntiteSelectData } from '../../hooks/useEntities';

interface EntiteModalProps {
  open: boolean;
  mode: 'create' | 'edit' | 'view';
  entite?: Entite | null;
  onClose: () => void;
  onSubmit: (data: Partial<Entite>) => Promise<void>;
}

const EntiteModal: React.FC<EntiteModalProps> = ({ open, mode, entite, onClose, onSubmit }) => {
  const [form, setForm] = useState<Partial<Entite>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Chargement automatique depuis la BDD à chaque ouverture du modal
  const { sites, users, loading: loadingSelect } = useEntiteSelectData(open);

  useEffect(() => {
    if (open) {
      setForm(entite ? { ...entite } : {});
      setErrors({});
    }
  }, [open, entite]);

  const isView = mode === 'view';
  const title =
    mode === 'create' ? 'Nouvelle Entité' :
    mode === 'edit'   ? 'Modifier Entité'  :
                        'Détails Entité';

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nom_entite?.trim()) e.nom_entite = 'Le nom est requis';
    if (!form.id_site)            e.id_site    = 'Le site est requis';
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

  if (!open) return null;

  const siteNom = sites.find(s => s.id_site === form.id_site)?.nom_site ?? `Site ${form.id_site}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f1520] border border-[#1e2940] rounded-2xl w-full max-w-lg shadow-2xl z-10 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2940] bg-gradient-to-r from-[#0f1520] to-[#141d2f]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Building2 size={18} className="text-blue-400" />
            </div>
            <h2 className="text-white font-semibold text-base">{title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Loader overlay pendant le chargement des selects */}
        {loadingSelect && (
          <div className="flex items-center gap-2 px-6 py-2 bg-blue-500/10 border-b border-blue-500/20">
            <Loader2 size={13} className="animate-spin text-blue-400" />
            <span className="text-blue-300 text-xs">Chargement des données…</span>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Nom */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Nom de l'entité <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.nom_entite || ''}
              disabled={isView}
              onChange={e => setForm(f => ({ ...f, nom_entite: e.target.value }))}
              placeholder="Ex: Entité Nord"
              className={`w-full bg-[#1a2235] border rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600
                focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-60
                ${errors.nom_entite ? 'border-red-500' : 'border-[#2a3550]'}`}
            />
            {errors.nom_entite && <p className="text-red-400 text-xs mt-1">{errors.nom_entite}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Description
            </label>
            <textarea
              value={form.description || ''}
              disabled={isView}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description optionnelle…"
              rows={3}
              className="w-full bg-[#1a2235] border border-[#2a3550] rounded-xl px-4 py-2.5 text-white text-sm
                placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors
                disabled:opacity-60 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Site <span className="text-red-400">*</span>
            </label>
            {isView ? (
              <div className="bg-[#1a2235] border border-[#2a3550] rounded-xl px-4 py-2.5 text-white text-sm">
                {siteNom}
              </div>
            ) : (
              <select
                value={form.id_site || ''}
                disabled={loadingSelect}
                onChange={e => setForm(f => ({ ...f, id_site: Number(e.target.value) }))}
                className={`w-full bg-[#1a2235] border rounded-xl px-4 py-2.5 text-white text-sm
                  focus:outline-none focus:border-blue-500 transition-colors appearance-none
                  disabled:opacity-50
                  ${errors.id_site ? 'border-red-500' : 'border-[#2a3550]'}`}
              >
                <option value="">
                  {loadingSelect ? 'Chargement…' : 'Sélectionner un site…'}
                </option>
                {sites.map(s => (
                  <option key={s.id_site} value={s.id_site}>{s.nom_site}</option>
                ))}
              </select>
            )}
            {errors.id_site && <p className="text-red-400 text-xs mt-1">{errors.id_site}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Responsable HSE
            </label>
            {isView ? (
              <div className="bg-[#1a2235] border border-[#2a3550] rounded-xl px-4 py-2.5 text-white text-sm">
                {form.responsable
                  ? `${form.responsable.prenom} ${form.responsable.nom}`
                  : <span className="text-gray-500">Non assigné</span>}
              </div>
            ) : (
              <select
                value={form.id_responsable_entite || ''}
                disabled={loadingSelect}
                onChange={e => setForm(f => ({
                  ...f,
                  id_responsable_entite: e.target.value ? Number(e.target.value) : undefined,
                }))}
                className="w-full bg-[#1a2235] border border-[#2a3550] rounded-xl px-4 py-2.5 text-white text-sm
                  focus:outline-none focus:border-blue-500 transition-colors appearance-none disabled:opacity-50"
              >
                <option value="">
                  {loadingSelect ? 'Chargement…' : 'Aucun responsable'}
                </option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.prenom} {u.nom} — {u.email}
                  </option>
                ))}
              </select>
            )}
          </div>

          {isView && form.id_site && sites.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
              <p className="text-xs text-blue-300 font-medium">Site rattaché</p>
              <p className="text-white text-sm mt-0.5">{siteNom}</p>
            </div>
          )}
        </div>

        {!isView && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#1e2940] bg-[#0a0f1a]">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#2a3550] text-gray-400 hover:text-white
                hover:border-gray-500 text-sm font-medium transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || loadingSelect}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium
                transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting
                ? <Loader2 size={15} className="animate-spin" />
                : <Save size={15} />}
              {mode === 'create' ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EntiteModal;