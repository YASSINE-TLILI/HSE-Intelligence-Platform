// App.tsx
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { IncidentProvider } from './store';
import { ALL_NAV_ITEMS, Sidebar, Header } from './components/layout';
import { Dashboard } from './components/dashboard/index.ts';
import { IncidentsList, IncidentModal, IncidentDetailPage } from './components/incidents';
import { UsersList, UserModal } from './components/users/index.ts';
import { MapView } from './components/map';
import { Statistics } from './components/stats';
import { NotificationsPage } from './components/notifications';
import { ReportsPage } from './components/reports';
import { Settings } from './components/settings/index.ts';
import { LoginPage, RegisterPage, AdminReviewPage, SetupPasswordPage } from './components/auth';
import { AUTH_USER_KEY, ROLE_PERMISSIONS } from './constants';
import type { AuthUser, Incident, User } from './types';
import { UserProvider } from './store/UserContext';
import { EntitiesPage } from './components/entities';
import { ArrowLeft, LogOut } from 'lucide-react';

// ─── Wrapper pour la page détail incident ─────────────────────────────────────

function IncidentDetailPageWrapper({ 
  authUser, 
  onLogout 
}: { 
  authUser: AuthUser | null; 
  onLogout: () => void;
}) {
  const navigate = useNavigate();

  if (!authUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header simplifié pour la page détail */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/incidents')}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={16} />
              Retour aux incidents
            </button>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700 font-medium">
                {authUser.prenom} {authUser.nom}
              </span>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {authUser.role}
              </span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </header>
      
      {/* Contenu de la page détail */}
      <IncidentDetailPage />
    </div>
  );
}

// ─── Layout principal avec sidebar ────────────────────────────────────────────

function AppContent({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [isModalOpen,    setIsModalOpen]    = useState(false);
  const [activeTab,      setActiveTab]      = useState('dashboard');
  const [incidentToEdit, setIncidentToEdit] = useState<Incident | null>(null);
  const [userToEdit,     setUserToEdit]     = useState<User | null>(null);

  const visibleItems = ALL_NAV_ITEMS.filter((item) => {
    if (item.key === 'actions')  return user.role !== 'ADMINISTRATEUR';
    if (item.key === 'reports')  return ROLE_PERMISSIONS.reports.includes(user.role);
    if (item.key === 'users')    return ['RESPONSABLE_SECTEUR', 'RESPONSABLE_ZONE', 'RESPONSABLE_ENTITE', 'ADMINISTRATEUR'].includes(user.role);
    if (item.key === 'entites')  return ['RESPONSABLE_ZONE', 'RESPONSABLE_ENTITE', 'ADMINISTRATEUR'].includes(user.role);
    return true;
  });

  const PAGE_TITLES: Record<string, string> = {
    dashboard:     'Tableau de Bord HSE',
    incidents:     'Gestion des Incidents',
    users:         'Gestion des Utilisateurs',
    entites:       'Gestion des Entités',
    map:           'Carte des Incidents',
    stats:         'Statistiques',
    notifications: 'Notifications',
    reports:       'Rapports HSE',
    settings:      'Paramètres',
  };

  const userInitials  = `${(user.prenom || '').trim().charAt(0)}${(user.nom || '').trim().charAt(0)}`.toUpperCase() || 'U';
  const showHeaderAdd = activeTab !== 'entites';

  const handleHeaderAdd = () => {
    if (activeTab === 'users') {
      setUserToEdit(null); 
      setIsModalOpen(true);
    } else if (activeTab !== 'entites') {
      setIncidentToEdit(null); 
      setIsModalOpen(true);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        navItems={visibleItems as any}
        userInitials={userInitials}
        onLogout={onLogout}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          onOpenModal={showHeaderAdd ? handleHeaderAdd : undefined}
          title={PAGE_TITLES[activeTab] || 'Tableau de Bord HSE'}
          canCreateIncident={user.role === 'DECLARANT'}
        />
        <div className="px-8 pt-1 text-xs text-slate-500">
          <span>Connecté : {user.prenom} {user.nom} ({user.role})</span>
        </div>

        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard'     && <div className="p-6"><Dashboard /></div>}
          {activeTab === 'incidents'     && (
            <div className="p-6">
              <IncidentsList onEdit={(inc) => { setIncidentToEdit(inc); setIsModalOpen(true); }} />
            </div>
          )}
          {activeTab === 'users'         && <div className="p-6"><UsersList onEdit={(u) => { setUserToEdit(u); setIsModalOpen(true); }} /></div>}
          {activeTab === 'entites'       && <EntitiesPage />}
          {activeTab === 'map'           && <div className="p-6"><MapView /></div>}
          {activeTab === 'stats'         && <div className="p-6"><Statistics /></div>}
          {activeTab === 'notifications' && <div className="p-6"><NotificationsPage /></div>}
          {activeTab === 'reports'       && <div className="p-6"><ReportsPage /></div>}
          {activeTab === 'settings'      && <div className="p-6"><Settings /></div>}
        </main>
      </div>

      {isModalOpen && activeTab === 'incidents' && (
        <IncidentModal
          onClose={() => { setIsModalOpen(false); setIncidentToEdit(null); }}
          incidentToEdit={incidentToEdit}
        />
      )}
      {isModalOpen && activeTab === 'users' && (
        <UserModal
          onClose={() => { setIsModalOpen(false); setUserToEdit(null); }}
          userToEdit={userToEdit}
        />
      )}
    </div>
  );
}

// ─── Guard d'authentification ─────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return <Navigate to="/login" replace />;
  
  // Vérifier que l'utilisateur est valide
  try {
    const user = JSON.parse(raw) as AuthUser;
    if (!user || !user.role) {
      localStorage.removeItem(AUTH_USER_KEY);
      return <Navigate to="/login" replace />;
    }
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// ─── Routes principales ───────────────────────────────────────────────────────

function AppRoutes() {
  const navigate = useNavigate();

  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    try { 
      const user = JSON.parse(raw) as AuthUser;
      // Vérification basique de la validité
      if (!user || !user.role) {
        localStorage.removeItem(AUTH_USER_KEY);
        return null;
      }
      return user;
    } catch { 
      localStorage.removeItem(AUTH_USER_KEY);
      return null; 
    }
  });

  const handleLogin = (user: AuthUser) => {
    console.log('✅ Connexion réussie - Utilisateur:', user);
    console.log('✅ Rôle:', user.role);
    
    // Stocker dans localStorage
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    
    // Vérifier que le stockage a fonctionné
    const stored = localStorage.getItem(AUTH_USER_KEY);
    console.log('✅ Stocké dans localStorage:', stored);
    
    setAuthUser(user);
    navigate('/');
  };

  const handleLogout = () => {
    console.log('👋 Déconnexion');
    localStorage.removeItem(AUTH_USER_KEY);
    setAuthUser(null);
    navigate('/login');
  };

  return (
    <Routes>
      {/* ── Pages publiques ── */}
      <Route path="/login"          element={<LoginPage onLogin={handleLogin} />} />
      <Route path="/register"       element={<RegisterPage />} />
      <Route path="/admin/review"   element={<AdminReviewPage />} />
      <Route path="/setup-password" element={<SetupPasswordPage />} />

      {/* ── Page détail incident — avec header personnalisé ── */}
      <Route
        path="/incidents/:id"
        element={
          <RequireAuth>
            <UserProvider>
              <IncidentProvider>
                <IncidentDetailPageWrapper authUser={authUser} onLogout={handleLogout} />
              </IncidentProvider>
            </UserProvider>
          </RequireAuth>
        }
      />

      {/* ── Application principale avec sidebar ── */}
      <Route
        path="/*"
        element={
          authUser ? (
            <UserProvider>
              <IncidentProvider>
                <AppContent user={authUser} onLogout={handleLogout} />
              </IncidentProvider>
            </UserProvider>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

// ─── Export principal ─────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}