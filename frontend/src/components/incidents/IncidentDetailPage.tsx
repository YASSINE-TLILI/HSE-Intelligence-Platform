import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, User, Calendar, AlertTriangle, Activity,
  CheckCircle2, XCircle, Clock, Shield, Building2, Layers,
  ChevronRight, Loader2, Image as ImageIcon,
  TrendingUp, CheckCheck, Ban, ClipboardList,
  FileText, AlertCircle, Plus, Info, MessageSquare
} from 'lucide-react';
import { apiRequest } from '../../services/api';
import { AUTH_USER_KEY } from '../../constants/index';
import type { Incident, ValidationItem, UserRole, ActionCorrective } from '../../types/index';
import { ActionCorrectiveForm, ActionCorrectiveList } from '../actions';

// ─── Constantes métier ────────────────────────────────────────────────────────

const REQUIRED_STATUSES: Partial<Record<UserRole, string[]>> = {
  RESPONSABLE_SECTEUR: ['En attente', 'EN_ATTENTE_VALIDATION_SECTEUR'],
  RESPONSABLE_ZONE: ['EN_ATTENTE_VALIDATION_ZONE'],  // ← Changé: seulement le statut d'attente
  RESPONSABLE_ENTITE: ['EN_ATTENTE_VALIDATION_ENTITE'],  // ← Changé: seulement le statut d'attente
  ADMINISTRATEUR: [
    'En attente',
    'EN_ATTENTE_VALIDATION_SECTEUR',
    'VALIDE_SECTEUR',
    'EN_ATTENTE_VALIDATION_ZONE',
    'VALIDE_ZONE',
    'EN_ATTENTE_VALIDATION_ENTITE',
  ],
};

const REJECT_ALLOWED: UserRole[] = ['RESPONSABLE_SECTEUR', 'ADMINISTRATEUR'];
const ACTION_CORRECTIVE_ROLES: UserRole[] = ['RESPONSABLE_SECTEUR'];

// ─── Configuration des statuts et gravités ───────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  'En attente': { label: 'En attente', color: 'text-slate-700', bg: 'bg-slate-100', dot: 'bg-slate-400' },
  'EN_ATTENTE_VALIDATION_SECTEUR': { label: 'Attente validation secteur', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  'VALIDE_SECTEUR': { label: 'Validé secteur', color: 'text-blue-700', bg: 'bg-blue-100', dot: 'bg-blue-600' },
  'EN_ATTENTE_VALIDATION_ZONE': { label: 'Attente validation zone', color: 'text-teal-700', bg: 'bg-teal-50', dot: 'bg-teal-500' },
  'VALIDE_ZONE': { label: 'Validé zone', color: 'text-teal-700', bg: 'bg-teal-100', dot: 'bg-teal-600' },
  'EN_ATTENTE_VALIDATION_ENTITE': { label: 'Attente validation entité', color: 'text-violet-700', bg: 'bg-violet-50', dot: 'bg-violet-500' },
  'VALIDE_ENTITE': { label: 'Validé entité', color: 'text-violet-700', bg: 'bg-violet-100', dot: 'bg-violet-600' },
  'CLOTURE': { label: 'Clôturé', color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-600' },
  'REJETE': { label: 'Rejeté', color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-500' },
};

const GRAVITY_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  CRITIQUE: { label: 'Critique', color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500' },
  GRAVE: { label: 'Grave', color: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  MODEREE: { label: 'Modérée', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  FAIBLE: { label: 'Faible', color: 'text-green-700', bg: 'bg-green-50', dot: 'bg-green-500' },
  Critique: { label: 'Critique', color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500' },
  Haute: { label: 'Haute', color: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  Moyenne: { label: 'Moyenne', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  Basse: { label: 'Basse', color: 'text-green-700', bg: 'bg-green-50', dot: 'bg-green-500' },
};

const WORKFLOW = [
  { key: 'SECTEUR', label: 'Secteur', done: ['VALIDE_SECTEUR', 'VALIDE_ZONE', 'VALIDE_ENTITE', 'CLOTURE'], active: ['En attente', 'EN_ATTENTE_VALIDATION_SECTEUR'] },
  { key: 'ZONE', label: 'Zone', done: ['VALIDE_ZONE', 'VALIDE_ENTITE', 'CLOTURE'], active: ['VALIDE_SECTEUR', 'EN_ATTENTE_VALIDATION_ZONE'] },
  { key: 'ENTITE', label: 'Entité', done: ['VALIDE_ENTITE', 'CLOTURE'], active: ['VALIDE_ZONE', 'EN_ATTENTE_VALIDATION_ENTITE'] },
];

// ─── Composant WorkflowStepper ──────────────────────────────────────────────

const WorkflowStepper = React.memo(({ statut }: { statut: string }) => {
  if (statut === 'REJETE') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-full text-sm font-semibold text-red-700">
        <Ban size={14} /> Incident rejeté — reclassifié comme anomalie
      </div>
    );
  }
  
  const closed = statut === 'CLOTURE';
  
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {WORKFLOW.map((step, i) => {
        const done = step.done.includes(statut) || closed;
        const active = !closed && step.active.includes(statut);
        
        return (
          <React.Fragment key={step.key}>
            <span 
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                done ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                active ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm shadow-blue-100' :
                'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              {done ? <CheckCheck size={11} className="text-emerald-600" /> :
               active ? <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> :
               <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
              {step.label}
            </span>
            {i < WORKFLOW.length - 1 && (
              <ChevronRight size={12} className={done ? 'text-emerald-300' : 'text-slate-200'} />
            )}
          </React.Fragment>
        );
      })}
      {closed && (
        <>
          <ChevronRight size={12} className="text-emerald-300" />
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle2 size={11} /> Clôturé
          </span>
        </>
      )}
    </div>
  );
});

// ─── Composant ValidationHistory ─────────────────────────────────────────────

const ValidationHistory = React.memo(({ items }: { items: ValidationItem[] }) => {
  const LVLCFG: Record<string, { label: string; color: string; bg: string }> = {
    SECTEUR: { label: 'Secteur', color: 'text-blue-700', bg: 'bg-blue-50' },
    ZONE: { label: 'Zone', color: 'text-teal-700', bg: 'bg-teal-50' },
    ENTITE: { label: 'Entité', color: 'text-violet-700', bg: 'bg-violet-50' },
  };

  if (!items.length) {
    return (
      <div className="text-center py-10">
        <Clock size={32} className="text-slate-200 mx-auto mb-2" />
        <p className="text-sm text-slate-400">Aucune validation enregistrée</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-3">
      <div className="absolute left-[15px] top-3 bottom-3 w-px bg-slate-100 pointer-events-none" />
      {items.map((v) => {
        const lv = LVLCFG[v.niveau] ?? { label: v.niveau, color: 'text-slate-600', bg: 'bg-slate-50' };
        const ok = v.statut === 'VALIDE' || v.statut === 'VALIDE_SECTEUR';
        const ko = v.statut === 'REJETE';
        
        return (
          <div key={v.id_validation} className="relative flex gap-3 pl-2">
            <div 
              className={`relative z-10 w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${
                ok ? 'bg-emerald-500' : ko ? 'bg-red-500' : 'bg-slate-300'
              }`}
            >
              {ok ? <CheckCircle2 size={13} className="text-white" /> :
               ko ? <XCircle size={13} className="text-white" /> :
               <Clock size={13} className="text-white" />}
            </div>
            <div className="flex-1 bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lv.bg} ${lv.color}`}>
                    {lv.label}
                  </span>
                  <span 
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      ok ? 'bg-emerald-100 text-emerald-700' : 
                      ko ? 'bg-red-100 text-red-700' : 
                      'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {ok ? '✓ Validé' : ko ? '✗ Rejeté' : 'En attente'}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {v.date_validation 
                    ? new Date(v.date_validation).toLocaleString('fr-FR', { 
                        day: '2-digit', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }) 
                    : '—'}
                </span>
              </div>
              {(v.nom || v.prenom) && (
                <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                  <User size={10} /> {v.prenom} {v.nom}
                </p>
              )}
              {v.description && (
                <p className="text-xs text-slate-500 mt-1 italic border-l-2 border-slate-200 pl-2">
                  {v.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

// ─── Composant ValidationPanel ──────────────────────────────────────────────

interface ValidationPanelProps {
  incidentId: string;
  incidentTitle: string;
  rawStatut: string;
  userRole: UserRole | '';
  userId: number;
  userName: string;
  validations: ValidationItem[];
  onRefresh: () => void;
}

const ValidationPanel = React.memo(({
  incidentId, 
  incidentTitle, 
  rawStatut, 
  userRole, 
  userId, 
  userName, 
  validations, 
  onRefresh,
}: ValidationPanelProps) => {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'ko'; msg: string } | null>(null);
  const [showACForm, setShowACForm] = useState(false);
  const [actions, setActions] = useState<ActionCorrective[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [localStatut, setLocalStatut] = useState(rawStatut);

  // Synchronisation du statut local
  useEffect(() => {
    setLocalStatut(rawStatut);
  }, [rawStatut]);

  // Force l'affichage du formulaire d'action corrective pour le responsable secteur
  useEffect(() => {
    const isSecteurRole = userRole === 'RESPONSABLE_SECTEUR';
    const hasSecteurValidation = validations.some(
      v => v.niveau === 'SECTEUR' && (v.statut === 'VALIDE_SECTEUR')
    );

    if (isSecteurRole && (rawStatut === 'EN_ATTENTE_VALIDATION_ZONE' || hasSecteurValidation)) {
      setShowACForm(true);
    }
  }, [rawStatut, validations, userRole]);

  const getValidateEndpoint = useCallback((): string | null => {
    if (userRole === 'RESPONSABLE_SECTEUR') return 'validate-sector';
    if (userRole === 'RESPONSABLE_ZONE') {
      if (rawStatut === 'EN_ATTENTE_VALIDATION_ZONE') {
        return 'validate-zone';
      }
      return null;
    }
    if (userRole === 'RESPONSABLE_ENTITE') {
      if (rawStatut === 'EN_ATTENTE_VALIDATION_ENTITE') {
        return 'validate-entite';
      }
      return null;
    }
    if (userRole === 'ADMINISTRATEUR') {
      if (['En attente', 'EN_ATTENTE_VALIDATION_SECTEUR'].includes(rawStatut)) {
        return 'validate-sector';
      }
      if (['EN_ATTENTE_VALIDATION_ZONE'].includes(rawStatut)) {
        return 'validate-zone';
      }
      if (['EN_ATTENTE_VALIDATION_ENTITE'].includes(rawStatut)) {
        return 'validate-entite';
      }
    }
    return null;
  }, [userRole, rawStatut]);

  const validateEndpoint = getValidateEndpoint();
  
  const canAct = useMemo(() => {
  const result = (() => {
    if (!validateEndpoint) return false;
    
    if (userRole === 'RESPONSABLE_ZONE') {
      return rawStatut === 'EN_ATTENTE_VALIDATION_ZONE';
    }
    if (userRole === 'RESPONSABLE_ENTITE') {
      return rawStatut === 'EN_ATTENTE_VALIDATION_ENTITE';
    }
    if (userRole === 'RESPONSABLE_SECTEUR') {
      return ['En attente', 'EN_ATTENTE_VALIDATION_SECTEUR'].includes(rawStatut);
    }
    return true;
  })();
  
  console.log('🔍 [canAct] Résultat:', {
    userRole,
    rawStatut,
    validateEndpoint,
    canAct: result
  });
  
  return result;
}, [validateEndpoint, userRole, rawStatut]);
  const canReject = useMemo(() => {
    return userRole === 'RESPONSABLE_SECTEUR' && 
           ['En attente', 'EN_ATTENTE_VALIDATION_SECTEUR'].includes(rawStatut);
  }, [userRole, rawStatut]);

  const isSecteurRole = userRole === 'RESPONSABLE_SECTEUR';

  const acVisible = isSecteurRole && (
    showACForm ||
    rawStatut === 'EN_ATTENTE_VALIDATION_ZONE' ||
    validations.some(v => v.niveau === 'SECTEUR' && v.statut === 'VALIDE_SECTEUR')
  );

  // Chargement des actions correctives
  useEffect(() => {
    if (!acVisible) return;
    
    setLoadingActions(true);
    apiRequest<ActionCorrective[]>(`/api/incidents/${incidentId}/actions`)
      .then(d => setActions(Array.isArray(d) ? d : []))
      .catch(() => setActions([]))
      .finally(() => setLoadingActions(false));
  }, [acVisible, incidentId]);

  const decide = async (action: 'validate' | 'reject') => {
  if (!canAct && action === 'validate') return;
  if (!canReject && action === 'reject') return;
  
  setLoading(true);
  setFeedback(null);

  let ep = '';
  if (action === 'validate') {
    ep = validateEndpoint!;
  } else {
    ep = 'reject-sector';
  }
  
  try {
    await apiRequest(`/api/incidents/${incidentId}/${ep}`, {
      method: 'POST',
      body: JSON.stringify({ comment: comment.trim() || null }),
    });
    
    setComment('');

    if (action === 'validate') {
      setFeedback({ type: 'ok', msg: 'Incident validé avec succès.' });

      // Mise à jour du statut local selon le rôle
      if (userRole === 'RESPONSABLE_SECTEUR') {
        setLocalStatut('EN_ATTENTE_VALIDATION_ZONE');
        setShowACForm(true);
      } else if (userRole === 'RESPONSABLE_ZONE') {
        setLocalStatut('EN_ATTENTE_VALIDATION_ENTITE');
      } else if (userRole === 'RESPONSABLE_ENTITE') {
        setLocalStatut('CLOTURE');
      }

      setTimeout(() => {
        setFeedback(null);
        onRefresh();
      }, 1500);
    } else {
      setFeedback({ type: 'ko', msg: 'Incident rejeté — reclassifié comme anomalie.' });
      setTimeout(() => {
        setFeedback(null);
        onRefresh();
      }, 2000);
    }
  } catch (e) {
    setFeedback({ 
      type: 'ko', 
      msg: e instanceof Error ? e.message : 'Une erreur est survenue.' 
    });
  } finally {
    setLoading(false);
  }
};

  const ValSummary = React.memo(() => (
    <div className="space-y-1.5">
      {WORKFLOW.map(step => {
        const v = validations.find(x => x.niveau === step.key);
        const done = v?.statut === 'VALIDE' || v?.statut === 'VALIDE_SECTEUR';
        const ko = v?.statut === 'REJETE';
        const colorMap: Record<string, string> = {
          SECTEUR: 'text-blue-700 bg-blue-100',
          ZONE: 'text-teal-700 bg-teal-100',
          ENTITE: 'text-violet-700 bg-violet-100'
        };
        
        return (
          <div key={step.key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-xs font-semibold text-slate-600">{step.label}</span>
            <span 
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                done ? colorMap[step.key] : 
                ko ? 'text-red-700 bg-red-100' : 
                'text-slate-400 bg-slate-100'
              }`}
            >
              {done ? '✓ Validé' : ko ? '✗ Rejeté' : '— En attente'}
            </span>
          </div>
        );
      })}
    </div>
  ));

  const isTerminated = ['CLOTURE', 'REJETE'].includes(rawStatut);
  const sc = STATUS_CFG[rawStatut] ?? STATUS_CFG.EN_ATTENTE;

  return (
    <div className="space-y-4">
      {/* Statut */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${sc.bg}`}>
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dot}`} />
        <span className={`text-sm font-bold ${sc.color}`}>{sc.label}</span>
      </div>

      {/* Progression */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Progression</p>
        <ValSummary />
      </div>

      {/* Panel validation */}
      {!isTerminated && canAct && (
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-blue-600" />
            <span className="text-sm font-bold text-slate-900">Votre décision</span>
          </div>

          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            placeholder="Commentaire (optionnel)…"
            className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
          />

          {feedback && (
            <div 
              className={`flex items-center gap-2 p-3 rounded-lg border text-xs font-medium ${
                feedback.type === 'ok' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {feedback.type === 'ok' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              {feedback.msg}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => void decide('validate')}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Valider
            </button>

            {canReject && (
              <button
                onClick={() => void decide('reject')}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                Rejeter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Message attente */}
      {!isTerminated && !canAct && !acVisible && userRole !== 'DECLARANT' && (
        <div className="flex items-center gap-2 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl">
          <Clock size={13} className="text-slate-400 flex-shrink-0" />
          <p className="text-xs text-slate-500">Cet incident n'est pas encore à votre niveau de validation.</p>
        </div>
      )}

      {/* Section Action Corrective */}
      {acVisible && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={14} className="text-emerald-600" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions correctives</p>
            {!loadingActions && actions.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                {actions.length}
              </span>
            )}
          </div>

          {showACForm && (
            <ActionCorrectiveForm
              incidentId={Number(incidentId)}
              incidentTitle={incidentTitle}
              userId={userId}
              userName={userName}
              onCreated={() => {
                apiRequest<ActionCorrective[]>(`/api/incidents/${incidentId}/actions`)
                  .then(d => setActions(Array.isArray(d) ? d : []))
                  .catch(() => {});
                setShowACForm(false);
                onRefresh();
              }}
              onCancel={() => setShowACForm(false)}
            />
          )}

          {!showACForm && (
            <button
              onClick={() => setShowACForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg transition-all"
            >
              <Plus size={14} /> Nouvelle action corrective
            </button>
          )}

          <ActionCorrectiveList actions={actions} loading={loadingActions} />
        </div>
      )}

      {/* Terminé */}
      {isTerminated && (
        <div 
          className={`rounded-xl border p-4 text-center space-y-2 ${
            rawStatut === 'CLOTURE' 
              ? 'border-emerald-200 bg-emerald-50' 
              : 'border-red-200 bg-red-50'
          }`}
        >
          {rawStatut === 'CLOTURE' ? (
            <>
              <CheckCircle2 size={28} className="text-emerald-600 mx-auto" />
              <p className="text-sm font-bold text-emerald-700">Incident clôturé</p>
            </>
          ) : (
            <>
              <Ban size={28} className="text-red-600 mx-auto" />
              <p className="text-sm font-bold text-red-700">Incident rejeté</p>
            </>
          )}
        </div>
      )}
    </div>
  );
});

// ─── Page Principale ─────────────────────────────────────────────────────────

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [incident, setIncident] = useState<(Incident & { rawStatut?: string }) | null>(null);
  const [validations, setValidations] = useState<ValidationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | ''>('');
  const [userId, setUserId] = useState(0);
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'validations'>('details');

  // Chargement des données utilisateur
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      if (!raw) {
        console.warn('⚠️ Aucun utilisateur dans localStorage');
        return;
      }
      const u = JSON.parse(raw) as { role?: string; id?: number; nom?: string; prenom?: string };
      setUserRole((u.role || '') as UserRole);
      setUserId(u.id || 0);
      setUserName(`${u.prenom || ''} ${u.nom || ''}`.trim());
    } catch (e) {
      console.error('❌ Erreur parsing utilisateur:', e);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const [inc, vals] = await Promise.all([
        apiRequest<Incident & { statut?: string }>(`/api/incidents/${id}`),
        apiRequest<ValidationItem[]>(`/api/incidents/${id}/validations`),
      ]);
      setIncident(inc as any);
      setValidations(Array.isArray(vals) ? vals : []);
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Mémorisation des configurations
  const statusCfg = useMemo(() => {
    const rawStatut = incident?.status || 'En attente';
    return STATUS_CFG[rawStatut] ?? STATUS_CFG.EN_ATTENTE;
  }, [incident]);

  const gravityCfg = useMemo(() => {
    return GRAVITY_CFG[incident?.priority || ''] ?? GRAVITY_CFG.Moyenne;
  }, [incident]);

  const isIncident = useMemo(() => {
    return (incident?.type_incident ?? 'incident') === 'incident';
  }, [incident]);

  const showValPanel = useMemo(() => {
    return ['RESPONSABLE_SECTEUR', 'RESPONSABLE_ZONE', 'RESPONSABLE_ENTITE', 'ADMINISTRATEUR'].includes(userRole);
  }, [userRole]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 size={36} className="animate-spin text-blue-500 mx-auto" />
          <p className="text-sm text-slate-400">Chargement de l'incident…</p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <AlertTriangle size={44} className="text-slate-200 mx-auto" />
          <p className="text-slate-500 font-medium">Incident introuvable</p>
          <button 
            onClick={() => navigate('/incidents')} 
            className="text-sm text-blue-600 hover:underline"
          >
            ← Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  const rawStatut = incident.status;
  const infoItems = [
    { icon: <User size={14} />, label: 'Déclarant', value: incident.reporter },
    { icon: <Calendar size={14} />, label: 'Date', value: incident.time },
    { icon: <Building2 size={14} />, label: 'Entité', value: incident.entite },
    { icon: <Layers size={14} />, label: 'Secteur', value: incident.secteur },
    { icon: <MapPin size={14} />, label: 'Zone', value: incident.zone },
    { icon: <TrendingUp size={14} />, label: 'Score risque', value: incident.score ? `${incident.score} / 100` : '—' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-10 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5">
        <div className="flex items-start gap-4 flex-wrap">
          <button
            onClick={() => navigate('/incidents')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft size={15} /> Retour
          </button>
          
          <div className="w-px h-8 bg-slate-200 self-center hidden sm:block" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                #{String(incident.id).padStart(6, '0')}
              </span>
              
              <span 
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  isIncident 
                    ? 'bg-rose-50 text-rose-700 border-rose-100' 
                    : 'bg-amber-50 text-amber-700 border-amber-100'
                }`}
              >
                {isIncident ? <AlertTriangle size={10} /> : <Activity size={10} />}
                {isIncident ? 'Incident' : 'Anomalie'}
              </span>
              
              <span 
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.color}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </span>
            </div>
            
            <h1 className="text-lg font-bold text-slate-900 leading-snug truncate">
              {incident.title}
            </h1>
          </div>
          
          <div 
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${gravityCfg.bg} ${gravityCfg.color}`}
          >
            <span className={`w-2 h-2 rounded-full ${gravityCfg.dot}`} />
            {gravityCfg.label}
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-100">
          <WorkflowStepper statut={rawStatut} />
        </div>
      </div>

      {/* Corps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            {(['details', 'validations'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === tab 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'details' ? '📋 Détails' : `🔄 Validations (${validations.length})`}
              </button>
            ))}
          </div>

          {/* Détails */}
          {activeTab === 'details' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <FileText size={12} /> Description
                </h3>
                <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed border border-slate-100">
                  {incident.description || <em className="text-slate-400">Aucune description.</em>}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Informations</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {infoItems.map(({ icon, label, value }) => (
                    <div key={label} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-400 font-medium">{label}</p>
                        <p className="text-sm text-slate-800 font-semibold mt-0.5 truncate">{value || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {incident.lat && incident.lng && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <MapPin size={13} className="text-slate-400" />
                  <span className="text-xs font-mono text-slate-600">
                    {incident.lat.toFixed(5)}, {incident.lng.toFixed(5)}
                  </span>
                </div>
              )}

              {incident.photoUrl && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <ImageIcon size={12} /> Photo
                  </h3>
                  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    <img 
                      src={incident.photoUrl} 
                      alt="Preuve" 
                      className="w-full h-56 object-cover"
                      loading="lazy"
                    />
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Validations */}
          {activeTab === 'validations' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-5">Historique des validations</h3>
              <ValidationHistory items={validations} />
            </div>
          )}
        </div>

        {/* Panneau de validation */}
        <div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sticky top-5">
            {showValPanel ? (
              <ValidationPanel
                incidentId={id!}
                incidentTitle={incident.title}
                rawStatut={rawStatut}
                userRole={userRole}
                userId={userId}
                userName={userName}
                validations={validations}
                onRefresh={loadData}
              />
            ) : (
              <div className="space-y-4">
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${statusCfg.bg}`}>
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusCfg.dot}`} />
                  <span className={`text-sm font-bold ${statusCfg.color}`}>{statusCfg.label}</span>
                </div>
                
                <div className="space-y-1.5">
                  {WORKFLOW.map(step => {
                    const v = validations.find(x => x.niveau === step.key);
                    const ok = v?.statut === 'VALIDE' || v?.statut === 'VALIDE_SECTEUR';
                    const ko = v?.statut === 'REJETE';
                    const cm: Record<string, string> = { 
                      SECTEUR: 'text-blue-700 bg-blue-100', 
                      ZONE: 'text-teal-700 bg-teal-100', 
                      ENTITE: 'text-violet-700 bg-violet-100' 
                    };
                    
                    return (
                      <div key={step.key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50">
                        <span className="text-xs font-semibold text-slate-600">{step.label}</span>
                        <span 
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            ok ? cm[step.key] : 
                            ko ? 'text-red-700 bg-red-100' : 
                            'text-slate-400 bg-slate-100'
                          }`}
                        >
                          {ok ? '✓ Validé' : ko ? '✗ Rejeté' : '— En attente'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    Vous n'avez pas les droits pour valider cet incident à son stade actuel.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}