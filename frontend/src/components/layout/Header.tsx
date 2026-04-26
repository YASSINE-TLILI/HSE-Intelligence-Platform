import React from 'react';
import { Bell, Plus } from 'lucide-react';

interface HeaderProps {
  onOpenModal?: () => void;
  title: string;
  canCreateIncident?: boolean;
}

export default function Header({ onOpenModal, title, canCreateIncident = true }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 md:px-8 py-4 md:py-5 bg-slate-50 z-10 flex-shrink-0 border-b border-slate-100">
      {/* Title */}
      <div className="min-w-0 flex-1">
        <h1 className="text-lg md:text-2xl font-bold text-slate-900 truncate">{title}</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-0.5 hidden sm:block">
          Mercredi 18 Février 2026 — Site Industriel Nord
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 md:gap-4 ml-3 flex-shrink-0">
        {/* Bell */}
        <button className="p-2 md:p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm relative transition-colors active:scale-95">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>

        {/* CTA Button */}
        {canCreateIncident && (
          <button
            onClick={onOpenModal}
            className="flex items-center gap-1.5 md:gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl font-medium shadow-sm shadow-blue-500/20 transition-all active:scale-95 text-sm whitespace-nowrap"
          >
            <Plus size={16} />
            {/* Short label on mobile, full label on desktop */}
            <span className="sm:hidden">Déclarer</span>
            <span className="hidden sm:inline">Déclarer un incident</span>
          </button>
        )}
      </div>
    </header>
  );
}