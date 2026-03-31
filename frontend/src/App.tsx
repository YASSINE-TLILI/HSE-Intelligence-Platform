import React, { useMemo, useState } from 'react';
import { IncidentProvider } from './store';
import { ALL_NAV_ITEMS, Sidebar, Header } from './components/layout';
import {Dashboard} from './components/dashboard/index.ts';
import { IncidentsList, IncidentModal } from './components/incidents';
import { MapView } from './components/map';
import { Statistics } from './components/stats';
import { NotificationsPage } from './components/notifications';
import { ValidationQueuePage } from './components/validations/index.ts';
import { ActionCorrectivePage } from './components/actions';
import { SafetyScorePage } from './components/safety';
import { ReportsPage } from './components/reports';
import {Settings} from './components/settings/index.ts'
import { LoginPage, RegisterPage, AdminReviewPage, SetupPasswordPage } from './components/auth';
import { AUTH_USER_KEY, ROLE_PERMISSIONS } from './constants';
import type { AuthUser, Incident } from './types';

function AppContent({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [activeTab, setActiveTab]       = useState('dashboard');
  const [incidentToEdit, setIncidentToEdit] = useState<Incident | null>(null);

  const visibleItems = ALL_NAV_ITEMS.filter((item) => {
    if (item.key === 'validations' || item.key === 'actions') return ROLE_PERMISSIONS.validations.includes(user.role);
    if (item.key === 'reports') return ROLE_PERMISSIONS.reports.includes(user.role);
    return true;
  });

  const PAGE_TITLES: Record<string, string> = {
    dashboard: 'Tableau de Bord HSE', incidents: 'Gestion des Incidents',
    map: 'Carte des Incidents', stats: 'Statistiques',
    notifications: 'Notifications', validations: 'File de Validation',
    actions: 'Actions Correctives', safety: 'Safety Score',
    reports: 'Rapports HSE', settings: 'Paramètres',
  };

  const userInitials = `${(user.prenom || '').trim().charAt(0)}${(user.nom || '').trim().charAt(0)}`.toUpperCase() || 'U';

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} navItems={visibleItems as any} userInitials={userInitials} onLogout={onLogout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onOpenModal={() => { setIncidentToEdit(null); setIsModalOpen(true); }} title={PAGE_TITLES[activeTab] || 'Tableau de Bord HSE'} canCreateIncident={user.role === 'DECLARANT'} />
        <div className="px-8 pt-1 text-xs text-slate-500">
          <span>Connecté: {user.prenom} {user.nom} ({user.role})</span>
        </div>
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard'     && <Dashboard />}
          {activeTab === 'incidents'     && <IncidentsList onEdit={(inc) => { setIncidentToEdit(inc); setIsModalOpen(true); }} />}
          {activeTab === 'map'           && <MapView />}
          {activeTab === 'stats'         && <Statistics />}
          {activeTab === 'notifications' && <NotificationsPage />}
          {activeTab === 'validations'   && <ValidationQueuePage />}
          {activeTab === 'actions'       && <ActionCorrectivePage />}
          {activeTab === 'safety'        && <SafetyScorePage />}
          {activeTab === 'reports'       && <ReportsPage />}
          {activeTab === 'settings'      && <Settings />}
        </main>
      </div>
      {isModalOpen && <IncidentModal onClose={() => { setIsModalOpen(false); setIncidentToEdit(null); }} incidentToEdit={incidentToEdit} />}
    </div>
  );
}

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as AuthUser; } catch { return null; }
  });
  const path = useMemo(() => window.location.pathname, []);

  const handleLogin  = (user: AuthUser) => { localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user)); setAuthUser(user); window.location.href = '/'; };
  const handleLogout = () => { localStorage.removeItem(AUTH_USER_KEY); setAuthUser(null); window.location.href = '/login'; };

  if (path === '/admin/review')   return <AdminReviewPage />;
  if (path === '/setup-password') return <SetupPasswordPage />;
  if (path === '/register')       return <RegisterPage />;
  if (!authUser)                  return <LoginPage onLogin={handleLogin} />;

  return <IncidentProvider><AppContent user={authUser} onLogout={handleLogout} /></IncidentProvider>;
}