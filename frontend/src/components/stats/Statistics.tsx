// src/components/stats/Statistics.tsx
// ─── Statistiques avancées — design premium PFE ───────────────────────────────

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, RadialBarChart, RadialBar, PieChart, Pie, Legend, LineChart, Line,
  AreaChart, Area,
} from 'recharts';
import { apiRequest } from '../../services/api';
import { useIncidents } from '../../store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthUser {
  id: number;
  role: string;
  scope_id?: number;
  nom?: string;
  prenom?: string;
}

interface PriorityRow {
  gravite: string;
  label: string;
  color: string;
  order: number;
  incidents: number;
  anomalies: number;
  total: number;
}

interface StatusRow {
  statut: string;
  label: string;
  color: string;
  group: string;
  total: number;
}

interface ScopeRow {
  nom_secteur?: string;
  nom_zone?: string;
  entite_nom?: string;
  nom_entite?: string;
  total: number;
  clotures: number;
  critiques: number;
  graves?: number;
}

interface ScopeData {
  type: string;
  label: string;
  days: number;
  data: ScopeRow[];
}

interface ClosureData {
  allowed: boolean;
  global_rate: number;
  total: number;
  clotures: number;
  days: number;
  by_entite: { id_entite: number; nom_entite: string; total: number; clotures: number; taux_cloture: number }[];
}

interface TopDeclarant {
  id: number;
  full_name: string;
  total_incidents: number;
  critiques: number;
  graves: number;
}

interface ScopeFilters {
  entites: { id: number; nom: string }[];
  zones: { id: number; nom: string }[];
  secteurs: { id: number; nom: string }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRATEUR: 'Administrateur',
  RESPONSABLE_ENTITE: 'Responsable Entité',
  RESPONSABLE_ZONE: 'Responsable Zone',
  RESPONSABLE_SECTEUR: 'Responsable Secteur',
  DECLARANT: 'Déclarant',
};

const DAY_OPTIONS = [
  { label: '7j', value: 7 },
  { label: '30j', value: 30 },
  { label: '90j', value: 90 },
  { label: '1an', value: 365 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('auth_user') || localStorage.getItem('user') || sessionStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function formatPct(val: number) {
  return `${val.toFixed(1)}%`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionTitle: React.FC<{ icon: string; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {title}
      </h2>
    </div>
    {subtitle && (
      <p style={{ margin: '4px 0 0 32px', fontSize: 13, color: '#64748b', fontFamily: 'inherit' }}>{subtitle}</p>
    )}
  </div>
);

const FilterPill: React.FC<{
  options: { label: string; value: number | string }[];
  value: number | string;
  onChange: (v: any) => void;
}> = ({ options, value, onChange }) => (
  <div style={{
    display: 'inline-flex', gap: 4, background: '#f1f5f9',
    borderRadius: 10, padding: 3,
  }}>
    {options.map(opt => (
      <button key={opt.value} onClick={() => onChange(opt.value)} style={{
        border: 'none', cursor: 'pointer', borderRadius: 8, padding: '5px 13px',
        fontSize: 12, fontWeight: 700, transition: 'all 0.18s',
        background: value === opt.value ? '#6366f1' : 'transparent',
        color: value === opt.value ? '#fff' : '#64748b',
        boxShadow: value === opt.value ? '0 2px 8px rgba(99,102,241,.3)' : 'none',
      }}>
        {opt.label}
      </button>
    ))}
  </div>
);

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; span?: number }> = ({ children, style, span = 1 }) => (
  <div style={{
    background: '#fff',
    borderRadius: 20,
    padding: 28,
    boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04)',
    border: '1px solid #f1f5f9',
    gridColumn: span > 1 ? `span ${span}` : undefined,
    ...style,
  }}>
    {children}
  </div>
);

const Skeleton: React.FC<{ height?: number }> = ({ height = 200 }) => (
  <div style={{
    height, borderRadius: 12, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  }} />
);

// ─── KPI Banner ──────────────────────────────────────────────────────────────

const KPIBanner: React.FC<{ user: AuthUser | null }> = ({ user }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/api/incidents/stats')
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const kpis = [
    { label: 'Total incidents', value: stats?.total ?? '—', icon: '📋', color: '#6366f1', bg: '#eef2ff' },
    { label: 'En cours', value: stats?.en_cours ?? '—', icon: '⚡', color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Résolus', value: stats?.resolus ?? '—', icon: '✅', color: '#10b981', bg: '#ecfdf5' },
    { label: 'En attente validation', value: stats?.waiting_for_validation ?? '—', icon: '⏳', color: '#8b5cf6', bg: '#f5f3ff' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
      {kpis.map((kpi, i) => (
        <div key={i} style={{
          background: '#fff', borderRadius: 16, padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,.06)',
          border: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', gap: 16,
          animation: `fadeUp 0.4s ease ${i * 80}ms both`,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: kpi.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
          }}>
            {kpi.icon}
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {kpi.label}
            </div>
            {loading
              ? <div style={{ width: 60, height: 24, background: '#f1f5f9', borderRadius: 6, marginTop: 4 }} />
              : <div style={{ fontSize: 28, fontWeight: 800, color: kpi.color, lineHeight: 1.1, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                  {kpi.value}
                </div>
            }
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Priority Distribution ────────────────────────────────────────────────────

const PriorityChart: React.FC<{ user: AuthUser | null }> = ({ user }) => {
  const [data, setData] = useState<PriorityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [view, setView] = useState<'bar' | 'pie'>('bar');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (dateFrom) qs.set('date_from', dateFrom);
      if (dateTo) qs.set('date_to', dateTo);
      const res = await apiRequest<PriorityRow[]>(`/api/incidents/stats/priority-distribution?${qs}`);
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const total = data.reduce((s, d) => s + d.total, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as PriorityRow;
    return (
      <div style={{ background:'#1e293b', borderRadius:12, padding:'12px 16px', color:'#fff', fontSize:13 }}>
        <div style={{ fontWeight:700, marginBottom:8 }}>{d.label}</div>
        <div>🔴 Incidents: <b>{d.incidents}</b></div>
        <div>🟡 Anomalies: <b>{d.anomalies}</b></div>
        <div style={{ marginTop:6, color:'#94a3b8' }}>Total: {d.total} ({total > 0 ? Math.round(d.total/total*100) : 0}%)</div>
      </div>
    );
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <SectionTitle icon="🎯" title="Répartition par Priorité" subtitle="Incidents & anomalies classés par niveau de gravité" />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <FilterPill
            options={[{ label: '📊 Barres', value: 'bar' }, { label: '🥧 Camembert', value: 'pie' }]}
            value={view} onChange={setView}
          />
        </div>
      </div>

      {/* Filtres date */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>PÉRIODE :</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: '#334155', outline: 'none' }}
        />
        <span style={{ color: '#94a3b8', fontSize: 13 }}>→</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: '#334155', outline: 'none' }}
        />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); }} style={{
            background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 8,
            padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>✕ Effacer</button>
        )}
      </div>

      {/* Pills résumé */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {data.map(d => (
          <div key={d.gravite} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: `${d.color}15`, borderRadius: 20, padding: '4px 12px',
            border: `1px solid ${d.color}40`,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: d.color }}>{d.label}: {d.total}</span>
          </div>
        ))}
      </div>

      {loading ? <Skeleton height={280} /> : (
        <div style={{ height: 280 }}>
          {view === 'bar' ? (
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>{value}</span>}
                />
                <Bar dataKey="incidents" name="Incidents" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
                <Bar dataKey="anomalies" name="Anomalies" radius={[6, 6, 0, 0]} maxBarSize={48} opacity={0.55}>
                  {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data} dataKey="total" nameKey="label" cx="50%" cy="50%"
                  innerRadius={70} outerRadius={110} paddingAngle={3}
                  label={({ label, percent }) => `${label} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(val: any, name: any) => [val, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </Card>
  );
};

// ─── Status Distribution ──────────────────────────────────────────────────────

const StatusChart: React.FC<{ user: AuthUser | null }> = ({ user }) => {
  const [data, setData] = useState<StatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [groupView, setGroupView] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (dateFrom) qs.set('date_from', dateFrom);
      if (dateTo) qs.set('date_to', dateTo);
      const res = await apiRequest<StatusRow[]>(`/api/incidents/stats/status-distribution?${qs}`);
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const total = data.reduce((s, d) => s + d.total, 0);

  // Vue groupée : en_cours vs terminés
  const grouped = useMemo(() => {
    const g: Record<string, { label: string; total: number; color: string }> = {};
    data.forEach(d => {
      if (!g[d.group]) {
        const meta = d.group === 'en_cours'
          ? { label: 'En cours', color: '#f59e0b' }
          : { label: 'Terminés', color: '#10b981' };
        g[d.group] = { ...meta, total: 0 };
      }
      g[d.group].total += d.total;
    });
    return Object.values(g);
  }, [data]);

  const displayData = groupView ? grouped : data;

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <SectionTitle icon="📈" title="Répartition par Statut" subtitle="État d'avancement du workflow de validation" />
        <FilterPill
          options={[{ label: 'Détaillé', value: 'detail' }, { label: 'Groupé', value: 'group' }]}
          value={groupView ? 'group' : 'detail'} onChange={v => setGroupView(v === 'group')}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>PÉRIODE :</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: '#334155', outline: 'none' }}
        />
        <span style={{ color: '#94a3b8' }}>→</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: '#334155', outline: 'none' }}
        />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); }} style={{
            background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 8,
            padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>✕</button>
        )}
      </div>

      {loading ? <Skeleton height={280} /> : (
        <>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={displayData} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis type="category" dataKey="label" width={150} axisLine={false} tickLine={false}
                  tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }} />
                <Tooltip
                  formatter={(val: any) => [`${val} (${total > 0 ? Math.round(val / total * 100) : 0}%)`, 'Total']}
                  contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}
                />
                <Bar dataKey="total" radius={[0, 8, 8, 0]} maxBarSize={28}>
                  {displayData.map((d: any, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {data.map(d => (
              <div key={d.statut} style={{
                fontSize: 11, color: '#64748b', fontWeight: 600,
                background: `${d.color}12`, padding: '3px 10px', borderRadius: 20,
                border: `1px solid ${d.color}30`,
              }}>
                {d.label}: {d.total}
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
};

// ─── Incidents by Scope ───────────────────────────────────────────────────────

const ScopeChart: React.FC<{ user: AuthUser | null }> = ({ user }) => {
  const [data, setData] = useState<ScopeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const role = (user?.role || '').toUpperCase();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<ScopeData>(`/api/incidents/stats/by-scope?days=${days}`);
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  if (!data?.data?.length && !loading) {
    return (
      <Card>
        <SectionTitle icon="🗂️" title="Incidents par Périmètre" />
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>
          Aucune donnée pour cette période.
        </div>
      </Card>
    );
  }

  const nameKey = data?.type === 'secteur' || data?.type === 'zone' ? 'nom_secteur' : 'nom_zone';
  const chartData = (data?.data || []).map(r => ({
    ...r,
    name: (r as any).nom_secteur || (r as any).nom_zone || (r as any).nom_entite || '—',
    taux: r.total > 0 ? Math.round(r.clotures / r.total * 100) : 0,
  }));

  const roleLabel = ROLE_LABELS[role] || role;
  const scopeSubtitle = data?.type === 'secteur' ? 'Votre secteur'
    : data?.type === 'zone' ? 'Secteurs de votre zone'
    : data?.type === 'entite' ? 'Zones de votre entité'
    : 'Vue globale';

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <SectionTitle
          icon="🗺️"
          title="Volume d'incidents par périmètre"
          subtitle={scopeSubtitle}
        />
        <FilterPill options={DAY_OPTIONS} value={days} onChange={setDays} />
      </div>

      {loading ? <Skeleton height={300} /> : (
        <div style={{ height: Math.max(260, chartData.length * 52 + 40) }}>
          <ResponsiveContainer>
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 50, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f8fafc" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={140} axisLine={false} tickLine={false}
                tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }} />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={{ background: '#1e293b', borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: 13 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>{d.name}</div>
                      <div>📋 Total: <b>{d.total}</b></div>
                      <div>✅ Clôturés: <b>{d.clotures}</b></div>
                      <div>🔴 Critiques: <b>{d.critiques}</b></div>
                      <div style={{ marginTop: 6, color: '#94a3b8' }}>Taux clôture: {d.taux}%</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="total" name="Total incidents" radius={[0, 8, 8, 0]} maxBarSize={32}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={['#6366f1','#8b5cf6','#a78bfa','#818cf8','#4f46e5'][i % 5]} />
                ))}
              </Bar>
              <Bar dataKey="clotures" name="Clôturés" radius={[0, 8, 8, 0]} maxBarSize={32} fill="#10b981" opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats rapides */}
      {!loading && chartData.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Périmètres</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{chartData.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Total incidents</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1' }}>{chartData.reduce((s, d) => s + d.total, 0)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Incidents critiques</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444' }}>{chartData.reduce((s, d) => s + d.critiques, 0)}</div>
          </div>
        </div>
      )}
    </Card>
  );
};

// ─── Closure Rate ─────────────────────────────────────────────────────────────

const ClosureRateChart: React.FC<{ user: AuthUser | null; scopeFilters: ScopeFilters | null }> = ({ user, scopeFilters }) => {
  const [data, setData] = useState<ClosureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [filterEntite, setFilterEntite] = useState<number | ''>('');
  const role = (user?.role || '').toUpperCase();

  const allowed = role === 'ADMINISTRATEUR' || role === 'RESPONSABLE_ENTITE';
  if (!allowed) return null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ days: String(days) });
      if (filterEntite) qs.set('id_entite', String(filterEntite));
      const res = await apiRequest<ClosureData>(`/api/incidents/stats/closure-rate?${qs}`);
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [days, filterEntite]);

  useEffect(() => { load(); }, [load]);

  if (!data?.allowed && !loading) return null;

  const rate = data?.global_rate ?? 0;
  const rateColor = rate >= 70 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <SectionTitle icon="🏆" title="Taux de Clôture" subtitle="Performance de résolution des incidents" />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {role === 'ADMINISTRATEUR' && (scopeFilters?.entites?.length ?? 0) > 0 && (
            <select value={filterEntite} onChange={e => setFilterEntite(e.target.value ? Number(e.target.value) : '')}
              style={{
                border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px',
                fontSize: 12, color: '#334155', outline: 'none', background: '#fff',
              }}>
              <option value="">Toutes les entités</option>
              {(scopeFilters?.entites ?? []).map(e => (
                <option key={e.id} value={e.id}>{e.nom}</option>
              ))}
            </select>
          )}
          <FilterPill options={DAY_OPTIONS} value={days} onChange={setDays} />
        </div>
      </div>

      {loading ? <Skeleton height={260} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 28, alignItems: 'center' }}>
          {/* Gauge centrale */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <svg viewBox="0 0 120 120" width={160} height={160}>
                {/* Track */}
                <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                {/* Arc */}
                <circle cx="60" cy="60" r="52" fill="none" stroke={rateColor} strokeWidth="12"
                  strokeDasharray={`${rate / 100 * 326.7} 326.7`}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dasharray 1s ease' }}
                />
                <text x="60" y="55" textAnchor="middle" style={{ fontSize: 22, fontWeight: 800, fill: rateColor, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                  {rate}%
                </text>
                <text x="60" y="72" textAnchor="middle" style={{ fontSize: 10, fill: '#94a3b8' }}>
                  taux clôture
                </text>
              </svg>
            </div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{data?.clotures}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>CLÔTURÉS</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#6366f1' }}>{data?.total}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>TOTAL</div>
              </div>
            </div>
          </div>

          {/* Bar chart par entité */}
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={data?.by_entite || []} layout="vertical" margin={{ left: 0, right: 50, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f8fafc" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`}
                  axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis type="category" dataKey="nom_entite" width={120} axisLine={false} tickLine={false}
                  tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Taux de clôture']}
                  contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}
                />
                <Bar dataKey="taux_cloture" name="Taux clôture" radius={[0, 8, 8, 0]} maxBarSize={28}>
                  {(data?.by_entite || []).map((d, i) => (
                    <Cell key={i} fill={d.taux_cloture >= 70 ? '#10b981' : d.taux_cloture >= 40 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Card>
  );
};

// ─── Top Declarants ───────────────────────────────────────────────────────────

const TopDeclarantsChart: React.FC<{ user: AuthUser | null; scopeFilters: ScopeFilters | null }> = ({ user, scopeFilters }) => {
  const [data, setData] = useState<TopDeclarant[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [filterSecteur, setFilterSecteur] = useState<number | ''>('');
  const [filterZone, setFilterZone] = useState<number | ''>('');
  const [filterEntite, setFilterEntite] = useState<number | ''>('');
  const role = (user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMINISTRATEUR';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ days: String(days), limit: '10' });
      if (isAdmin) {
        if (filterSecteur) qs.set('id_secteur', String(filterSecteur));
        else if (filterZone) qs.set('id_zone', String(filterZone));
        else if (filterEntite) qs.set('id_entite', String(filterEntite));
      }
      const res = await apiRequest<TopDeclarant[]>(`/api/incidents/top-declarants?${qs}`);
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [days, filterSecteur, filterZone, filterEntite, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const maxVal = data[0]?.total_incidents || 1;
  const COLORS = ['#6366f1','#8b5cf6','#a78bfa','#818cf8','#4f46e5','#4338ca','#3730a3','#60a5fa','#34d399','#f59e0b'];
  const MEDALS = ['🥇','🥈','🥉'];
  const MEDAL_COLORS = ['#f59e0b','#94a3b8','#cd7c3f'];

  const scopeLabel = role === 'RESPONSABLE_SECTEUR' ? 'votre secteur'
    : role === 'RESPONSABLE_ZONE' ? 'votre zone'
    : role === 'RESPONSABLE_ENTITE' ? 'votre entité'
    : 'le périmètre sélectionné';

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <SectionTitle
          icon="🏅"
          title="Top 10 Déclarants"
          subtitle={`Utilisateurs les plus actifs dans ${scopeLabel}`}
        />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <FilterPill options={DAY_OPTIONS} value={days} onChange={setDays} />
        </div>
      </div>

      {/* Filtres Admin */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>FILTRER PAR :</span>
          {(scopeFilters?.entites?.length ?? 0) > 0 && (
            <select value={filterEntite} onChange={e => { setFilterEntite(e.target.value ? Number(e.target.value) : ''); setFilterZone(''); setFilterSecteur(''); }}
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#334155', outline: 'none', background: '#fff' }}>
              <option value="">Toutes les entités</option>
              {(scopeFilters?.entites ?? []).map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
          )}
          {(scopeFilters?.zones?.length ?? 0) > 0 && (
            <select value={filterZone} onChange={e => { setFilterZone(e.target.value ? Number(e.target.value) : ''); setFilterSecteur(''); }}
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#334155', outline: 'none', background: '#fff' }}>
              <option value="">Toutes les zones</option>
              {(scopeFilters?.zones ?? []).map(z => <option key={z.id} value={z.id}>{z.nom}</option>)}
            </select>
          )}
          {(scopeFilters?.secteurs?.length ?? 0) > 0 && (
            <select value={filterSecteur} onChange={e => setFilterSecteur(e.target.value ? Number(e.target.value) : '')}
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#334155', outline: 'none', background: '#fff' }}>
              <option value="">Tous les secteurs</option>
              {(scopeFilters?.secteurs ?? []).map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          )}
          {(filterEntite || filterZone || filterSecteur) && (
            <button onClick={() => { setFilterEntite(''); setFilterZone(''); setFilterSecteur(''); }}
              style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              ✕ Réinitialiser
            </button>
          )}
        </div>
      )}

      {loading ? <Skeleton height={360} /> : data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Aucun déclarant trouvé</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Aucun incident déclaré sur cette période.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {data.map((d, i) => {
            const pct = Math.round(d.total_incidents / maxVal * 100);
            const color = COLORS[i] ?? '#6366f1';
            const isTop3 = i < 3;
            const initials = d.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

            return (
              <div key={d.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '11px 10px',
                borderRadius: 12, borderBottom: i < data.length - 1 ? '1px solid #f8fafc' : 'none',
                background: i === 0 ? `linear-gradient(90deg, ${color}08, transparent)` : 'transparent',
                transition: 'background .2s',
              }}>
                {/* Rang */}
                <div style={{ width: 30, textAlign: 'center', fontSize: isTop3 ? 20 : 13, fontWeight: 700, color: isTop3 ? MEDAL_COLORS[i] : '#cbd5e1', lineHeight: 1, flexShrink: 0 }}>
                  {isTop3 ? MEDALS[i] : i + 1}
                </div>

                {/* Avatar */}
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${color}25, ${color}45)`,
                  border: `2px solid ${color}60`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, color, flexShrink: 0, letterSpacing: '-.5px',
                }}>
                  {initials}
                </div>

                {/* Contenu */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                      {d.full_name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {d.critiques > 0 && (
                        <span style={{ fontSize: 11, background: '#fee2e2', color: '#ef4444', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>
                          🔴 {d.critiques}
                        </span>
                      )}
                      <span style={{ fontSize: 14, fontWeight: 800, color }}>
                        {d.total_incidents}
                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, marginLeft: 3 }}>
                          incident{d.total_incidents > 1 ? 's' : ''}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`, borderRadius: 99,
                      background: `linear-gradient(90deg, ${color}, ${color}bb)`,
                      transition: 'width 0.8s cubic-bezier(.34,1.56,.64,1)',
                      boxShadow: `0 0 10px ${color}40`,
                    }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {!loading && data.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 28 }}>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Déclarants</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{data.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Total signalés</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1' }}>{data.reduce((s, d) => s + d.total_incidents, 0)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Critiques</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444' }}>{data.reduce((s, d) => s + d.critiques, 0)}</div>
          </div>
        </div>
      )}
    </Card>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Statistics() {
  const user = useUser();
  const [scopeFilters, setScopeFilters] = useState<ScopeFilters | null>(null);

  useEffect(() => {
    apiRequest<ScopeFilters>('/api/incidents/scope-filters')
      .then(setScopeFilters)
      .catch(console.error);
  }, []);

  const role = (user?.role || '').toUpperCase();
  const roleLabel = ROLE_LABELS[role] || role;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        * { font-family: 'Plus Jakarta Sans', 'Segoe UI', sans-serif; }
        input[type="date"]:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.15) !important; }
        select:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.15) !important; }
      `}</style>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 0 48px 0' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e1b4b 100%)',
          borderRadius: 24, padding: '36px 40px', marginBottom: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 20px 60px rgba(15,23,42,.3)',
          overflow: 'hidden', position: 'relative',
          animation: 'fadeUp 0.5s ease both',
        }}>
          {/* Déco bg */}
          <div style={{
            position: 'absolute', top: -60, right: -60, width: 300, height: 300,
            borderRadius: '50%', background: 'rgba(99,102,241,.12)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -40, left: 200, width: 200, height: 200,
            borderRadius: '50%', background: 'rgba(139,92,246,.08)', pointerEvents: 'none',
          }} />

          <div>
            <div style={{ fontSize: 13, color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
              Tableau de bord analytique
            </div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
              Statistiques HSE
            </h1>
            <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 14 }}>
              Vue {roleLabel} · Données en temps réel
            </p>
          </div>
          <div style={{ textAlign: 'right', color: '#fff' }}>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Connecté en tant que</div>
            <div style={{
              background: 'rgba(99,102,241,.25)', border: '1px solid rgba(99,102,241,.4)',
              borderRadius: 24, padding: '8px 20px', fontSize: 14, fontWeight: 700, color: '#a5b4fc',
            }}>
              {roleLabel}
            </div>
          </div>
        </div>

        {/* KPI Banner */}
        <KPIBanner user={user} />

        {/* Grid principal */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Ligne 1 : Priority + Status */}
          <div style={{ animation: 'fadeUp 0.4s ease 100ms both' }}>
            <PriorityChart user={user} />
          </div>
          <div style={{ animation: 'fadeUp 0.4s ease 180ms both' }}>
            <StatusChart user={user} />
          </div>

          {/* Ligne 2 : Scope (pleine largeur) */}
          <div style={{ gridColumn: 'span 2', animation: 'fadeUp 0.4s ease 260ms both' }}>
            <ScopeChart user={user} />
          </div>

          {/* Taux de clôture (si autorisé) */}
          {(role === 'ADMINISTRATEUR' || role === 'RESPONSABLE_ENTITE') && (
            <div style={{ gridColumn: 'span 2', animation: 'fadeUp 0.4s ease 340ms both' }}>
              <ClosureRateChart user={user} scopeFilters={scopeFilters} />
            </div>
          )}

          {/* Top Déclarants (pleine largeur) */}
          <div style={{ gridColumn: 'span 2', animation: 'fadeUp 0.4s ease 420ms both' }}>
            <TopDeclarantsChart user={user} scopeFilters={scopeFilters} />
          </div>
        </div>
      </div>
    </>
  );
}