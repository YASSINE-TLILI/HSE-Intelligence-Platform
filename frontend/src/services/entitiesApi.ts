import { apiRequest } from './api';
import type { Entite, Zone, Secteur, UserSelect, SiteSelect } from '../types/entities';

export interface ListResponse<T> {
  items: T[];
  total: number;
}

export interface EntiteFilters {
  search?: string;
  id_site?: number;
  skip?: number;
  limit?: number;
}

export interface ZoneFilters {
  search?: string;
  id_entite?: number;
  skip?: number;
  limit?: number;
}

export interface SecteurFilters {
  search?: string;
  id_zone?: number;
  id_entite?: number;
  skip?: number;
  limit?: number;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '' && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `?${qs}` : '';
}


export const entitesApi = {
  list: (filters: EntiteFilters = {}): Promise<ListResponse<Entite>> =>
    apiRequest(`/api/v1/entities/entites${buildQuery(filters as Record<string, string | number | undefined>)}`),

  getById: (id: number): Promise<Entite> =>
    apiRequest(`/api/v1/entities/entites/${id}`),

  create: (data: Partial<Entite>): Promise<Entite> =>
    apiRequest('/api/v1/entities/entites', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<Entite>): Promise<Entite> =>
    apiRequest(`/api/v1/entities/entites/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number): Promise<{ message: string }> =>
    apiRequest(`/api/v1/entities/entites/${id}`, { method: 'DELETE' }),
};


export const zonesApi = {
  list: (filters: ZoneFilters = {}): Promise<ListResponse<Zone>> =>
    apiRequest(`/api/v1/entities/zones${buildQuery(filters as Record<string, string | number | undefined>)}`),

  getById: (id: number): Promise<Zone> =>
    apiRequest(`/api/v1/entities/zones/${id}`),

  create: (data: Partial<Zone>): Promise<Zone> =>
    apiRequest('/api/v1/entities/zones', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<Zone>): Promise<Zone> =>
    apiRequest(`/api/v1/entities/zones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number): Promise<{ message: string }> =>
    apiRequest(`/api/v1/entities/zones/${id}`, { method: 'DELETE' }),
};


export const secteursApi = {
  list: (filters: SecteurFilters = {}): Promise<ListResponse<Secteur>> =>
    apiRequest(`/api/v1/entities/secteurs${buildQuery(filters as Record<string, string | number | undefined>)}`),

  getById: (id: number): Promise<Secteur> =>
    apiRequest(`/api/v1/entities/secteurs/${id}`),

  create: (data: Partial<Secteur>): Promise<Secteur> =>
    apiRequest('/api/v1/entities/secteurs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<Secteur>): Promise<Secteur> =>
    apiRequest(`/api/v1/entities/secteurs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number): Promise<{ message: string }> =>
    apiRequest(`/api/v1/entities/secteurs/${id}`, { method: 'DELETE' }),
};


export const entityHelpers = {
  getUsersSelect: (role?: string): Promise<UserSelect[]> =>
    apiRequest(`/api/v1/entities/users-select${role ? `?role=${role}` : ''}`),

  getSitesSelect: (): Promise<SiteSelect[]> =>
    apiRequest('/api/v1/entities/sites-select'),
};