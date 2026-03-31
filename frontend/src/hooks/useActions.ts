import { useState } from 'react';
import { apiRequest } from '../services';
import type { ActionCorrective } from '../types';

export function useActions() {
  const [currentAction, setCurrentAction] = useState<ActionCorrective | null>(null);
  const [error, setError] = useState('');

  const load = async (actionId: number) => {
    try {
      const data = await apiRequest<ActionCorrective>(`/api/actions/${actionId}`);
      setCurrentAction(data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement action');
    }
  };

  const createForIncident = async (
    incidentId: number,
    payload: { description: string; dateDebut: string; dateFinPrevue: string },
  ) => {
    setError('');
    return apiRequest(`/api/incidents/${incidentId}/actions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  };

  const validate = async (actionId: number) => {
    setError('');
    return apiRequest(`/api/actions/${actionId}/validate`, { method: 'PATCH' });
  };

  const close = async (actionId: number, preuvePhoto?: string) => {
    setError('');
    return apiRequest(`/api/actions/${actionId}/close`, {
      method: 'PATCH',
      body: JSON.stringify({ preuvePhoto }),
    });
  };

  return { currentAction, error, load, createForIncident, validate, close };
}