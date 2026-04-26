// src/hooks/useNotifications.ts
import { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../services';
import type { NotificationItem } from '../types';
import { AUTH_USER_KEY } from '../constants';

function getUserRole(): string {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return '';
    const u = JSON.parse(raw) as { role?: string };
    return u.role || '';
  } catch { return ''; }
}

export function useNotifications() {
  const [items, setItems]     = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Déclarant → /me ; autres rôles → / (scope-aware)
  const endpoint = getUserRole() === 'DECLARANT'
    ? '/api/notifications/me'
    : '/api/notifications/';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<NotificationItem[]>(endpoint);
      const arr  = Array.isArray(data) ? data : [];
      setItems(arr);
      setUnreadCount(arr.filter(n => n.statut_lecture === 'NON_LU').length);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement notifications');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  const markRead = async (id: number) => {
    try {
      await apiRequest(`/api/notifications/${id}/read`, { method: 'POST' });
      setItems(prev =>
        prev.map(item =>
          item.id_notification === id
            ? { ...item, statut_lecture: 'LU' as const }
            : item,
        ),
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    try {
      await apiRequest('/api/notifications/read-all', { method: 'POST' });
      setItems(prev => prev.map(item => ({ ...item, statut_lecture: 'LU' as const })));
      setUnreadCount(0);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { void load(); }, [load]);

  return { items, loading, error, unreadCount, reload: load, markRead, markAllRead };
}