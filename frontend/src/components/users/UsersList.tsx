import React, { useMemo, useState, useEffect } from 'react';
import {
  Edit2, Trash2, Search, X, Eye,
  Users, ShieldAlert, MapPin, Mail, Phone,
  Building2, Layers, Hash, TrendingUp,
} from 'lucide-react';
import { User as UserIcon } from 'lucide-react';
import { useUsers } from '../../store';
import { apiRequest } from '../../services/api';
import type { User, UserRole, AuthUser } from '../../types/index';
import { AUTH_USER_KEY } from '../../constants';

interface UsersListProps {
  onEdit: (user: User) => void;
  onView?: (user: User) => void;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ScopedStats {
  role: string;
  scope_label: 'secteur' | 'zone' | 'entite' | 'global';
  scope_id: number | null;
  total: number;
  declarants: number;
  responsables_secteur: number;
  responsables_zone: number;
  responsables_entite: number;
  administrateurs: number;
  // extras selon rôle
  responsables_zone_scope?: number;
  responsables_entite_scope?: number;
}

// ─── Constantes ────────────────────────────────────────────────────────────────

const ALL_ROLES: UserRole[] = [
  'ADMINISTRATEUR',
  'DECLARANT',
  'RESPONSABLE_ENTITE',
  'RESPONSABLE_ZONE',
  'RESPONSABLE_SECTEUR',
];

const ROLE_STYLES: Record<UserRole, string> = {
  ADMINISTRATEUR:      'bg-purple-100 text-purple-700',
  DECLARANT:           'bg-gray-100 text-gray-700',
  RESPONSABLE_ENTITE:  'bg-emerald-100 text-emerald-700',
  RESPONSABLE_ZONE:    'bg-yellow-100 text-yellow-700',
  RESPONSABLE_SECTEUR: 'bg-blue-100 text-blue-700',
};

const ROLE_LABELS: Record<UserRole, string> = {
  ADMINISTRATEUR:      'Administrateur',
  DECLARANT:           'Déclarant',
  RESPONSABLE_ENTITE:  'Resp. Entité',
  RESPONSABLE_ZONE:    'Resp. Zone',
  RESPONSABLE_SECTEUR: 'Resp. Secteur',
};

// ─── Rôles filtrables par rôle connecté ────────────────────────────────────────

function getFilterableRoles(currentRole: string): UserRole[] {
  switch (currentRole) {
    case 'RESPONSABLE_SECTEUR':
      // Peut filtrer uniquement les déclarants de son secteur
      return ['DECLARANT'];
    case 'RESPONSABLE_ZONE':
      // Peut filtrer déclarants et responsables secteur de sa zone
      return ['DECLARANT', 'RESPONSABLE_SECTEUR'];
    case 'RESPONSABLE_ENTITE':
      // Peut filtrer déclarants, resp secteur, resp zone de son entité
      return ['DECLARANT', 'RESPONSABLE_SECTEUR', 'RESPONSABLE_ZONE'];
    default:
      // Admin : tous
      return ALL_ROLES;
  }
}

// ─── KPI cards config par rôle ─────────────────────────────────────────────────

interface KpiDef {
  label: string;
  getValue: (stats: ScopedStats) => number;
  icon: React.ReactNode;
  iconBg: string;
  sub?: string;
}

function getKpiDefs(role: string): KpiDef[] {
  const totalKpi: KpiDef = {
    label: 'Total utilisateurs',
    getValue: (s) => s.total,
    icon: <Users size={20} className="text-slate-600" />,
    iconBg: 'bg-slate-100',
    sub: 'Dans votre périmètre',
  };

  switch (role) {
    case 'RESPONSABLE_SECTEUR':
      return [
        totalKpi,
        {
          label: 'Déclarants',
          getValue: (s) => s.declarants,
          icon: <ShieldAlert size={20} className="text-gray-600" />,
          iconBg: 'bg-gray-100',
          sub: 'Dans votre secteur',
        },
        {
          label: 'Resp. de Zone',
          getValue: (s) => s.responsables_zone_scope ?? s.responsables_zone,
          icon: <MapPin size={20} className="text-yellow-600" />,
          iconBg: 'bg-yellow-50',
          sub: 'Zone parente',
        },
        {
          label: "Resp. d'Entité",
          getValue: (s) => s.responsables_entite_scope ?? s.responsables_entite,
          icon: <Building2 size={20} className="text-emerald-600" />,
          iconBg: 'bg-emerald-50',
          sub: 'Entité parente',
        },
      ];

    case 'RESPONSABLE_ZONE':
      return [
        totalKpi,
        {
          label: 'Déclarants',
          getValue: (s) => s.declarants,
          icon: <ShieldAlert size={20} className="text-gray-600" />,
          iconBg: 'bg-gray-100',
          sub: 'Dans votre zone',
        },
        {
          label: 'Resp. de Secteur',
          getValue: (s) => s.responsables_secteur,
          icon: <Layers size={20} className="text-blue-600" />,
          iconBg: 'bg-blue-50',
          sub: 'Dans votre zone',
        },
        {
          label: "Resp. d'Entité",
          getValue: (s) => s.responsables_entite_scope ?? s.responsables_entite,
          icon: <Building2 size={20} className="text-emerald-600" />,
          iconBg: 'bg-emerald-50',
          sub: 'Entité parente',
        },
      ];

    case 'RESPONSABLE_ENTITE':
      return [
        totalKpi,
        {
          label: 'Déclarants',
          getValue: (s) => s.declarants,
          icon: <ShieldAlert size={20} className="text-gray-600" />,
          iconBg: 'bg-gray-100',
          sub: 'Dans votre entité',
        },
        {
          label: 'Resp. de Secteur',
          getValue: (s) => s.responsables_secteur,
          icon: <Layers size={20} className="text-blue-600" />,
          iconBg: 'bg-blue-50',
          sub: 'Dans votre entité',
        },
        {
          label: 'Resp. de Zone',
          getValue: (s) => s.responsables_zone,
          icon: <MapPin size={20} className="text-yellow-600" />,
          iconBg: 'bg-yellow-50',
          sub: 'Dans votre entité',
        },
      ];

    // ADMINISTRATEUR et fallback
    default:
      return [
        totalKpi,
        {
          label: 'Déclarants',
          getValue: (s) => s.declarants,
          icon: <ShieldAlert size={20} className="text-gray-600" />,
          iconBg: 'bg-gray-100',
          sub: 'Rôle Déclarant',
        },
        {
          label: 'Resp. Entité',
          getValue: (s) => s.responsables_entite,
          icon: <Building2 size={20} className="text-emerald-600" />,
          iconBg: 'bg-emerald-50',
          sub: 'Rôle Resp. Entité',
        },
        {
          label: 'Resp. Zone',
          getValue: (s) => s.responsables_zone,
          icon: <MapPin size={20} className="text-yellow-600" />,
          iconBg: 'bg-yellow-50',
          sub: 'Rôle Resp. Zone',
        },
      ];
  }
}

// ─── Modal de Consultation Utilisateur ─────────────────────────────────────────

interface ViewUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

function ViewUserModal({ user, isOpen, onClose }: ViewUserModalProps) {
  if (!isOpen || !user) return null;

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-5 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl"><Users size={24} /></div>
                <div>
                  <h2 className="text-xl font-bold">Détails de l'utilisateur</h2>
                  <p className="text-purple-100 text-sm mt-0.5">Consultation en lecture seule</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <UserIcon size={20} className="text-purple-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">{user.prenom} {user.nom}</h3>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${ROLE_STYLES[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: <Mail size={18} />, label: 'EMAIL', value: user.email, breakAll: true },
                { icon: <Phone size={18} />, label: 'TÉLÉPHONE', value: user.telephone },
                { icon: <Building2 size={18} />, label: 'ENTITÉ', value: user.nomEntite },
                { icon: <MapPin size={18} />, label: 'ZONE', value: user.nomZone },
                { icon: <Layers size={18} />, label: 'SECTEUR', value: user.nomSecteur },
                { icon: <Hash size={18} />, label: 'ID UTILISATEUR', value: user.id.toString().substring(0, 8) + '...', mono: true },
              ].map(({ icon, label, value, breakAll, mono }) => (
                <div key={label} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</span>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 font-medium">{label}</p>
                    <p className={`text-sm text-slate-900 font-medium mt-0.5 ${breakAll ? 'break-all' : ''} ${mono ? 'font-mono' : ''}`}>
                      {value || <span className="text-slate-400">—</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 rounded-b-2xl flex justify-end">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              Fermer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  sub?: string;
  loading?: boolean;
}

function KpiCard({ label, value, icon, iconBg, sub, loading }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-4 min-w-0">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        {loading ? (
          <div className="h-7 w-12 bg-slate-200 animate-pulse rounded mb-1" />
        ) : (
          <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
        )}
        <p className="text-xs text-slate-500 mt-1 truncate">{label}</p>
        {sub && <p className="text-xs text-slate-400 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Composant principal ────────────────────────────────────────────────────────

export default function UsersList({ onEdit, onView }: UsersListProps) {
  const { users, deleteUser, isLoading } = useUsers();

  const [search, setSearch]           = useState('');
  const [filterRole, setFilterRole]   = useState<UserRole | ''>('');
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [deletingId, setDeletingId]   = useState<number | null>(null);

  // ── Stats scopées ────────────────────────────────────────────────────────────
  const [scopedStats, setScopedStats]       = useState<ScopedStats | null>(null);
  const [statsLoading, setStatsLoading]     = useState(true);

  // Rôle du user connecté (lu depuis localStorage)
  const currentRole = useMemo<string>(() => {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      if (!raw) return 'ADMINISTRATEUR';
      const u = JSON.parse(raw) as AuthUser;
      return u.role || 'ADMINISTRATEUR';
    } catch {
      return 'ADMINISTRATEUR';
    }
  }, []);

  useEffect(() => {
    setStatsLoading(true);
    apiRequest<ScopedStats>('/api/users/stats')
      .then(setScopedStats)
      .catch(console.error)
      .finally(() => setStatsLoading(false));
  }, []);

  // ── Rôles filtrables selon le rôle connecté ──────────────────────────────────
  const filterableRoles = useMemo(() => getFilterableRoles(currentRole), [currentRole]);
  const kpiDefs = useMemo(() => getKpiDefs(currentRole), [currentRole]);

  // ── Filtrage des utilisateurs ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return users.filter((user) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        user.nom.toLowerCase().includes(q) ||
        user.prenom.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.nomEntite ?? '').toLowerCase().includes(q) ||
        (user.nomZone ?? '').toLowerCase().includes(q) ||
        (user.nomSecteur ?? '').toLowerCase().includes(q);

      const matchRole = !filterRole || user.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [users, search, filterRole]);

  const hasActiveFilters = search || filterRole;

  const clearFilters = () => { setSearch(''); setFilterRole(''); };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`Supprimer l'utilisateur "${user.prenom} ${user.nom}" ?`)) return;
    setDeletingId(user.id);
    try {
      await deleteUser(user.id);
    } catch (error) {
      console.error(error);
      alert('Échec de la suppression. Veuillez réessayer.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = (user: User) => {
    if (onView) onView(user);
    else setViewingUser(user);
  };

  return (
    <>
      <div className="space-y-5">

        {/* ── KPI Cards scopées par rôle ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiDefs.map((kpi, i) => (
            <KpiCard
              key={i}
              label={kpi.label}
              value={scopedStats ? kpi.getValue(scopedStats) : 0}
              icon={kpi.icon}
              iconBg={kpi.iconBg}
              sub={kpi.sub}
              loading={statsLoading}
            />
          ))}
        </div>

        {/* ── Barre de recherche & filtres ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
          <div className="flex flex-wrap gap-3 items-end">

            {/* Recherche textuelle */}
            <div className="relative flex-1 min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher par nom, prénom, email, entité…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 bg-slate-50"
              />
            </div>

            {/* Filtre Rôle — restreint selon le rôle du user connecté */}
            {filterableRoles.length > 1 && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-medium">Rôle</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as UserRole | '')}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 bg-slate-50"
                >
                  <option value="">Tous les rôles</option>
                  {filterableRoles.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtre rapide pour RESPONSABLE_SECTEUR : bouton déclarants uniquement */}
            {filterableRoles.length === 1 && filterableRoles[0] === 'DECLARANT' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-medium">Filtre rapide</label>
                <button
                  onClick={() => setFilterRole(filterRole === 'DECLARANT' ? '' : 'DECLARANT')}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    filterRole === 'DECLARANT'
                      ? 'bg-gray-100 border-gray-300 text-gray-700 font-medium'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-slate-50'
                  }`}
                >
                  Déclarants uniquement
                </button>
              </div>
            )}

            {/* Réinitialiser */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:text-red-600 border border-slate-200 rounded-lg hover:border-red-200 hover:bg-red-50 transition-colors"
              >
                <X size={13} />
                Effacer
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <p className="mt-3 text-xs text-slate-400">
              {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} sur {users.length} utilisateur{users.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* ── Tableau ───────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                  <th className="px-6 py-4 font-medium">Nom</th>
                  <th className="px-6 py-4 font-medium">Prénom</th>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Téléphone</th>
                  <th className="px-6 py-4 font-medium">Rôle</th>
                  <th className="px-6 py-4 font-medium">Entité</th>
                  <th className="px-6 py-4 font-medium">Zone</th>
                  <th className="px-6 py-4 font-medium">Secteur</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-400">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Chargement depuis MySQL…
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-slate-400 text-sm">
                      {hasActiveFilters
                        ? 'Aucun utilisateur ne correspond aux filtres appliqués.'
                        : 'Aucun utilisateur trouvé.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50 transition-colors ${deletingId === user.id ? 'opacity-40 pointer-events-none' : ''}`}
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">{user.nom}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{user.prenom}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                        {user.telephone || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${ROLE_STYLES[user.role] ?? 'bg-gray-100 text-gray-600'}`}>
                          {ROLE_LABELS[user.role] ?? user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {user.nomEntite || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {user.nomZone || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {user.nomSecteur || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleView(user)}
                            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Consulter (lecture seule)"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => onEdit(user)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            disabled={deletingId === user.id}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                            title="Supprimer"
                          >
                            {deletingId === user.id ? (
                              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                              </svg>
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ViewUserModal
        user={viewingUser}
        isOpen={!!viewingUser}
        onClose={() => setViewingUser(null)}
      />
    </>
  );
}