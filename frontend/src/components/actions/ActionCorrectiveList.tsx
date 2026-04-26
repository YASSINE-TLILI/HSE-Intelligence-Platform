import React from 'react';
import { Calendar, CalendarRange, ClipboardList, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { ActionCorrective } from '../../types/index';

interface ActionCorrectiveListProps {
  actions: ActionCorrective[];
  loading?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  EN_COURS: {
    label: 'En cours',
    icon: <Clock size={10} />,
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200'
  },
  VALIDEE: {
    label: 'Validée',
    icon: <CheckCircle2 size={10} />,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200'
  },
  CLOTUREE: {
    label: 'Clôturée',
    icon: <CheckCircle2 size={10} />,
    color: 'text-slate-600',
    bg: 'bg-slate-50 border-slate-200'
  },
  REJETEE: {
    label: 'Rejetée',
    icon: <XCircle size={10} />,
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200'
  }
};

export function ActionCorrectiveList({ actions, loading = false }: ActionCorrectiveListProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Chargement des actions…</p>
        </div>
      </div>
    );
  }

  if (!actions.length) {
    return (
      <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center">
          <ClipboardList size={20} className="text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-500">Aucune action corrective</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Utilisez le formulaire ci-dessus pour en créer une.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {actions.map((action) => {
        const status = STATUS_CONFIG[action.statut] || STATUS_CONFIG.EN_COURS;
        
        return (
          <div
            key={action.id_action}
            className={`bg-white rounded-xl border ${status.bg} p-3.5 transition-all hover:shadow-sm`}
          >
            {/* En-tête */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  AC-{String(action.id_action).padStart(4, '0')}
                </span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                  {status.icon}
                  {status.label}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              {action.description}
            </p>

            {/* Dates */}
            <div className="flex items-center gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={11} className="text-slate-400" />
                <span>
                  <span className="text-slate-400">Début :</span>{' '}
                  <span className="font-medium text-slate-700">
                    {new Date(action.date_debut).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarRange size={11} className="text-slate-400" />
                <span>
                  <span className="text-slate-400">Fin prévue :</span>{' '}
                  <span className="font-medium text-slate-700">
                    {new Date(action.date_fin_prevue).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </span>
              </span>
            </div>

            {/* Responsable (si présent) */}
            {action.id_responsable_secteur && (
              <div className="mt-2 pt-2 border-t border-slate-100">
                <p className="text-[10px] text-slate-400">
                  Responsable : <span className="font-medium text-slate-600">{action.id_responsable_secteur}</span>
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}