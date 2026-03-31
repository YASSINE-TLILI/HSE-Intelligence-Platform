// ─── Auth ───────────────────────────────────────────────────────────────────
export type UserRole =
  | 'DECLARANT'
  | 'RESPONSABLE_SECTEUR'
  | 'RESPONSABLE_ZONE'
  | 'RESPONSABLE_HSE'
  | 'ADMINISTRATEUR';

export interface AuthUser {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
}



// ─── Incidents ───────────────────────────────────────────────────────────────
export type Priority = 'Basse' | 'Moyenne' | 'Haute' | 'Critique';
export type IncidentStatus = 'En attente' | 'En cours' | 'Résolu';

export interface Incident {
  id: string;
  title: string;
  zone: string;
  secteur?: string;
  secteurId?: number;
  entiteId?: number;
  entite?: string;
  priority: Priority;
  description: string;
  status: IncidentStatus;
  time: string;
  reporter: string;
  score: number;
  lat: number;
  lng: number;
  photoUrl?: string;
}

// ─── Validations ─────────────────────────────────────────────────────────────
export type ValidationLevel = 'SECTEUR' | 'ZONE' | 'HSE';

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
  titre: string;
  description: string;
  statut: string;
  date_declaration: string;
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