import React from 'react';
import { Search, Bell, Plus } from 'lucide-react';

interface HeaderProps {
  onOpenModal: () => void;
  title: string;
  canCreateIncident?: boolean;
}

export default function Header({ onOpenModal, title, canCreateIncident = true }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-8 py-6 bg-slate-50 z-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 mt-1">
          Mercredi 18 Février 2026 — Site Industriel Nord
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher un incident..."
            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-sm transition-all"
          />
        </div>

        <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm relative transition-colors active:scale-95">
          <Bell size={20} />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>

        {canCreateIncident && (
          <button
            onClick={onOpenModal}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm shadow-blue-500/20 transition-all active:scale-95"
          >
            <Plus size={18} />
            Déclarer un incident
          </button>
        )}
      </div>
    </header>
  );
}