import { useState, useCallback, useEffect } from 'react';
import { entitesApi, zonesApi, secteursApi, entityHelpers } from '../services/entitiesApi';
import { apiRequest } from '../services/api';
import type { Entite, Zone, Secteur, UserSelect, SiteSelect } from '../types/entities';
import type { EntityScope } from '../types';
import type { EntiteFilters, ZoneFilters, SecteurFilters } from '../services/entitiesApi';

// ─── Entites ──────────────────────────────────────────────────────────────────

export function useEntites(initialFilters: EntiteFilters = {}) {
  const [items, setItems] = useState<Entite[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters);

  const load = useCallback(async (f?: EntiteFilters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await entitesApi.list(f ?? filters);
      setItems(res.items);
      setTotal(res.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, []);

  const create = async (data: Partial<Entite>) => {
    const created = await entitesApi.create(data);
    await load();
    return created;
  };

  const update = async (id: number, data: Partial<Entite>) => {
    const updated = await entitesApi.update(id, data);
    await load();
    return updated;
  };

  const remove = async (id: number) => {
    await entitesApi.delete(id);
    await load();
  };

  const applyFilters = (f: EntiteFilters) => {
    setFilters(f);
    load(f);
  };

  return { items, total, loading, error, load, create, update, remove, applyFilters, filters };
}

// ─── Zones ────────────────────────────────────────────────────────────────────

export function useZones(initialFilters: ZoneFilters = {}) {
  const [items, setItems] = useState<Zone[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters);

  const load = useCallback(async (f?: ZoneFilters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await zonesApi.list(f ?? filters);
      setItems(res.items);
      setTotal(res.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, []);

  const create = async (data: Partial<Zone>) => {
    const created = await zonesApi.create(data);
    await load();
    return created;
  };

  const update = async (id: number, data: Partial<Zone>) => {
    const updated = await zonesApi.update(id, data);
    await load();
    return updated;
  };

  const remove = async (id: number) => {
    await zonesApi.delete(id);
    await load();
  };

  const applyFilters = (f: ZoneFilters) => {
    setFilters(f);
    load(f);
  };

  return { items, total, loading, error, load, create, update, remove, applyFilters, filters };
}

// ─── Secteurs ─────────────────────────────────────────────────────────────────

export function useSecteurs(initialFilters: SecteurFilters = {}) {
  const [items, setItems] = useState<Secteur[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters);

  const load = useCallback(async (f?: SecteurFilters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await secteursApi.list(f ?? filters);
      setItems(res.items);
      setTotal(res.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, []);

  const create = async (data: Partial<Secteur>) => {
    const created = await secteursApi.create(data);
    await load();
    return created;
  };

  const update = async (id: number, data: Partial<Secteur>) => {
    const updated = await secteursApi.update(id, data);
    await load();
    return updated;
  };

  const remove = async (id: number) => {
    await secteursApi.delete(id);
    await load();
  };

  const applyFilters = (f: SecteurFilters) => {
    setFilters(f);
    load(f);
  };

  return { items, total, loading, error, load, create, update, remove, applyFilters, filters };
}

// ─── Entity Scope (permissions + defaults par rôle) ───────────────────────────

export function useEntityScope() {
  const [scope, setScope] = useState<EntityScope | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<EntityScope>('/api/v1/entities/scope')
      .then(setScope)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { scope, loading };
}

// ─── Modal select helpers ─────────────────────────────────────────────────────

export function useEntiteSelectData(open: boolean) {
  const [sites, setSites] = useState<SiteSelect[]>([]);
  const [users, setUsers] = useState<UserSelect[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      entityHelpers.getSitesSelect(),
      entityHelpers.getUsersSelect('RESPONSABLE_ENTITE'),
    ])
      .then(([sitesData, usersData]) => {
        setSites(sitesData);
        setUsers(usersData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open]);

  return { sites, users, loading };
}

export function useZoneSelectData(open: boolean) {
  const [entites, setEntites] = useState<Entite[]>([]);
  const [users, setUsers] = useState<UserSelect[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      entitesApi.list({ limit: 500 }),
      entityHelpers.getUsersSelect('RESPONSABLE_ZONE'),
    ])
      .then(([entitesData, usersData]) => {
        setEntites(entitesData.items);
        setUsers(usersData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open]);

  return { entites, users, loading };
}

export function useSecteurSelectData(open: boolean) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [users, setUsers] = useState<UserSelect[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      zonesApi.list({ limit: 500 }),
      entityHelpers.getUsersSelect('RESPONSABLE_SECTEUR'),
    ])
      .then(([zonesData, usersData]) => {
        setZones(zonesData.items);
        setUsers(usersData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open]);

  return { zones, users, loading };
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

export function useEntityHelpers() {
  const [users, setUsers] = useState<UserSelect[]>([]);
  const [sites, setSites] = useState<SiteSelect[]>([]);

  const loadUsers = async (role?: string) => {
    const data = await entityHelpers.getUsersSelect(role);
    setUsers(data);
    return data;
  };

  const loadSites = async () => {
    const data = await entityHelpers.getSitesSelect();
    setSites(data);
    return data;
  };

  return { users, sites, loadUsers, loadSites };
}