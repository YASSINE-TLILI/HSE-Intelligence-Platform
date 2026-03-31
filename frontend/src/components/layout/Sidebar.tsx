import React, { useState } from 'react';
import {
  LayoutDashboard, ClipboardList, Map, BarChart2, Settings, Bell,
  CheckSquare, Wrench, ShieldCheck, FileText, LogOut,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (key: string) => void;
  navItems: Array<{ icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; label: string; key: string }>;
  userInitials: string;
  onLogout: () => void;
}

export const ALL_NAV_ITEMS = [
  { key: 'dashboard',     icon: LayoutDashboard, label: 'Tableau de bord' },
  { key: 'incidents',     icon: ClipboardList,   label: 'Incidents' },
  { key: 'map',           icon: Map,             label: 'Carte' },
  { key: 'stats',         icon: BarChart2,        label: 'Statistiques' },
  { key: 'notifications', icon: Bell,            label: 'Notifications' },
  { key: 'validations',   icon: CheckSquare,     label: 'Validations' },
  { key: 'actions',       icon: Wrench,          label: 'Actions Correctives' },
  { key: 'safety',        icon: ShieldCheck,     label: 'Safety Score' },
  { key: 'reports',       icon: FileText,        label: 'Rapports' },
  { key: 'settings',      icon: Settings,        label: 'Paramètres' },
] as const;

export default function Sidebar({ activeTab, setActiveTab, navItems, userInitials, onLogout }: SidebarProps) {
  const [expanded, setExpanded] = useState(false);
  const widthClass    = expanded ? 'w-64' : 'w-20';
  const navAlignClass = expanded ? 'items-stretch px-3' : 'items-center';
  const logoSizeClass = expanded ? 'w-11 h-11 text-lg' : 'w-12 h-12 text-xl';

  return (
    <aside className={`${widthClass} bg-slate-900 flex flex-col py-5 h-full flex-shrink-0 z-20 transition-all duration-300 ease-out`}>
      <div className={`px-3 mb-6 flex items-center ${expanded ? 'justify-between' : 'justify-center'}`}>
        <div className={`${logoSizeClass} bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 cursor-pointer hover:bg-blue-600 transition-colors`}>
          H
        </div>
        {expanded && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            title="Réduire le menu"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
        {!expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="absolute top-5 right-2 p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            title="Étendre le menu"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
      </div>

      <nav className={`flex-1 flex flex-col gap-4 w-full ${navAlignClass}`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === activeTab;
          return (
            <div key={item.key} className={`relative w-full flex group ${expanded ? '' : 'justify-center'}`} title={item.label}>
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-r-md" />
              )}
              <button
                onClick={() => setActiveTab(item.key)}
                className={`flex items-center gap-3 ${expanded ? 'w-full px-3 py-3' : 'p-3'} rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-slate-800 text-blue-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 active:scale-95'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
                {expanded && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            </div>
          );
        })}

        <div className={`relative w-full flex group ${expanded ? '' : 'justify-center'}`} title="Déconnexion">
          <button
            type="button"
            onClick={onLogout}
            className={`flex items-center gap-3 ${expanded ? 'w-full px-3 py-3' : 'p-3'} rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 active:scale-95 transition-all duration-200`}
          >
            <LogOut size={22} strokeWidth={1.5} />
            {expanded && <span className="text-sm font-medium">Déconnexion</span>}
          </button>
        </div>
      </nav>

      <div className={`mt-4 px-3 flex ${expanded ? 'justify-start' : 'justify-center'}`}>
        <button className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md hover:bg-blue-600 transition-colors active:scale-95">
          {userInitials}
        </button>
      </div>
    </aside>
  );
}