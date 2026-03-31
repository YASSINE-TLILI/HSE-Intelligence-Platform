import { useState } from 'react';
import { apiRequest } from '../services/api';

export function useSafetyScores() {
  const [global, setGlobal] = useState<any>(null);
  const [zone, setZone] = useState<any>(null);
  const [sector, setSector] = useState<any>(null);
  const [error, setError] = useState('');

  const loadGlobal = async () => {
    try {
      setGlobal(await apiRequest('/api/safety/global'));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur safety global');
    }
  };

  const loadZone = async (zoneId: number) => {
    try {
      setZone(await apiRequest(`/api/safety/zone/${zoneId}`));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur safety zone');
    }
  };

  const loadSector = async (sectorId: number) => {
    try {
      setSector(await apiRequest(`/api/safety/sector/${sectorId}`));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur safety sector');
    }
  };

  return { global, zone, sector, error, loadGlobal, loadZone, loadSector };
}