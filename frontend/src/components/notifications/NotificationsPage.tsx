import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Bell, BellOff, CheckCheck, Eye, Clock, AlertTriangle,
  Activity, Shield, FileText, Zap, ChevronRight, Filter,
  RefreshCw, X, Inbox, MailOpen,
} from 'lucide-react';
import { apiRequest } from '../../services/api';
import { AUTH_USER_KEY } from '../../constants/index';
import { useNavigate } from 'react-router-dom';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Notification {
  id_notification: number;
  message: string;
  type: string;
  date_envoi: string;
  statut_lecture: 'NON_LU' | 'LU';
  id_incident: number | null;
  incident_titre?: string | null;
  incident_statut?: string | null;
  type_incident?: string | null;
  // Champs scope (admin/resp entité)
  dest_nom?: string;
  dest_prenom?: string;
  dest_role?: string;
  id_destinataire?: number;
}

interface AuthUser {
  id: number;
  role: string;
  nom: string;
  prenom: string;
}

// ─── Config par type de notification ─────────────────────────────────────────

const TYPE_CFG: Record<string, {
  label: string;
  icon: React.ReactNode;
  bg: string;
  iconColor: string;
  dot: string;
}> = {
  NOUVEL_INCIDENT: {
    label: 'Nouvel incident',
    icon: <AlertTriangle size={14} />,
    bg: 'bg-red-50',
    iconColor: 'text-red-500',
    dot: 'bg-red-400',
  },
  CHANGEMENT_STATUT: {
    label: 'Changement de statut',
    icon: <Activity size={14} />,
    bg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    dot: 'bg-blue-400',
  },
  ESCALADE: {
    label: 'Escalade',
    icon: <Zap size={14} />,
    bg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    dot: 'bg-amber-400',
  },
  ACTION_CORRECTIVE: {
    label: 'Action corrective',
    icon: <Shield size={14} />,
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
    dot: 'bg-emerald-400',
  },
  RAPPORT_DISPONIBLE: {
    label: 'Rapport disponible',
    icon: <FileText size={14} />,
    bg: 'bg-violet-50',
    iconColor: 'text-violet-500',
    dot: 'bg-violet-400',
  },
  AUDIT_PLANIFIE: {
    label: 'Audit planifié',
    icon: <Clock size={14} />,
    bg: 'bg-slate-50',
    iconColor: 'text-slate-500',
    dot: 'bg-slate-400',
  },
};

const DEFAULT_CFG = TYPE_CFG.CHANGEMENT_STATUT;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);

  if (mins < 1)  return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  if (hours < 24) return `Il y a ${hours} h`;
  if (days < 7)  return `Il y a ${days} j`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    DECLARANT: 'Déclarant',
    RESPONSABLE_SECTEUR: 'Resp. Secteur',
    RESPONSABLE_ZONE: 'Resp. Zone',
    RESPONSABLE_ENTITE: 'Resp. Entité',
    ADMINISTRATEUR: 'Admin',
  };
  return map[role] || role;
}

const ROLE_COLOR: Record<string, string> = {
  DECLARANT: 'bg-slate-100 text-slate-600',
  RESPONSABLE_SECTEUR: 'bg-blue-100 text-blue-700',
  RESPONSABLE_ZONE: 'bg-teal-100 text-teal-700',
  RESPONSABLE_ENTITE: 'bg-violet-100 text-violet-700',
  ADMINISTRATEUR: 'bg-rose-100 text-rose-700',
};

// ─── Notification Card ────────────────────────────────────────────────────────

interface CardProps {
  notif: Notification;
  showDest: boolean;
  onMarkRead: (id: number) => void;
  onOpen: (notif: Notification) => void;
}

const NotifCard = React.memo(({ notif, showDest, onMarkRead, onOpen }: CardProps) => {
  const cfg = TYPE_CFG[notif.type] ?? DEFAULT_CFG;
  const isUnread = notif.statut_lecture === 'NON_LU';

  return (
    <div
      className={`group relative flex gap-4 p-4 rounded-2xl border transition-all duration-200 cursor-pointer
        ${isUnread
          ? 'bg-white border-blue-100 shadow-sm hover:shadow-md hover:border-blue-200'
          : 'bg-slate-50/60 border-slate-100 hover:bg-white hover:shadow-sm'
        }`}
      onClick={() => onOpen(notif)}
    >
      {/* Indicateur non-lu */}
      {isUnread && (
        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
      )}

      {/* Icône */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
        <span className={cfg.iconColor}>{cfg.icon}</span>
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.iconColor}`}>
              {cfg.label}
            </span>
            {showDest && notif.dest_role && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLOR[notif.dest_role] || 'bg-slate-100 text-slate-600'}`}>
                {roleLabel(notif.dest_role)}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
            {formatDate(notif.date_envoi)}
          </span>
        </div>

        <p className={`mt-1.5 text-sm leading-snug ${isUnread ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>
          {notif.message}
        </p>

        {showDest && notif.dest_prenom && (
          <p className="text-xs text-slate-400 mt-1">
            → {notif.dest_prenom} {notif.dest_nom}
          </p>
        )}

        {notif.incident_titre && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Incident :</span>
            <span className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">
              {notif.incident_titre}
            </span>
            {notif.type_incident && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${
                notif.type_incident === 'incident'
                  ? 'bg-red-50 text-red-600'
                  : 'bg-amber-50 text-amber-600'
              }`}>
                {notif.type_incident}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {notif.id_incident && (
            <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
              <Eye size={11} /> Voir l'incident <ChevronRight size={11} />
            </span>
          )}
          {isUnread && (
            <button
              onClick={(e) => { e.stopPropagation(); onMarkRead(notif.id_notification); }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-600 transition-colors ml-auto"
            >
              <MailOpen size={11} /> Marquer lu
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// ─── Page principale ──────────────────────────────────────────────────────────

type FilterType = 'ALL' | 'UNREAD' | 'NOUVEL_INCIDENT' | 'CHANGEMENT_STATUT' | 'ACTION_CORRECTIVE';

export default function NotificationsPage() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [filter, setFilter]               = useState<FilterType>('ALL');
  const [search, setSearch]               = useState('');
  const [markingAll, setMarkingAll]       = useState(false);

  const authUser: AuthUser | null = useMemo(() => {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const isAdmin = authUser?.role === 'ADMINISTRATEUR';
  // Les rôles responsable voient les notifs de leur scope (endpoint /)
  // Les déclarants voient uniquement les leurs (endpoint /me)
  const scopeEndpoint = authUser?.role === 'DECLARANT'
    ? '/api/notifications/me'
    : '/api/notifications/';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<Notification[]>(scopeEndpoint);
      setNotifications(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [scopeEndpoint]);

  useEffect(() => { void load(); }, [load]);

  const markRead = async (id: number) => {
    try {
      await apiRequest(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev =>
        prev.map(n => n.id_notification === id ? { ...n, statut_lecture: 'LU' as const } : n)
      );
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await apiRequest('/api/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, statut_lecture: 'LU' as const })));
    } catch (e) { console.error(e); } finally { setMarkingAll(false); }
  };

  const handleOpen = async (notif: Notification) => {
    // Marquer comme lu
    if (notif.statut_lecture === 'NON_LU') {
      await markRead(notif.id_notification);
    }
    // Naviguer vers l'incident si existant
    if (notif.id_incident) {
      navigate(`/incidents/${notif.id_incident}`);
    }
  };

  // Filtrage
  const filtered = useMemo(() => {
    return notifications.filter(n => {
      if (filter === 'UNREAD' && n.statut_lecture !== 'NON_LU') return false;
      if (filter !== 'ALL' && filter !== 'UNREAD' && n.type !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        const inMsg = n.message.toLowerCase().includes(q);
        const inTitle = (n.incident_titre || '').toLowerCase().includes(q);
        const inDest = `${n.dest_prenom || ''} ${n.dest_nom || ''}`.toLowerCase().includes(q);
        if (!inMsg && !inTitle && !inDest) return false;
      }
      return true;
    });
  }, [notifications, filter, search]);

  const unreadCount = useMemo(
    () => notifications.filter(n => n.statut_lecture === 'NON_LU').length,
    [notifications]
  );

  // Grouper par date pour affichage
  const grouped = useMemo(() => {
    const groups: { label: string; items: Notification[] }[] = [];
    const today     = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek  = new Date(today); thisWeek.setDate(thisWeek.getDate() - 7);

    const todayItems:     Notification[] = [];
    const yesterdayItems: Notification[] = [];
    const weekItems:      Notification[] = [];
    const olderItems:     Notification[] = [];

    for (const n of filtered) {
      const d = new Date(n.date_envoi); d.setHours(0,0,0,0);
      if (d >= today)          todayItems.push(n);
      else if (d >= yesterday) yesterdayItems.push(n);
      else if (d >= thisWeek)  weekItems.push(n);
      else                     olderItems.push(n);
    }

    if (todayItems.length)     groups.push({ label: "Aujourd'hui", items: todayItems });
    if (yesterdayItems.length) groups.push({ label: 'Hier', items: yesterdayItems });
    if (weekItems.length)      groups.push({ label: 'Cette semaine', items: weekItems });
    if (olderItems.length)     groups.push({ label: 'Plus anciennes', items: olderItems });

    return groups;
  }, [filtered]);

  // Afficher les destinataires uniquement pour les rôles avec scope large
  const showDest = ['ADMINISTRATEUR', 'RESPONSABLE_ENTITE', 'RESPONSABLE_ZONE'].includes(authUser?.role || '');

  const FILTERS: { key: FilterType; label: string; count?: number }[] = [
    { key: 'ALL',               label: 'Toutes',           count: notifications.length },
    { key: 'UNREAD',            label: 'Non lues',         count: unreadCount },
    { key: 'NOUVEL_INCIDENT',   label: 'Nouveaux incidents' },
    { key: 'CHANGEMENT_STATUT', label: 'Changements' },
    { key: 'ACTION_CORRECTIVE', label: 'Actions correctives' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-sm">
            <Bell size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {unreadCount > 0
                ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
                : 'Toutes lues'}
              {isAdmin && ' · Vue globale'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 transition-colors bg-white shadow-sm"
            title="Rafraîchir"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {unreadCount > 0 && (
            <button
              onClick={() => void markAllRead()}
              disabled={markingAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm"
            >
              <CheckCheck size={14} />
              Tout marquer lu
            </button>
          )}
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',       value: notifications.length,                   color: 'blue' },
          { label: 'Non lues',    value: unreadCount,                            color: 'red'  },
          { label: 'Incidents',   value: notifications.filter(n => n.type === 'NOUVEL_INCIDENT').length, color: 'amber' },
          { label: 'Statuts',     value: notifications.filter(n => n.type === 'CHANGEMENT_STATUT').length, color: 'violet' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Filtres & Search ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        {/* Barre de recherche */}
        <div className="relative">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher dans les notifications…"
            className="w-full pl-9 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Tabs filtres */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'
              }`}
            >
              {label}
              {count !== undefined && count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  filter === key ? 'bg-white/20' : 'bg-white border border-slate-200 text-slate-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Erreur ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* ── Liste ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100">
          <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mb-4">
            <BellOff size={28} className="text-slate-300" />
          </div>
          <p className="text-slate-500 font-semibold">Aucune notification</p>
          <p className="text-slate-400 text-sm mt-1">
            {search || filter !== 'ALL'
              ? 'Aucun résultat pour ces filtres'
              : 'Vous êtes à jour !'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ label, items }) => (
            <section key={label}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {label}
                </span>
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2">
                {items.map(notif => (
                  <NotifCard
                    key={notif.id_notification}
                    notif={notif}
                    showDest={showDest}
                    onMarkRead={markRead}
                    onOpen={handleOpen}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}