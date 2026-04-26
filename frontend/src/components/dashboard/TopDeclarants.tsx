// src/components/dashboard/TopDeclarants.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../services/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TopDeclarant {
  id: number;
  full_name: string;
  total_incidents: number;
}

type FilterDays = 7 | 30 | 90;

// ─── Skeleton Loader ────────────────────────────────────────────────────────

const SkeletonBar = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          height: 12, borderRadius: 6, background: '#e2e8f0',
          width: `${60 + Math.random() * 30}%`,
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
        <div style={{
          height: 12, borderRadius: 6, background: '#e2e8f0',
          width: 32,
          animation: 'pulse 1.5s ease-in-out infinite',
          animationDelay: `${i * 0.1}s`,
        }} />
      </div>
    ))}
  </div>
);

// ─── Composant principal ─────────────────────────────────────────────────────

interface TopDeclarantsProps {
  onFilterChange?: (days: FilterDays) => void;
}

function TopDeclarants({ onFilterChange }: TopDeclarantsProps) {
  const [filterDays, setFilterDays] = useState<FilterDays>(30);
  const [topDeclarants, setTopDeclarants] = useState<TopDeclarant[]>([]);
  const [isLoadingTop, setIsLoadingTop] = useState(false);
  const [errorTop, setErrorTop] = useState<string | null>(null);

  // ── Fetch Top Déclarants ──
  const fetchTopDeclarants = useCallback(async (days: FilterDays) => {
    setIsLoadingTop(true);
    setErrorTop(null);

    try {
      const params = new URLSearchParams({
        days: String(days),
        limit: '10',
      });

      const data = await apiRequest<TopDeclarant[]>(
        `/api/incidents/top-declarants?${params.toString()}`
      );

      setTopDeclarants(data);
    } catch (err) {
      setErrorTop('Impossible de charger les données.');
      console.error(err);
    } finally {
      setIsLoadingTop(false);
    }
  }, []);

  useEffect(() => {
    void fetchTopDeclarants(filterDays);
  }, [filterDays, fetchTopDeclarants]);

  const handleFilterChange = (days: FilterDays) => {
    setFilterDays(days);
    onFilterChange?.(days);
  };

  const BAR_COLORS = [
    '#6366f1', '#7c3aed', '#8b5cf6', '#a78bfa',
    '#818cf8', '#6366f1', '#4f46e5', '#4338ca',
    '#3730a3', '#312e81',
  ];

  const maxVal = topDeclarants[0]?.total_incidents || 1;

  const FILTER_OPTIONS: { label: string; value: FilterDays }[] = [
    { label: '7 jours', value: 7 },
    { label: '30 jours', value: 30 },
    { label: '90 jours', value: 90 },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header avec filtres */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"
                   strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">Top 10 Déclarants</h2>
          </div>
          <p className="text-sm text-slate-500" style={{ paddingLeft: 46 }}>
            Utilisateurs ayant signalé le plus d'incidents sur la période
          </p>
        </div>

        {/* Filtres */}
        <div style={{
          display: 'flex', gap: 6, background: '#f8fafc',
          borderRadius: 10, padding: 4, flexShrink: 0,
        }}>
          {FILTER_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => handleFilterChange(value)}
              style={{
                transition: 'all 0.18s ease',
                cursor: 'pointer',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                padding: '6px 14px',
                background: filterDays === value ? '#6366f1' : '#f1f5f9',
                color: filterDays === value ? '#fff' : '#64748b',
                boxShadow: filterDays === value ? '0 4px 12px rgba(99,102,241,0.35)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu */}
      {isLoadingTop ? (
        <SkeletonBar />
      ) : errorTop ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '40px 0', gap: 10,
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
               stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>{errorTop}</p>
          <button
            onClick={() => fetchTopDeclarants(filterDays)}
            style={{
              background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8,
              padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      ) : topDeclarants.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '40px 0', gap: 8,
        }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none"
               stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>
            Aucun incident déclaré sur les {filterDays} derniers jours
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {topDeclarants.map((declarant, index) => {
            const pct = Math.round((declarant.total_incidents / maxVal) * 100);
            const isTop3 = index < 3;
            const color = BAR_COLORS[index] ?? '#6366f1';
            const medalColors = ['#f59e0b', '#94a3b8', '#cd7c3f'];
            const medalLabels = ['🥇', '🥈', '🥉'];

            return (
              <div
                key={declarant.id}
                className="bar-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 8px',
                  borderRadius: 10,
                  borderBottom: index < topDeclarants.length - 1
                    ? '1px solid #f8fafc' : 'none',
                  background: isTop3 && index === 0
                    ? 'linear-gradient(90deg, rgba(99,102,241,0.05) 0%, transparent 100%)'
                    : 'transparent',
                  transition: 'background 0.2s ease',
                }}
              >
                {/* Rang */}
                <div style={{
                  width: 28, flexShrink: 0, textAlign: 'center',
                  fontSize: isTop3 ? 18 : 13,
                  fontWeight: 700,
                  color: isTop3 ? medalColors[index] : '#cbd5e1',
                  lineHeight: 1,
                }}>
                  {isTop3 ? medalLabels[index] : `${index + 1}`}
                </div>

                {/* Avatar initiales */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${color}22, ${color}44)`,
                  border: `2px solid ${color}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 12, fontWeight: 700, color: color,
                  letterSpacing: '-0.5px',
                }}>
                  {declarant.full_name
                    .split(' ')
                    .map(w => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>

                {/* Nom + barre */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'baseline', marginBottom: 5,
                  }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600, color: '#1e293b',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: '75%',
                    }}>
                      {declarant.full_name}
                    </span>
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: color,
                      flexShrink: 0, marginLeft: 8,
                    }}>
                      {declarant.total_incidents}
                      <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 11, marginLeft: 3 }}>
                        incident{declarant.total_incidents > 1 ? 's' : ''}
                      </span>
                    </span>
                  </div>

                  {/* Barre de progression */}
                  <div style={{
                    height: 6, borderRadius: 99,
                    background: '#f1f5f9',
                    overflow: 'hidden',
                  }}>
                    <div
                      className="bar-fill"
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        borderRadius: 99,
                        background: `linear-gradient(90deg, ${color}, ${color}bb)`,
                        transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        boxShadow: `0 0 8px ${color}55`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer stats */}
      {!isLoadingTop && topDeclarants.length > 0 && (
        <div style={{
          marginTop: 16,
          paddingTop: 14,
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          gap: 24,
        }}>
          <div>
            <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total déclarants
            </p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>
              {topDeclarants.length}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total incidents
            </p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#6366f1', lineHeight: 1.2 }}>
              {topDeclarants.reduce((sum, d) => sum + d.total_incidents, 0)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Période
            </p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>
              {filterDays}j
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .bar-row:hover .bar-fill {
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  );
}

export default TopDeclarants;