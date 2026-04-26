import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, MapPin, Layers, Plus, Search, RefreshCw,
  Edit2, Trash2, Eye, X, Filter, Shield, AlertCircle, Lock,
} from 'lucide-react';
import { useEntites, useZones, useSecteurs, useEntityScope } from '../../hooks/useEntities';
import EntiteModal from './EntiteModal';
import ZoneModal from './ZoneModal';
import SecteurModal from './SecteurModal';
import ConfirmDialog from '../ui/ConfirmDialog';
import type { Entite, Zone, Secteur, EntityTab } from '../../types/entities';


const TABS: { id: EntityTab; label: string; icon: React.ReactNode; colorClass: string; btnClass: string }[] = [
  { id: 'entites',  label: 'Entités',  icon: <Building2 size={15} />, colorClass: 'text-blue-500',   btnClass: 'bg-blue-600 hover:bg-blue-500 shadow-blue-200' },
  { id: 'zones',    label: 'Zones',    icon: <MapPin size={15} />,    colorClass: 'text-emerald-500', btnClass: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-200' },
  { id: 'secteurs', label: 'Secteurs', icon: <Layers size={15} />,    colorClass: 'text-violet-500',  btnClass: 'bg-violet-600 hover:bg-violet-500 shadow-violet-200' },
];

// ─── SafetyBadge ───────────────────────────────────────────────────────────────
const SafetyBadge = ({ score }: { score?: number }) => {
  if (score === undefined || score === null) return <span className="text-slate-300 text-xs">—</span>;
  const cls =
    score >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : score >= 60 ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
    : score >= 40 ? 'bg-orange-100 text-orange-700 border-orange-200'
    : 'bg-red-100 text-red-700 border-red-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      <Shield size={10} />{score.toFixed(1)}
    </span>
  );
};

// ─── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({ prenom, nom, bg }: { prenom: string; nom: string; bg: string }) => (
  <div className={`w-6 h-6 rounded-full ${bg} flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}>
    {prenom[0]}{nom[0]}
  </div>
);

// ─── TableSkeleton ─────────────────────────────────────────────────────────────
const TableSkeleton = () => (
  <div className="space-y-2 p-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-11 bg-slate-100 rounded-lg animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
    ))}
  </div>
);

// ─── ActionButtons ─────────────────────────────────────────────────────────────
const ActionButtons: React.FC<{ onView: () => void; onEdit: () => void; onDelete: () => void }> = ({ onView, onEdit, onDelete }) => (
  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
    <button onClick={onView}   title="Consulter" className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600   hover:bg-blue-50   transition-all"><Eye   size={14} /></button>
    <button onClick={onEdit}   title="Modifier"  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"><Edit2 size={14} /></button>
    <button onClick={onDelete} title="Supprimer" className="p-1.5 rounded-lg text-slate-400 hover:text-red-600   hover:bg-red-50   transition-all"><Trash2 size={14} /></button>
  </div>
);

// ─── EmptyState ────────────────────────────────────────────────────────────────
const EmptyState = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center justify-center py-14">
    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
      <Search size={22} className="text-slate-400" />
    </div>
    <p className="text-slate-500 font-medium text-sm">Aucun(e) {label} trouvé(e)</p>
    <p className="text-slate-400 text-xs mt-1">Modifiez vos filtres ou créez un(e) nouveau(elle)</p>
  </div>
);

// ─── Main ──────────────────────────────────────────────────────────────────────
const EntitiesPage: React.FC = () => {
  const [activeTab, setActiveTab]           = useState<EntityTab>('entites');
  const [search, setSearch]                 = useState('');
  const [filterEntiteId, setFilterEntiteId] = useState<number | undefined>();
  const [filterZoneId, setFilterZoneId]     = useState<number | undefined>();
  const [showFilters, setShowFilters]       = useState(false);

  const [entiteModal,  setEntiteModal]  = useState<{ open: boolean; mode: 'create'|'edit'|'view'; item?: Entite|null }>({ open: false, mode: 'create' });
  const [zoneModal,    setZoneModal]    = useState<{ open: boolean; mode: 'create'|'edit'|'view'; item?: Zone|null }>({ open: false, mode: 'create' });
  const [secteurModal, setSecteurModal] = useState<{ open: boolean; mode: 'create'|'edit'|'view'; item?: Secteur|null }>({ open: false, mode: 'create' });
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });

  // Scope permissions depuis le backend
  const { scope, loading: scopeLoading } = useEntityScope();

  const entites  = useEntites();
  const zones    = useZones();
  const secteurs = useSecteurs();

  useEffect(() => {
    if (!scope) return;
    if (scope.default_entite_id) {
      setFilterEntiteId(scope.default_entite_id);
    }
    if (scope.default_zone_id) {
      setFilterZoneId(scope.default_zone_id);
    }
  }, [scope]);

  // ─── Debounced search ──────────────────────────────────────────────────────
  const applySearch = useCallback(() => {
    const s = search || undefined;
    if (activeTab === 'entites') {
      entites.applyFilters({ search: s });
    }
    if (activeTab === 'zones') {
      // Verrouiller l'entité si le scope l'impose
      const eid = scope?.locked.entite ? (scope.default_entite_id ?? undefined) : filterEntiteId;
      zones.applyFilters({ search: s, id_entite: eid });
    }
    if (activeTab === 'secteurs') {
      const eid = scope?.locked.entite ? (scope.default_entite_id ?? undefined) : filterEntiteId;
      const zid = scope?.locked.zone ? (scope.default_zone_id ?? undefined) : filterZoneId;
      secteurs.applyFilters({ search: s, id_zone: zid, id_entite: eid });
    }
  }, [activeTab, search, filterEntiteId, filterZoneId, scope]);

  useEffect(() => {
    const t = setTimeout(applySearch, 300);
    return () => clearTimeout(t);
  }, [search, filterEntiteId, filterZoneId, activeTab, scope]);

  const clearFilters = () => {
    setSearch('');
    if (!scope?.locked.entite) setFilterEntiteId(undefined);
    if (!scope?.locked.zone) setFilterZoneId(undefined);
  };

  const activeFilterCount = [
    search,
    !scope?.locked.entite && filterEntiteId,
    !scope?.locked.zone && filterZoneId,
  ].filter(Boolean).length;

  const currentTab = TABS.find(t => t.id === activeTab)!;
  const isLoading  = activeTab === 'entites' ? entites.loading  : activeTab === 'zones' ? zones.loading  : secteurs.loading;
  const currentErr = activeTab === 'entites' ? entites.error    : activeTab === 'zones' ? zones.error    : secteurs.error;
  const currentTot = activeTab === 'entites' ? entites.total    : activeTab === 'zones' ? zones.total    : secteurs.total;

  // Permissions de création déduites du scope
  const canCreateEntite  = scope?.can_create_entite  ?? false;
  const canCreateZone    = scope?.can_create_zone    ?? false;
  const canCreateSecteur = scope?.can_create_secteur ?? false;

  const canCreateCurrent =
    activeTab === 'entites'  ? canCreateEntite :
    activeTab === 'zones'    ? canCreateZone :
    canCreateSecteur;

  const askDelete = (title: string, message: string, onConfirm: () => Promise<void>) => {
    setConfirmDialog({
      open: true, title, message,
      onConfirm: async () => { await onConfirm(); setConfirmDialog(d => ({ ...d, open: false })); },
    });
  };

  // ─── CSS helpers ───────────────────────────────────────────────────────────
  const thCls = 'text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 first:pl-5 bg-slate-50 border-b border-slate-200 whitespace-nowrap';
  const tdCls = 'px-4 py-3 first:pl-5 border-b border-slate-100 text-sm';

  // ─── Tables ────────────────────────────────────────────────────────────────
  const renderEntites = () => (
    <table className="w-full">
      <thead>
        <tr>
          {['#', 'Nom', 'Description', 'Site', 'Responsable HSE', 'Zones', 'Actions'].map(h => (
            <th key={h} className={thCls}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {entites.items.map((e, i) => (
          <tr key={e.id_entite} className="hover:bg-blue-50/50 transition-colors group">
            <td className={tdCls}><span className="text-slate-400 font-mono text-xs">{i + 1}</span></td>
            <td className={tdCls}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Building2 size={13} className="text-blue-600" />
                </div>
                <span className="font-medium text-slate-800">{e.nom_entite}</span>
              </div>
            </td>
            <td className={tdCls}>
              <span className="text-slate-500 line-clamp-1 max-w-[180px] block">
                {e.description || <em className="text-slate-300 not-italic">—</em>}
              </span>
            </td>
            <td className={tdCls}>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                Site {e.id_site}
              </span>
            </td>
            <td className={tdCls}>
              {e.responsable ? (
                <div className="flex items-center gap-1.5">
                  <Avatar prenom={e.responsable.prenom} nom={e.responsable.nom} bg="bg-blue-500" />
                  <span className="text-slate-700">{e.responsable.prenom} {e.responsable.nom}</span>
                </div>
              ) : <em className="text-slate-300 text-xs not-italic">Non assigné</em>}
            </td>
            <td className={tdCls}>
              <span className="font-semibold text-blue-600">{e.nb_zones ?? 0}</span>
              <span className="text-slate-400 text-xs ml-1">zone{(e.nb_zones ?? 0) > 1 ? 's' : ''}</span>
            </td>
            <td className={tdCls}>
              <ActionButtons
                onView={() => setEntiteModal({ open: true, mode: 'view', item: e })}
                onEdit={() => setEntiteModal({ open: true, mode: 'edit', item: e })}
                onDelete={() => askDelete("Supprimer l'entité", `Voulez-vous supprimer "${e.nom_entite}" ? Cette action est irréversible.`, () => entites.remove(e.id_entite))}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderZones = () => (
    <table className="w-full">
      <thead>
        <tr>
          {['#', 'Nom', 'Entité', 'Safety Score', 'Responsable Zone', 'Secteurs', 'Actions'].map(h => (
            <th key={h} className={thCls}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {zones.items.map((z, i) => (
          <tr key={z.id_zone} className="hover:bg-emerald-50/50 transition-colors group">
            <td className={tdCls}><span className="text-slate-400 font-mono text-xs">{i + 1}</span></td>
            <td className={tdCls}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <MapPin size={13} className="text-emerald-600" />
                </div>
                <span className="font-medium text-slate-800">{z.nom_zone}</span>
              </div>
            </td>
            <td className={tdCls}>
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                {z.entite_nom || `Entité #${z.id_entite}`}
              </span>
            </td>
            <td className={tdCls}><SafetyBadge score={z.safety_score} /></td>
            <td className={tdCls}>
              {z.responsable ? (
                <div className="flex items-center gap-1.5">
                  <Avatar prenom={z.responsable.prenom} nom={z.responsable.nom} bg="bg-emerald-500" />
                  <span className="text-slate-700">{z.responsable.prenom} {z.responsable.nom}</span>
                </div>
              ) : <em className="text-slate-300 text-xs not-italic">Non assigné</em>}
            </td>
            <td className={tdCls}>
              <span className="font-semibold text-emerald-600">{z.nb_secteurs ?? 0}</span>
              <span className="text-slate-400 text-xs ml-1">secteur{(z.nb_secteurs ?? 0) > 1 ? 's' : ''}</span>
            </td>
            <td className={tdCls}>
              <ActionButtons
                onView={() => setZoneModal({ open: true, mode: 'view', item: z })}
                onEdit={() => setZoneModal({ open: true, mode: 'edit', item: z })}
                onDelete={() => askDelete('Supprimer la zone', `Voulez-vous supprimer "${z.nom_zone}" ?`, () => zones.remove(z.id_zone))}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderSecteurs = () => (
    <table className="w-full">
      <thead>
        <tr>
          {['#', 'Nom', 'Description', 'Zone', 'Entité', 'Responsable', 'Actions'].map(h => (
            <th key={h} className={thCls}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {secteurs.items.map((s, i) => (
          <tr key={s.id_secteur} className="hover:bg-violet-50/50 transition-colors group">
            <td className={tdCls}><span className="text-slate-400 font-mono text-xs">{i + 1}</span></td>
            <td className={tdCls}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Layers size={13} className="text-violet-600" />
                </div>
                <span className="font-medium text-slate-800">{s.nom_secteur}</span>
              </div>
            </td>
            <td className={tdCls}>
              <span className="text-slate-500 line-clamp-1 max-w-[160px] block">
                {s.description || <em className="text-slate-300 not-italic">—</em>}
              </span>
            </td>
            <td className={tdCls}>
              <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">
                {s.zone_nom || `Zone #${s.id_zone}`}
              </span>
            </td>
            <td className={tdCls}>
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                {s.entite_nom || '—'}
              </span>
            </td>
            <td className={tdCls}>
              {s.responsable ? (
                <div className="flex items-center gap-1.5">
                  <Avatar prenom={s.responsable.prenom} nom={s.responsable.nom} bg="bg-violet-500" />
                  <span className="text-slate-700">{s.responsable.prenom} {s.responsable.nom}</span>
                </div>
              ) : <em className="text-slate-300 text-xs not-italic">Non assigné</em>}
            </td>
            <td className={tdCls}>
              <ActionButtons
                onView={() => setSecteurModal({ open: true, mode: 'view', item: s })}
                onEdit={() => setSecteurModal({ open: true, mode: 'edit', item: s })}
                onDelete={() => askDelete('Supprimer le secteur', `Voulez-vous supprimer "${s.nom_secteur}" ?`, () => secteurs.remove(s.id_secteur))}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">

      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Entités',  value: entites.total,  icon: <Building2 size={14} />, color: 'blue' },
          { label: 'Zones',    value: zones.total,    icon: <MapPin size={14} />,    color: 'emerald' },
          { label: 'Secteurs', value: secteurs.total, icon: <Layers size={14} />,    color: 'violet' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
            <span className={`text-${s.color}-500`}>{s.icon}</span>
            <span className={`text-lg font-bold text-${s.color}-600`}>{s.value}</span>
            <span className="text-slate-500 text-sm">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit border border-slate-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className={activeTab === tab.id ? tab.colorClass : ''}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Rechercher ${currentTab.label.toLowerCase()}…`}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Bouton filtres — masqué si tout est verrouillé */}
        {(activeTab === 'zones' || activeTab === 'secteurs') && !(scope?.locked.entite && scope?.locked.zone) && (
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all shadow-sm ${
              showFilters || activeFilterCount > 0
                ? 'bg-blue-50 border-blue-300 text-blue-600'
                : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
            }`}
          >
            <Filter size={13} />
            Filtres
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => {
            if (activeTab === 'entites') entites.load();
            else if (activeTab === 'zones') zones.load();
            else secteurs.load();
          }}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors shadow-sm"
          title="Rafraîchir"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>

        {/* Bouton créer — conditionnel selon le scope */}
        {canCreateCurrent && (
          <button
            onClick={() => {
              if (activeTab === 'entites')  setEntiteModal({ open: true, mode: 'create' });
              if (activeTab === 'zones')    setZoneModal({ open: true, mode: 'create' });
              if (activeTab === 'secteurs') setSecteurModal({ open: true, mode: 'create' });
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all shadow-md ml-auto ${currentTab.btnClass}`}
          >
            <Plus size={15} />
            {activeTab === 'entites' ? 'Nouvelle Entité' : activeTab === 'zones' ? 'Nouvelle Zone' : 'Nouveau Secteur'}
          </button>
        )}

        {/* Message si création interdite */}
        {!canCreateCurrent && !scopeLoading && scope && (
          <div className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-xs">
            <Lock size={12} />
            Création non autorisée
          </div>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (activeTab === 'zones' || activeTab === 'secteurs') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-4 items-end shadow-sm">

          {/* Filtre par Entité — masqué si verrouillé */}
          {!scope?.locked.entite && (
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Par Entité</label>
              <select
                value={filterEntiteId || ''}
                onChange={e => setFilterEntiteId(e.target.value ? Number(e.target.value) : undefined)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="">Toutes les entités</option>
                {entites.items.map(e => <option key={e.id_entite} value={e.id_entite}>{e.nom_entite}</option>)}
              </select>
            </div>
          )}

          {/* Filtre par Zone — masqué si verrouillé ou si onglet Zones */}
          {activeTab === 'secteurs' && !scope?.locked.zone && (
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Par Zone</label>
              <select
                value={filterZoneId || ''}
                onChange={e => setFilterZoneId(e.target.value ? Number(e.target.value) : undefined)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="">Toutes les zones</option>
                {zones.items.map(z => <option key={z.id_zone} value={z.id_zone}>{z.nom_zone}</option>)}
              </select>
            </div>
          )}

          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-400 hover:text-red-500 text-sm border border-slate-200 hover:border-red-200 transition-colors"
            >
              <X size={13} />Réinitialiser
            </button>
          )}
        </div>
      )}

      {/* Table card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className={currentTab.colorClass}>{currentTab.icon}</span>
            <span className="font-semibold text-slate-700 text-sm">{currentTab.label}</span>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {currentTot} entrée{currentTot > 1 ? 's' : ''}
            </span>
            {/* Indicateur de scope */}
            {scope && scope.role !== 'ADMINISTRATEUR' && (
              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                <Lock size={10} /> Vue restreinte
              </span>
            )}
          </div>
        </div>

        {currentErr && (
          <div className="flex items-center gap-2 px-5 py-3 bg-red-50 border-b border-red-100">
            <AlertCircle size={15} className="text-red-500" />
            <span className="text-red-600 text-sm">{currentErr}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          {isLoading || scopeLoading ? (
            <TableSkeleton />
          ) : (
            <>
              {activeTab === 'entites'  && (entites.items.length  ? renderEntites()  : <EmptyState label="entités" />)}
              {activeTab === 'zones'    && (zones.items.length    ? renderZones()    : <EmptyState label="zones" />)}
              {activeTab === 'secteurs' && (secteurs.items.length ? renderSecteurs() : <EmptyState label="secteurs" />)}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <EntiteModal
        open={entiteModal.open}
        mode={entiteModal.mode}
        entite={entiteModal.item}
        onClose={() => setEntiteModal(m => ({ ...m, open: false }))}
        onSubmit={async (data) => {
          if (entiteModal.mode === 'create') await entites.create(data);
          else if (entiteModal.mode === 'edit' && entiteModal.item) await entites.update(entiteModal.item.id_entite, data);
        }}
      />

      <ZoneModal
        open={zoneModal.open}
        mode={zoneModal.mode}
        zone={zoneModal.item}
        defaultEntiteId={scope?.default_entite_id ?? undefined}
        lockedEntite={scope?.locked.entite ?? false}
        onClose={() => setZoneModal(m => ({ ...m, open: false }))}
        onSubmit={async (data) => {
          if (zoneModal.mode === 'create') await zones.create(data);
          else if (zoneModal.mode === 'edit' && zoneModal.item) await zones.update(zoneModal.item.id_zone, data);
        }}
      />

      <SecteurModal
        open={secteurModal.open}
        mode={secteurModal.mode}
        secteur={secteurModal.item}
        defaultZoneId={scope?.default_zone_id ?? undefined}
        lockedZone={scope?.locked.zone ?? false}
        onClose={() => setSecteurModal(m => ({ ...m, open: false }))}
        onSubmit={async (data) => {
          if (secteurModal.mode === 'create') await secteurs.create(data);
          else if (secteurModal.mode === 'edit' && secteurModal.item) await secteurs.update(secteurModal.item.id_secteur, data);
        }}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="Supprimer"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(d => ({ ...d, open: false }))}
      />
    </div>
  );
};

export default EntitiesPage;