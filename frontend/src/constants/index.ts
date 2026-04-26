import { UserRole } from "../types";
export const AUTH_USER_KEY = 'hse_auth_user';

export const NAV_KEYS = {
  DASHBOARD: 'dashboard',
  INCIDENTS: 'incidents',
  MAP: 'map',
  STATS: 'stats',
  NOTIFICATIONS: 'notifications',
  VALIDATIONS: 'validations',
  ACTIONS: 'actions',
  SAFETY: 'safety',
  REPORTS: 'reports',
  SETTINGS: 'settings',
} as const;

export type NavKey = (typeof NAV_KEYS)[keyof typeof NAV_KEYS];

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  SETUP_PASSWORD: '/setup-password',
  ADMIN_REVIEW: '/admin/review',
} as const;

export const ROLE_PERMISSIONS: {
  validations: UserRole[];
  actions: UserRole[];
  reports: UserRole[];
} = {
  validations: ['RESPONSABLE_SECTEUR', 'RESPONSABLE_ZONE', 'RESPONSABLE_ENTITE', 'ADMINISTRATEUR'],
  actions: ['RESPONSABLE_SECTEUR', 'RESPONSABLE_ZONE', 'RESPONSABLE_ENTITE', 'ADMINISTRATEUR'],
  reports: ['RESPONSABLE_ZONE', 'RESPONSABLE_ENTITE', 'ADMINISTRATEUR'],
};