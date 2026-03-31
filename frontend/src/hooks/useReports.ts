import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import type { ReportGeneratePayload } from '../types/index';

export function useReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any[]>('/api/reports');
      setReports(data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur rapports');
    } finally {
      setLoading(false);
    }
  };

  const generate = async (payload: ReportGeneratePayload) => {
    const data = await apiRequest('/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await load();
    return data;
  };

  useEffect(() => {
    void load();
  }, []);

  return { reports, loading, error, reload: load, generate };
}