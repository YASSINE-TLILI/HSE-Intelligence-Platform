// src/components/layout/Sidebar.tsx
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, ClipboardList, Map, BarChart2, Settings, Bell,
  Wrench, ShieldCheck, FileText, LogOut,
  PanelLeftClose, PanelLeftOpen,
  UsersIcon, Building2, Menu, X,
} from 'lucide-react';

import { apiRequest } from '../../services/api';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (key: string) => void;
  navItems: Array<{
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    label: string;
    key: string;
  }>;
  userInitials: string;
  onLogout: () => void;
}

export const ALL_NAV_ITEMS = [
  { key: 'dashboard',     icon: LayoutDashboard, label: 'Tableau de bord' },
  { key: 'incidents',     icon: ClipboardList,   label: 'Incidents' },
  { key: 'users',         icon: UsersIcon,       label: 'Utilisateurs' },
  { key: 'entites',       icon: Building2,       label: 'Entités' },
  { key: 'map',           icon: Map,             label: 'Carte' },
  { key: 'stats',         icon: BarChart2,       label: 'Statistiques' },
  { key: 'notifications', icon: Bell,            label: 'Notifications' },
  { key: 'reports',       icon: FileText,        label: 'Rapports' },
  { key: 'settings',      icon: Settings,        label: 'Paramètres' },
] as const;

export default function Sidebar({
  activeTab,
  setActiveTab,
  navItems,
  userInitials,
  onLogout
}: SidebarProps) {

  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 🔔 Notifications polling
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const data = await apiRequest<{ count: number }>('/api/notifications/unread-count');
        setUnreadCount(data.count || 0);
      } catch {
        // silence
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000);

    return () => clearInterval(interval);
  }, []);

  // fermer mobile après navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [activeTab]);

  // bloquer scroll mobile
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const navAlignClass = expanded ? 'items-stretch px-3' : 'items-center';

  return (
    <>
      {/* ================= DESKTOP ================= */}
      <aside className={`hidden md:flex ${expanded ? 'w-64' : 'w-20'} bg-slate-900 flex-col py-5 h-full flex-shrink-0 transition-all duration-300`}>

        {/* HEADER */}
        <div className={`px-3 mb-6 flex items-center ${expanded ? 'justify-between' : 'justify-center'}`}>
          <div className="w-11 h-11 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold">
            H
          </div>

          {expanded ? (
            <button onClick={() => setExpanded(false)}>
              <PanelLeftClose size={18} />
            </button>
          ) : (
            <button onClick={() => setExpanded(true)}>
              <PanelLeftOpen size={16} />
            </button>
          )}
        </div>

        {/* NAV */}
        <nav className={`flex-1 flex flex-col gap-1 w-full ${navAlignClass}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === activeTab;
            const isNotif = item.key === 'notifications';

            return (
              <div key={item.key} className={`relative w-full flex ${expanded ? '' : 'justify-center'}`}>
                
                <button
                  onClick={() => setActiveTab(item.key)}
                  className={`flex items-center gap-3 ${expanded ? 'w-full px-3 py-2.5' : 'p-3'} rounded-xl ${
                    isActive ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Icon size={20} />

                  {expanded && <span>{item.label}</span>}

                  {/* 🔴 BADGE */}
                  {isNotif && unreadCount > 0 && (
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white text-blue-600' : 'bg-red-500 text-white'
                    }`}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>
            );
          })}

          {/* LOGOUT */}
          <button onClick={onLogout} className="mt-2 text-red-400">
            <LogOut size={20} />
            {expanded && <span>Déconnexion</span>}
          </button>
        </nav>

        {/* USER */}
        <div className="mt-4 flex justify-center">
          <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white">
            {userInitials}
          </div>
        </div>
      </aside>

      {/* ================= MOBILE ================= */}
      <div className="md:hidden flex justify-between p-3 bg-slate-900">
        <span className="text-white">HSE</span>
        <button onClick={() => setMobileOpen(true)}>
          <Menu size={22} />
        </button>
      </div>

      {/* OVERLAY */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
      )}

      {/* DRAWER */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-slate-900 transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        <button onClick={() => setMobileOpen(false)}>
          <X />
        </button>

        <nav className="flex flex-col p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === activeTab;
            const isNotif = item.key === 'notifications';

            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`flex items-center gap-3 p-3 ${
                  isActive ? 'bg-slate-800 text-blue-400' : 'text-white'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>

                {/* 🔴 BADGE */}
                {isNotif && unreadCount > 0 && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}

          <button onClick={onLogout} className="text-red-400 mt-3">
            Déconnexion
          </button>
        </nav>
      </div>
    </>
  );
}