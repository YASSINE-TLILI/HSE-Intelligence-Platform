import { useEffect, useState } from 'react';
import { apiRequest } from '../services';
import type { NotificationItem } from '../types';

export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<NotificationItem[]>('/api/notifications/me');
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement notifications');
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: number) => {
    await apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' });
    setItems((prev) =>
      prev.map((item) =>
        item.id_notification === id ? { ...item, statut_lecture: 'LU' as const } : item,
      ),
    );
  };

  const markAllRead = async () => {
    await apiRequest('/api/notifications/read-all', { method: 'PATCH' });
    setItems((prev) => prev.map((item) => ({ ...item, statut_lecture: 'LU' as const })));
  };

  useEffect(() => {
    void load();
  }, []);

  return { items, loading, error, reload: load, markRead, markAllRead };
}