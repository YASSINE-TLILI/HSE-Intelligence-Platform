import React, { useEffect, useState } from 'react';
import { Bell, User, Moon, Save } from 'lucide-react';
import { apiRequest } from '../../services';
import { AUTH_USER_KEY } from '../../constants';

type AppSettings = {
  fullName: string;
  email: string;
  notifications: boolean;
  emailAlerts: boolean;
  darkMode: boolean;
  language: string;
};

const STORAGE_KEY = 'hse_app_settings';

const defaultSettings: AppSettings = {
  fullName:      'K. Mansouri',
  email:         'k.mansouri@entreprise.com',
  notifications: true,
  emailAlerts:   true,
  darkMode:      false,
  language:      'fr',
};

function applyGlobalSettings(settings: AppSettings) {
  document.documentElement.lang = settings.language;
  document.body.classList.toggle('app-dark', settings.darkMode);
}

export default function Settings() {
  const [fullName,      setFullName]      = useState(defaultSettings.fullName);
  const [email,         setEmail]         = useState(defaultSettings.email);
  const [notifications, setNotifications] = useState(defaultSettings.notifications);
  const [emailAlerts,   setEmailAlerts]   = useState(defaultSettings.emailAlerts);
  const [darkMode,      setDarkMode]      = useState(defaultSettings.darkMode);
  const [language,      setLanguage]      = useState(defaultSettings.language);
  const [saveMessage,   setSaveMessage]   = useState('');
  const [saveError,     setSaveError]     = useState('');
  const [roleLabel,     setRoleLabel]     = useState('Utilisateur');

  // Load from localStorage + API
  useEffect(() => {
    const rawUser = localStorage.getItem(AUTH_USER_KEY);
    if (rawUser) {
      try {
        const user = JSON.parse(rawUser) as { nom?: string; prenom?: string; email?: string; role?: string };
        if (user.prenom || user.nom) setFullName(`${user.prenom || ''} ${user.nom || ''}`.trim());
        if (user.email) setEmail(user.email);
        if (user.role)  setRoleLabel(user.role);
      } catch (error) { console.error('Invalid auth user in storage:', error); }
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as AppSettings;
      setFullName(saved.fullName      ?? defaultSettings.fullName);
      setEmail(saved.email            ?? defaultSettings.email);
      setNotifications(saved.notifications ?? defaultSettings.notifications);
      setEmailAlerts(saved.emailAlerts     ?? defaultSettings.emailAlerts);
      setDarkMode(saved.darkMode           ?? defaultSettings.darkMode);
      setLanguage(saved.language           ?? defaultSettings.language);
      applyGlobalSettings({ ...defaultSettings, ...saved });
    } catch (error) { console.error('Invalid saved settings:', error); }
  }, []);

  // Sync profile from API
  useEffect(() => {
    if (!localStorage.getItem(AUTH_USER_KEY)) return;
    const loadProfile = async () => {
      try {
        const me = await apiRequest<{ nom: string; prenom: string; email: string; role: string }>('/api/auth/me');
        setFullName(`${me.prenom} ${me.nom}`.trim());
        setEmail(me.email);
        setRoleLabel(me.role);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify({
          ...(JSON.parse(localStorage.getItem(AUTH_USER_KEY) || '{}')),
          nom: me.nom, prenom: me.prenom, email: me.email, role: me.role,
        }));
      } catch (error) { console.error('Cannot load profile from API:', error); }
    };
    void loadProfile();
  }, []);

  const handleSave = async () => {
    setSaveError('');
    const payload: AppSettings = { fullName, email, notifications, emailAlerts, darkMode, language };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    applyGlobalSettings(payload);
    if (!localStorage.getItem(AUTH_USER_KEY)) { setSaveError('Utilisateur non connecté.'); return; }

    const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
    const prenom    = nameParts.shift() || '';
    const nom       = nameParts.join(' ') || prenom;

    try {
      const updated = await apiRequest<{ id: number; nom: string; prenom: string; email: string; role: string }>('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ prenom, nom, email }),
      });
      setRoleLabel(updated.role);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ id: updated.id, nom: updated.nom, prenom: updated.prenom, email: updated.email, role: updated.role }));
      setSaveMessage('Modifications enregistrées en base.');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Erreur inconnue');
      setSaveMessage('');
      return;
    }
    window.setTimeout(() => setSaveMessage(''), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto pb-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Paramètres de l'application</h2>
          <p className="text-sm text-slate-500 mt-1">Gérez vos préférences et paramètres de compte</p>
        </div>

        <div className="p-6 grid gap-8">
          {/* Profil */}
          <section>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <User size={20} className="text-blue-500" /> Profil Utilisateur
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom complet</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email professionnel</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Rôle</label>
                <input type="text" value={roleLabel} disabled className="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-xl px-4 py-2" />
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Notifications */}
          <section>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <Bell size={20} className="text-amber-500" /> Notifications
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Notifications Push', sub: 'Recevoir des alertes sur cet appareil', val: notifications, set: setNotifications },
                { label: 'Alertes Email',       sub: 'Recevoir un email pour les incidents critiques', val: emailAlerts, set: setEmailAlerts },
              ].map(({ label, sub, val, set }) => (
                <label key={label} className="flex items-center justify-between cursor-pointer">
                  <div><div className="font-medium text-slate-800">{label}</div><div className="text-sm text-slate-500">{sub}</div></div>
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={val} onChange={() => set(!val)} />
                    <div className={`block w-14 h-8 rounded-full transition-colors ${val ? 'bg-blue-500' : 'bg-slate-200'}`} />
                    <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${val ? 'transform translate-x-6' : ''}`} />
                  </div>
                </label>
              ))}
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Apparence */}
          <section>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <Moon size={20} className="text-indigo-500" /> Apparence & Langue
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Thème</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setDarkMode(false)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${!darkMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Clair</button>
                  <button onClick={() => setDarkMode(true)}  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${darkMode  ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Sombre</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Langue</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
            </div>
          </section>

          <div className="pt-4 flex items-center justify-between">
            <div>
              <span className="text-sm text-emerald-600">{saveMessage}</span>
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            </div>
            <button
              type="button"
              onClick={() => void handleSave()}
              className="px-6 py-2.5 bg-blue-500 text-white font-medium hover:bg-blue-600 rounded-xl shadow-sm shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"
            >
              <Save size={18} />
              Enregistrer les modifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}