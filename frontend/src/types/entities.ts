export interface Responsable {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

export interface Entite {
  id_entite: number;
  nom_entite: string;
  description?: string;
  id_site: number;
  id_responsable_entite?: number;
  responsable?: Responsable;
  nb_zones?: number;
}

export interface Zone {
  id_zone: number;
  nom_zone: string;
  safety_score?: number;
  id_entite: number;
  id_responsable_zone?: number;
  responsable?: Responsable;
  entite_nom?: string;
  nb_secteurs?: number;
}

export interface Secteur {
  id_secteur: number;
  nom_secteur: string;
  description?: string;
  id_zone: number;
  id_responsable_secteur?: number;
  responsable?: Responsable;
  zone_nom?: string;
  entite_nom?: string;
}

export interface UserSelect {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
}

export interface SiteSelect {
  id_site: number;
  nom_site: string;
}

export type EntityTab = 'entites' | 'zones' | 'secteurs';