// src/components/incidents/IncidentsList.tsx
import React, { useMemo, useState, useEffect } from 'react';
import {
  Eye, X, AlertTriangle, Clock,
  CheckCircle2, XCircle, Activity, BarChart3, Lock,
} from 'lucide-react';
import { useIncidents } from '../../store';
import type { Incident, Priority, IncidentStatus, IncidentStats, ScopeFilters, ScopeItem } from '../../types/index';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/api';
import { zonesApi, secteursApi } from '../../services/entitiesApi';
import type { Zone, Secteur } from '../../types/entities';
import { AuthUser } from '../../types/index';
import { AUTH_USER_KEY } from '@/src/constants';

interface IncidentsListProps {
  onEdit: (incident: Incident) => void;
  onView?: (incident: Incident) => void;
}

const PRIORITIES: Priority[] = ['Critique','Moyenne', 'Basse'];
const STATUSES: IncidentStatus[] = ['En attente', 'CLOTURE'];

const PRIORITY_STYLES: Record<Priority, string> = {
  Critique: 'bg-red-100 text-red-700',
  Moyenne:  'bg-amber-100 text-amber-700',
  Basse:    'bg-green-100 text-green-700',
};

const STATUS_STYLES: Record<string, string> = {
  'En attente': 'bg-blue-50 text-blue-700',
  'CLOTURE':     'bg-emerald-50 text-emerald-700',
};

const TYPE_STYLES: Record<string, string> = {
  incident: 'bg-red-50 text-red-600 border border-red-100',
  anomalie: 'bg-amber-50 text-amber-600 border border-amber-100',
};
const getWaitingLabel = (role: string): string => {
  switch (role) {
    case 'RESPONSABLE_SECTEUR':
      return 'En attente validation secteur';
    case 'RESPONSABLE_ZONE':
      return 'En attente validation zone';
    case 'RESPONSABLE_ENTITE':
      return 'En attente validation HSE';
    default:
      return 'En attente';
  }
};
const getWaitingColor = (role: string): string => {
  switch (role) {
    case 'RESPONSABLE_SECTEUR':
      return 'text-blue-600';
    case 'RESPONSABLE_ZONE':
      return 'text-purple-600';
    case 'RESPONSABLE_ENTITE':
      return 'text-indigo-600';
    default:
      return 'text-orange-600';
  }
};
const getWaitingBgColor = (role: string): string => {
  switch (role) {
    case 'RESPONSABLE_SECTEUR':
      return 'bg-blue-50';
    case 'RESPONSABLE_ZONE':
      return 'bg-purple-50';
    case 'RESPONSABLE_ENTITE':
      return 'bg-indigo-50';
    default:
      return 'bg-orange-50';
  }
};




function parseIncidentDate(timeStr: string | undefined | null): Date | null {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (match) {
    const [, dd, mm, yyyy, hh, min] = match;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
  }
  const fallback = new Date(timeStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function toIsoDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps { label: string; value: number; icon: React.ReactNode; colorBg: string; colorIcon: string; sub?: string; }

function KpiCard({ label, value, icon, colorBg, colorIcon, sub }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-3 md:px-4 py-3 md:py-4 flex items-center gap-3">
      <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorBg}`}>
        <span className={colorIcon}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xl md:text-2xl font-bold text-slate-900 leading-none">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5 truncate font-medium">{label}</p>
        {sub && <p className="text-xs text-slate-400 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Scope-aware Hierarchical Filters ────────────────────────────────────────
interface ScopeFiltersProps {
  scopeFilters: ScopeFilters | null;
  selectedEntiteId: number | null;
  selectedZoneId: number | null;
  selectedSecteurId: number | null;
  onEntiteChange: (id: number | null) => void;
  onZoneChange: (id: number | null) => void;
  onSecteurChange: (id: number | null) => void;
}

function ScopeHierarchicalFilters({
  scopeFilters,
  selectedEntiteId,
  selectedZoneId,
  selectedSecteurId,
  onEntiteChange,
  onZoneChange,
  onSecteurChange,
}: ScopeFiltersProps) {
  const [dynamicZones, setDynamicZones] = useState<Zone[]>([]);
  const [dynamicSecteurs, setDynamicSecteurs] = useState<Secteur[]>([]);

  const locked = scopeFilters?.locked ?? { entite: false, zone: false, secteur: false };

  // Pour RESPONSABLE_ENTITE : charger les zones dynamiquement selon l'entité sélectionnée
  useEffect(() => {
    if (locked.zone) return; // zone déjà fournie par le scope
    if (!selectedEntiteId) { setDynamicZones([]); setDynamicSecteurs([]); onZoneChange(null); return; }
    zonesApi.list({ id_entite: selectedEntiteId, limit: 100 })
      .then(r => setDynamicZones(r.items))
      .catch(console.error);
  }, [selectedEntiteId, locked.zone]);

  // Pour RESPONSABLE_ENTITE / RESPONSABLE_ZONE : charger les secteurs
  useEffect(() => {
    if (locked.secteur) return;
    if (!selectedZoneId) { setDynamicSecteurs([]); onSecteurChange(null); return; }
    secteursApi.list({ id_zone: selectedZoneId, limit: 100 })
      .then(r => setDynamicSecteurs(r.items))
      .catch(console.error);
  }, [selectedZoneId, locked.secteur]);

  const sel = (disabled: boolean) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 ${
      disabled
        ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
        : 'bg-slate-50 border-slate-200'
    }`;

  // Résolution des options pour chaque select
  const entiteOptions: ScopeItem[] = scopeFilters?.entites ?? [];
  const zoneOptions: ScopeItem[] = locked.zone
    ? (scopeFilters?.zones ?? [])
    : dynamicZones.map(z => ({ id: z.id_zone, nom: z.nom_zone }));
  const secteurOptions: ScopeItem[] = locked.secteur
    ? (scopeFilters?.secteurs ?? [])
    : dynamicSecteurs.map(s => ({ id: s.id_secteur, nom: s.nom_secteur }));

  const fields = [
    {
      label: 'Entité',
      value: selectedEntiteId,
      items: entiteOptions,
      onChange: onEntiteChange,
      disabled: locked.entite,
    },
    {
      label: 'Zone',
      value: selectedZoneId,
      items: zoneOptions,
      onChange: onZoneChange,
      disabled: locked.zone || (!selectedEntiteId && !locked.entite),
    },
    {
      label: 'Secteur',
      value: selectedSecteurId,
      items: secteurOptions,
      onChange: onSecteurChange,
      disabled: locked.secteur || (!selectedZoneId && !locked.zone),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {fields.map(({ label, value, items, onChange, disabled }) => (
        <div key={label} className="flex flex-col gap-1">
          <label className="text-xs text-slate-400 font-medium flex items-center gap-1">
            {label}
            {disabled && <Lock size={10} className="text-slate-300" />}
          </label>
          <select
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            className={sel(disabled)}
            disabled={disabled}
          >
            <option value="">{disabled && items.length === 1 ? items[0]?.nom : 'Tous'}</option>
            {!disabled && items.map((i) => (
              <option key={i.id} value={i.id}>{i.nom}</option>
            ))}
            {disabled && items.map((i) => (
              <option key={i.id} value={i.id}>{i.nom}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

// ─── Mobile Incident Card ─────────────────────────────────────────────────────
function MobileIncidentCard({ incident, onNavigate }: { incident: Incident; onNavigate: () => void }) {
  return (
    <div
      className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
      onClick={onNavigate}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-semibold text-sm text-slate-900 flex-1 leading-snug">{incident.title}</p>
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${PRIORITY_STYLES[incident.priority]}`}>
          {incident.priority}
        </span>
      </div>
      {incident.description && (
        <p className="text-xs text-slate-400 mb-3 line-clamp-2">{incident.description}</p>
      )}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${TYPE_STYLES[incident.type_incident] || 'bg-slate-100 text-slate-600'}`}>
          {incident.type_incident || '—'}
        </span>
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_STYLES[incident.status] || 'bg-slate-100 text-slate-600'}`}>
          {incident.status}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{incident.entite || '—'}{incident.zone ? ` · ${incident.zone}` : ''}</span>
        <span>{incident.time ? incident.time.split(' ')[0] : '—'}</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function IncidentsList({ onEdit }: IncidentsListProps) {
   const { incidents, isLoading } = useIncidents();
  const navigate = useNavigate();

  // Récupérer l'utilisateur connecté
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  
  const [stats, setStats] = useState<IncidentStats | null>(null);
  const [scopeFilters, setScopeFilters] = useState<ScopeFilters | null>(null);
  const [scopeLoading, setScopeLoading] = useState(true);

  const [selectedEntiteId,  setSelectedEntiteId]  = useState<number | null>(null);
  const [selectedZoneId,    setSelectedZoneId]    = useState<number | null>(null);
  const [selectedSecteurId, setSelectedSecteurId] = useState<number | null>(null);
  const [filterPriority,    setFilterPriority]    = useState<Priority | ''>('');
  const [filterStatus,      setFilterStatus]      = useState<IncidentStatus | ''>('');
  const [filterType,        setFilterType]        = useState<'incident' | 'anomalie' | ''>('');
  const [filterDateFrom,    setFilterDateFrom]    = useState('');
  const [filterDateTo,      setFilterDateTo]      = useState('');

  // Charger l'utilisateur connecté
  useEffect(() => {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (raw) {
      try {
        const user = JSON.parse(raw) as AuthUser;
        setAuthUser(user);
      } catch (e) {
        console.error('Erreur lecture utilisateur:', e);
      }
    }
  }, []);

  // Charger les stats filtrées par scope (côté serveur)
  useEffect(() => {
    apiRequest<IncidentStats>('/api/incidents/stats')
      .then(setStats)
      .catch(() => setStats(null));
  }, [incidents]);

  // Charger les filtres de scope disponibles pour cet utilisateur
  useEffect(() => {
    setScopeLoading(true);
    apiRequest<ScopeFilters>('/api/incidents/scope-filters')
      .then((data) => {
        setScopeFilters(data);
        // Pré-sélectionner les valeurs verrouillées
        if (data.locked.entite && data.entites.length > 0) {
          setSelectedEntiteId(data.entites[0].id);
        }
        if (data.locked.zone && data.zones.length > 0) {
          setSelectedZoneId(data.zones[0].id);
        }
        if (data.locked.secteur && data.secteurs.length > 0) {
          setSelectedSecteurId(data.secteurs[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setScopeLoading(false));
  }, []);

  // Calculer la valeur "en attente" à afficher selon le rôle
  const waitingValue = stats?.waiting_for_validation ?? stats?.en_cours ?? 0;
  const waitingLabel = getWaitingLabel(authUser?.role || '');
  const waitingIconColor = getWaitingColor(authUser?.role || '');
  const waitingBgColor = getWaitingBgColor(authUser?.role || '');

  // Filtrage côté client
  const filtered = useMemo(() => {
    return incidents.filter((incident) => {
      const matchEntite   = !selectedEntiteId  || incident.entiteId === selectedEntiteId;
      const matchSecteur  = !selectedSecteurId || incident.secteurId === selectedSecteurId;
      const matchPriority = !filterPriority    || incident.priority === filterPriority;
      const matchStatus   = !filterStatus      || incident.status === filterStatus;
      const matchType     = !filterType        || incident.type_incident === filterType;
      const incDate = parseIncidentDate(incident.time);
      const matchFrom = !filterDateFrom || (incDate !== null && toIsoDateString(incDate) >= filterDateFrom);
      const matchTo   = !filterDateTo   || (incDate !== null && toIsoDateString(incDate) <= filterDateTo);
      const matchZone = !selectedZoneId || (selectedSecteurId ? true : true);
      return matchEntite && matchSecteur && matchZone && matchPriority && matchStatus && matchType && matchFrom && matchTo;
    });
  }, [incidents, selectedEntiteId, selectedZoneId, selectedSecteurId, filterPriority, filterStatus, filterType, filterDateFrom, filterDateTo]);

  const locked = scopeFilters?.locked ?? { entite: false, zone: false, secteur: false };

  const hasActiveFilters = !!(
    (!locked.entite && selectedEntiteId) ||
    (!locked.zone && selectedZoneId) ||
    (!locked.secteur && selectedSecteurId) ||
    filterPriority || filterStatus || filterType || filterDateFrom || filterDateTo
  );

  const clearFilters = () => {
    if (!locked.entite) setSelectedEntiteId(null);
    if (!locked.zone) setSelectedZoneId(null);
    if (!locked.secteur) setSelectedSecteurId(null);
    setFilterPriority('');
    setFilterStatus('');
    setFilterType('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const formatDate = (timeStr: string | undefined | null): string => {
    const d = parseIncidentDate(timeStr);
    if (!d) return '—';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const sel = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50';

  return (
    <div className="flex flex-col gap-4 md:gap-6">

      {/* ── KPI Stats (filtrées par le serveur selon le scope) ────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <KpiCard
          label="Total alertes"
          value={stats?.total ?? incidents.length}
          icon={<BarChart3 size={18} />}
          colorBg="bg-blue-50"
          colorIcon="text-blue-600"
        />
        <KpiCard
          label="Incidents"
          value={stats?.total_incidents ?? incidents.filter(i => i.type_incident === 'incident').length}
          icon={<AlertTriangle size={18} />}
          colorBg="bg-red-50"
          colorIcon="text-red-600"
        />
        <KpiCard
          label="Anomalies"
          value={stats?.total_anomalies ?? incidents.filter(i => i.type_incident === 'anomalie').length}
          icon={<Activity size={18} />}
          colorBg="bg-amber-50"
          colorIcon="text-amber-600"
        />
        {/* Carte "En attente" dynamique selon le rôle */}
        <KpiCard
          label={waitingLabel}
          value={waitingValue}
          icon={<Clock size={18} />}
          colorBg={waitingBgColor}
          colorIcon={waitingIconColor}
          sub={authUser?.role === 'RESPONSABLE_SECTEUR' ? 'À valider par vous' : 
               authUser?.role === 'RESPONSABLE_ZONE' ? 'En attente de votre validation' :
               authUser?.role === 'RESPONSABLE_ENTITE' ? 'Validation HSE requise' : undefined}
        />
        <KpiCard
          label="Clôturés"
          value={stats?.resolus ?? incidents.filter(i => i.status === 'CLOTURE').length}
          icon={<CheckCircle2 size={18} />}
          colorBg="bg-emerald-50"
          colorIcon="text-emerald-600"
        />
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-5">
        <div className="space-y-4">
          {/* Filtre hiérarchique scope-aware */}
          {scopeLoading ? (
            <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <ScopeHierarchicalFilters
              scopeFilters={scopeFilters}
              selectedEntiteId={selectedEntiteId}
              selectedZoneId={selectedZoneId}
              selectedSecteurId={selectedSecteurId}
              onEntiteChange={setSelectedEntiteId}
              onZoneChange={setSelectedZoneId}
              onSecteurChange={setSelectedSecteurId}
            />
          )}

          <div className="border-t border-slate-100" />

          {/* Second row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
              <label className="text-xs text-slate-400 font-medium">Du</label>
              <input
                type="date"
                value={filterDateFrom}
                max={filterDateTo || undefined}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className={sel}
              />
            </div>
            <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
              <label className="text-xs text-slate-400 font-medium">Au</label>
              <input
                type="date"
                value={filterDateTo}
                min={filterDateFrom || undefined}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className={sel}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-medium">Type</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value as typeof filterType)} className={sel}>
                <option value="">Tous</option>
                <option value="incident">Incident</option>
                <option value="anomalie">Anomalie</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-medium">Priorité</label>
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as Priority | '')} className={sel}>
                <option value="">Toutes</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-medium">Statut</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as IncidentStatus | '')} className={sel}>
                <option value="">Tous</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {hasActiveFilters && (
              <div className="flex flex-col gap-1 justify-end">
                <button
                  onClick={clearFilters}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:text-red-600 border border-slate-200 rounded-lg hover:border-red-200 hover:bg-red-50 transition-colors"
                >
                  <X size={13} /> Effacer
                </button>
              </div>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <p className="mt-3 text-xs text-slate-400">
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} sur {incidents.length}
          </p>
        )}
      </div>

      {/* ── Table (desktop) ──────────────────────────────────────────────────── */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                <th className="px-5 py-3.5 font-medium">Titre</th>
                <th className="px-5 py-3.5 font-medium">Type</th>
                <th className="px-5 py-3.5 font-medium">Entité</th>
                <th className="px-5 py-3.5 font-medium">Secteur</th>
                <th className="px-5 py-3.5 font-medium">Zone</th>
                <th className="px-5 py-3.5 font-medium">Priorité</th>
                <th className="px-5 py-3.5 font-medium">Statut</th>
                <th className="px-5 py-3.5 font-medium">Date</th>
                <th className="px-5 py-3.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Chargement…
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-400 text-sm">
                    {hasActiveFilters ? 'Aucun résultat pour ces filtres.' : 'Aucun incident enregistré.'}
                  </td>
                </tr>
              ) : (
                filtered.map((incident) => (
                  <tr
                    key={incident.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => navigate(`/incidents/${incident.id}`)}
                  >
                    <td className="px-5 py-3.5 max-w-[200px]">
                      <div className="font-semibold text-sm text-slate-900 truncate">{incident.title}</div>
                      {incident.description && (
                        <div className="text-xs text-slate-400 truncate mt-0.5">{incident.description}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${TYPE_STYLES[incident.type_incident] || 'bg-slate-100 text-slate-600'}`}>
                        {incident.type_incident || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                      {incident.entite || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                      {incident.secteur || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                      {incident.zone || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${PRIORITY_STYLES[incident.priority]}`}>
                        {incident.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_STYLES[incident.status] || 'bg-slate-100 text-slate-600'}`}>
                        {incident.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">{formatDate(incident.time)}</td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/incidents/${incident.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg transition-colors"
                      >
                        <Eye size={13} /> Consulter
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Card list (mobile) ───────────────────────────────────────────────── */}
      <div className="md:hidden flex flex-col gap-3">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-slate-400 py-10">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 px-5 py-10 text-center text-slate-400 text-sm">
            {hasActiveFilters ? 'Aucun résultat pour ces filtres.' : 'Aucun incident enregistré.'}
          </div>
        ) : (
          filtered.map((incident) => (
            <MobileIncidentCard
              key={incident.id}
              incident={incident}
              onNavigate={() => navigate(`/incidents/${incident.id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}