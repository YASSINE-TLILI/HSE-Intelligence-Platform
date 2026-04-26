// src/hooks/useActions.ts

import { useState } from 'react';
import { apiRequest } from '../services/api';
import type { ActionCorrective } from '../types';

interface ActionCreatePayload {
  description: string;
  dateDebut: string;
  dateFinPrevue: string;
  idResponsableSecteur?: number;
}

export function useActions() {
  const [currentAction, setCurrentAction] = useState<ActionCorrective | null>(null);
  const [actions,       setActions]       = useState<ActionCorrective[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');

  /** Charge une action corrective par son id */
  const load = async (actionId: number) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<ActionCorrective>(`/api/actions/${actionId}`);
      setCurrentAction(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement action');
    } finally {
      setLoading(false);
    }
  };

  /** Charge toutes les actions correctives d'un incident */
  const loadForIncident = async (incidentId: number) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<ActionCorrective[]>(`/api/incidents/${incidentId}/actions`);
      setActions(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement actions');
      setActions([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Crée une action corrective pour un incident.
   * L'id_incident est résolu par l'URL (path param) — jamais saisi manuellement.
   */
  const createForIncident = async (incidentId: number, payload: ActionCreatePayload) => {
    setError('');
    const result = await apiRequest<{ id_action: number; message: string }>(
      `/api/incidents/${incidentId}/actions`,
      { method: 'POST', body: JSON.stringify(payload) },
    );
    // Recharger la liste après création
    await loadForIncident(incidentId);
    return result;
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

  return { currentAction, actions, loading, error, load, loadForIncident, createForIncident, validate, close };
}