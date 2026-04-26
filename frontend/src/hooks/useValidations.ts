// src/hooks/useValidations.ts

import { useState } from 'react';
import type { ValidationItem, PendingIncident, ValidationLevel } from '../types/index';
import { apiRequest } from '../services/api';

// Mapping niveau → segment URL d'endpoint
const LEVEL_SEGMENT: Record<ValidationLevel, string> = {
  SECTEUR:'sector',
  ZONE:'zone',
  ENTITE:'entite',
};

export function useValidations() {
  const [pending,       setPending]       = useState<PendingIncident[]>([]);
  const [history,       setHistory]       = useState<ValidationItem[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error,         setError]         = useState('');

  const loadPending = async (level: ValidationLevel) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<PendingIncident[]>(
        `/api/validations/pending?level=${level}`,
      );
      setPending(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement validations');
      setPending([]);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (incidentId: number) => {
    try {
      const data = await apiRequest<ValidationItem[]>(
        `/api/incidents/${incidentId}/validations`,
      );
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    }
  };

  const decide = async (
    incidentId: number,
    level: ValidationLevel,
    action: 'validate' | 'reject',
    comment: string,
  ) => {
    // Construction de l'URL :
    //   validate-sector / validate-zone / validate-hse
    //   reject-sector  (seul le secteur peut rejeter — côté serveur aussi)
    const segment = LEVEL_SEGMENT[level];
    const verb    = action === 'validate' ? 'validate' : 'reject';
    const url     = `/api/incidents/${incidentId}/${verb}-${segment}`;

    setActionLoading(true);
    setError('');
    try {
      await apiRequest(url, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      });
      await loadPending(level);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur pendant l'action de validation";
      setError(msg);
      throw e;
    } finally {
      setActionLoading(false);
    }
  };

  return { pending, history, loading, actionLoading, error, loadPending, loadHistory, decide };
}