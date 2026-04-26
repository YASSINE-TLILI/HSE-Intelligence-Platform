// ─── Auth ───────────────────────────────────────────────────────────────────
export type UserRole =
  | 'SOUS_TRAITANT'
  | 'DECLARANT'
  | 'RESPONSABLE_SECTEUR'
  | 'RESPONSABLE_ZONE'
  | 'RESPONSABLE_ENTITE'
  | 'ADMINISTRATEUR';

export interface AuthUser {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  scope_id?: number;
}

export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  active?: boolean;
  telephone?: string;
  adresse?: string;
  dateNaissance?: string;
  idSite?: number;
  idSecteur?: number;
  idZone?: number;
  idEntite?: number;
  nomSecteur?: string;
  nomZone?: string;
  nomEntite?: string;
}

// ─── Incidents ───────────────────────────────────────────────────────────────
export type Priority = 'Basse' | 'Moyenne' | 'Critique';
export type TypeIncident = 'incident' | 'anomalie';
export type IncidentStatus =
  | 'En attente'
  | 'EN_ATTENTE_VALIDATION_SECTEUR'
  | 'VALIDE_SECTEUR'
  | 'EN_ATTENTE_VALIDATION_ZONE'
  | 'VALIDE_ZONE'
  | 'EN_ATTENTE_VALIDATION_ENTITE'
  | 'VALIDE_ENTITE'
  | 'REJETE'
  | 'CLOTURE';

export interface IncidentStats {
  total: number;
  total_incidents: number;
  total_anomalies: number;
  en_cours: number;
  resolus: number;
  rejetes: number;
  waiting_for_validation?:number
}

export interface Incident {
  id: string;
  zone: string;
  secteur?: string;
  secteurId?: number;
  entiteId?: number;
  entite?: string;
  priority: Priority;
  type_incident: TypeIncident;
  description: string;
  status: IncidentStatus;
  time: string;
  reporter: string;
  score: number;
  lat: number;
  lng: number;
  photoUrl?: string;
}

// ─── Scope Filters ───────────────────────────────────────────────────────────
export interface ScopeItem {
  id: number;
  nom: string;
}

export interface ScopeFilters {
  role: string;
  scope_id: number | null;
  entites: ScopeItem[];
  zones: ScopeItem[];
  secteurs: ScopeItem[];
  locked: {
    entite: boolean;
    zone: boolean;
    secteur: boolean;
  };
}

export interface EntityScope {
  role: string;
  scope_id: number | null;
  locked: {
    entite: boolean;
    zone: boolean;
    secteur: boolean;
  };
  default_entite_id: number | null;
  default_zone_id: number | null;
  default_secteur_id: number | null;
  can_create_entite: boolean;
  can_create_zone: boolean;
  can_create_secteur: boolean;
}

// ─── Validations ─────────────────────────────────────────────────────────────
export type ValidationLevel = 'SECTEUR' | 'ZONE' | 'ENTITE';

export interface ValidationItem {
  id_validation: number;
  statut: string;
  date_validation: string;
  description: string | null;
  niveau: string;
  nom: string | null;
  prenom: string | null;
}

export interface PendingIncident {
  id_incident: number;
  nom: string;
  prenom: string;
  date_creation: string;
  titre: string;
  description: string;
  priorite: Priority;
  statut: string;
  date_declaration: string;
  nom_zone: string;
  nom_secteur: string;
  nom_entite: string;
  niveau_validation: ValidationLevel;
}

// ─── Actions correctives ─────────────────────────────────────────────────────
export interface ActionCorrective {
  id_action: number;
  description: string;
  date_debut: string;
  date_fin_prevue: string;
  date_cloture: string | null;
  statut: string;
  preuve_photo: string | null;
  id_incident: number;
  id_responsable_secteur: number | null;
}

// ─── Notifications ───────────────────────────────────────────────────────────
export type NotificationStatus = 'NON_LU' | 'LU';

export interface NotificationItem {
  id_notification: number;
  message: string;
  type: string;
  date_envoi: string;
  statut_lecture: NotificationStatus;
  id_incident: number | null;
}

// ─── Reports ─────────────────────────────────────────────────────────────────
export type ReportScopeType = 'GLOBAL' | 'ZONE' | 'SECTEUR';

export interface ReportGeneratePayload {
  dateStart: string;
  dateEnd: string;
  scopeType: ReportScopeType;
  scopeId?: number | null;
}

// ─── Safety ──────────────────────────────────────────────────────────────────
export interface SafetyScore {
  score: number;
  label: string;
  details?: Record<string, unknown>;
}