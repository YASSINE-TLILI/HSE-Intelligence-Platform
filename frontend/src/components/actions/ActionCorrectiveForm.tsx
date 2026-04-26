import React, { useState } from 'react';
import {
  ClipboardList, CheckCircle2, User, MessageSquare,
  CalendarRange, AlertCircle, Loader2, Plus, UserCheck
} from 'lucide-react';
import { apiRequest } from '../../services/api';

export interface ActionCorrectiveFormProps {
  incidentId: number;
  incidentTitle?: string;
  userId: number;
  userName: string;
  onCreated: () => void;
  onCancel?: () => void;
  compact?: boolean;
}

export function ActionCorrectiveForm({
  incidentId,
  incidentTitle,
  userId,
  userName,
  onCreated,
  onCancel,
  compact = false
}: ActionCorrectiveFormProps) {
  const [description, setDescription] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFinPrevue, setDateFinPrevue] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const today = new Date().toISOString().split('T')[0];

  const submit = async () => {
    if (!description.trim()) {
      setError('La description est obligatoire.');
      return;
    }
    if (!dateDebut) {
      setError('La date de début est obligatoire.');
      return;
    }
    if (!dateFinPrevue) {
      setError('La date de fin prévue est obligatoire.');
      return;
    }
    if (dateFinPrevue < dateDebut) {
      setError('La date de fin doit être postérieure à la date de début.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiRequest(`/api/incidents/${incidentId}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          description: description.trim(),
          dateDebut,
          dateFinPrevue,
          idResponsableSecteur: userId
        }),
      });
      
      setSuccess(true);
      setDescription('');
      setDateDebut('');
      setDateFinPrevue('');
      
      setTimeout(() => {
        setSuccess(false);
        onCreated();
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création de l'action corrective.");
    } finally {
      setLoading(false);
    }
  };

  const inputClassName = `w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 placeholder:text-slate-300 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed`;

  return (
    <div className="rounded-xl border border-emerald-200 bg-white overflow-hidden shadow-sm">
      {/* En-tête */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700">
        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
          <ClipboardList size={14} className="text-white" />
        </div>
        <div>
          <span className="text-sm font-bold text-white">Nouvelle action corrective</span>
          <p className="text-[10px] text-emerald-100 font-medium">
            Incident #{String(incidentId).padStart(6, '0')}
            {incidentTitle && ` — ${incidentTitle.substring(0, 30)}${incidentTitle.length > 30 ? '…' : ''}`}
          </p>
        </div>
        <span className="ml-auto text-[10px] font-mono bg-emerald-500/30 px-2 py-0.5 rounded text-emerald-50">
          RESPONSABLE SECTEUR
        </span>
      </div>

      <div className={`p-4 space-y-4 ${compact ? 'text-sm' : ''}`}>
        {/* Responsable (auto-rempli) */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <UserCheck size={14} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Responsable</p>
            <p className="text-sm text-slate-800 font-semibold truncate">{userName || '—'}</p>
          </div>
          <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            <MessageSquare size={12} className="inline mr-1.5 text-slate-400" />
            Description de l'action <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={compact ? 2 : 3}
            placeholder="Décrivez précisément l'action corrective à mettre en place…"
            className={inputClassName + ' resize-none'}
            disabled={loading || success}
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              <CalendarRange size={12} className="inline mr-1.5 text-slate-400" />
              Date de début <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={dateDebut}
              min={today}
              onChange={e => setDateDebut(e.target.value)}
              className={inputClassName}
              disabled={loading || success}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              <CalendarRange size={12} className="inline mr-1.5 text-slate-400" />
              Date de fin prévue <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={dateFinPrevue}
              min={dateDebut || today}
              onChange={e => setDateFinPrevue(e.target.value)}
              className={inputClassName}
              disabled={loading || success}
            />
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-emerald-700">Action corrective créée avec succès</p>
              <p className="text-[10px] text-emerald-600">La liste des actions va être actualisée…</p>
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => void submit()}
            disabled={loading || success || !description.trim() || !dateDebut || !dateFinPrevue}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all active:scale-[0.98] shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Création…
              </>
            ) : (
              <>
                <Plus size={14} />
                Créer l'action corrective
              </>
            )}
          </button>
          
          {onCancel && !success && (
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}