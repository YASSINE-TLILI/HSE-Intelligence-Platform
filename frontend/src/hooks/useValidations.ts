import { useState } from 'react';
import type { ValidationItem, PendingIncident, ValidationLevel } from '../types/index';
import { apiRequest } from '../services/api';

export function useValidations() {
  const [pending, setPending] = useState<PendingIncident[]>([]);
  const [history, setHistory] = useState<ValidationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const loadPending = async (level: ValidationLevel) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<PendingIncident[]>(
        `/api/validations/pending?level=${level}`,
      );
      setPending(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement validations');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (incidentId: number) => {
    const data = await apiRequest<ValidationItem[]>(
      `/api/incidents/${incidentId}/validations`,
    );
    setHistory(data);
  };

  const decide = async (
    incidentId: number,
    level: ValidationLevel,
    action: 'validate' | 'reject',
    comment: string,
  ) => {
    const levelSegment = level === 'SECTEUR' ? 'sector' : level.toLowerCase();
    const url = `/api/incidents/${incidentId}/${action}-${levelSegment}`;
    setActionLoading(true);
    setError('');
    try {
      await apiRequest(url, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      });
      await loadPending(level);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur pendant l'action de validation");
      throw e;
    } finally {
      setActionLoading(false);
    }
  };

  return { pending, history, loading, actionLoading, error, loadPending, loadHistory, decide };
}