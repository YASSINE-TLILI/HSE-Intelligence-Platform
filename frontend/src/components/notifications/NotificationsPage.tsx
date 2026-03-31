import React from 'react';
import { useNotifications } from '../../hooks';

export default function NotificationsPage() {
  const { items, loading, error, markRead, markAllRead } = useNotifications();

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">Notifications</h2>
        <button
          type="button"
          onClick={() => void markAllRead()}
          className="px-4 py-2 text-sm rounded-lg bg-slate-900 text-white"
        >
          Tout marquer lu
        </button>
      </div>
      {loading && <p className="text-slate-500">Chargement...</p>}
      {error   && <p className="text-red-600">{error}</p>}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id_notification}
            className={`p-4 rounded-xl border ${
              item.statut_lecture === 'NON_LU'
                ? 'border-amber-300 bg-amber-50'
                : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">{item.type}</p>
                <p className="text-sm text-slate-600">{item.message}</p>
              </div>
              {item.statut_lecture === 'NON_LU' && (
                <button
                  type="button"
                  onClick={() => void markRead(item.id_notification)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-blue-500 text-white"
                >
                  Marquer lu
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}