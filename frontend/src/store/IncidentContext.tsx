import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiRequest } from '../services';
import type { Incident } from '../types/';
interface IncidentContextType {
  incidents: Incident[];
  isLoading: boolean;
  addIncident: (
    incident: Omit<Incident, 'id' | 'time' | 'reporter' | 'score' | 'status'>,
  ) => Promise<void>;
  updateIncident: (id: string, incident: Partial<Incident>) => Promise<void>;
  deleteIncident: (id: string) => Promise<void>;
}

const IncidentContext = createContext<IncidentContextType | undefined>(undefined);

export function IncidentProvider({ children }: { children: ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadIncidents = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<Incident[]>('/api/incidents');
      setIncidents(data);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      alert(`Erreur de chargement des incidents depuis la base MySQL: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadIncidents();
  }, []);

  const addIncident = async (
    newIncident: Omit<Incident, 'id' | 'time' | 'reporter' | 'score' | 'status'>,
  ) => {
    const incident = await apiRequest<Incident>('/api/incidents', {
      method: 'POST',
      body: JSON.stringify(newIncident),
    });
    setIncidents((prev) => [incident, ...prev]);
  };

  const updateIncident = async (id: string, updatedFields: Partial<Incident>) => {
    const existing = incidents.find((incident) => incident.id === id);
    if (!existing) return;

    const payload = { ...existing, ...updatedFields };
    const updated = await apiRequest<Incident>(`/api/incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    setIncidents((prev) => prev.map((incident) => (incident.id === id ? updated : incident)));
  };

  const deleteIncident = async (id: string) => {
    try {
      await apiRequest(`/api/incidents/${id}`, { method: 'DELETE' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      if (!message.includes('404')) {
        throw error;
      }
    }
    setIncidents((prev) => prev.filter((incident) => incident.id !== id));
  };

  return (
    <IncidentContext.Provider value={{ incidents, isLoading, addIncident, updateIncident, deleteIncident }}>
      {children}
    </IncidentContext.Provider>
  );
}

export function useIncidents(): IncidentContextType {
  const context = useContext(IncidentContext);
  if (context === undefined) {
    throw new Error('useIncidents must be used within an IncidentProvider');
  }
  return context;
}