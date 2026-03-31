import React from 'react';
import { Edit2, Trash2, Camera } from 'lucide-react';
import { useIncidents } from '../../store';
import type { Incident } from '../../types/index';

interface IncidentsListProps {
  onEdit: (incident: Incident) => void;
}

export default function IncidentsList({ onEdit }: IncidentsListProps) {
  const { incidents, deleteIncident, isLoading } = useIncidents();

  return (
    <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
              <th className="px-6 py-4 font-medium">Titre</th>
              <th className="px-6 py-4 font-medium">Zone</th>
              <th className="px-6 py-4 font-medium">Priorité</th>
              <th className="px-6 py-4 font-medium">Statut</th>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Chargement depuis MySQL...</td>
              </tr>
            ) : incidents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Aucun incident enregistré.</td>
              </tr>
            ) : (
              incidents.map((incident) => (
                <tr key={incident.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      {incident.title}
                      {incident.photoUrl && <Camera size={14} className="text-blue-500" title="Preuve photographique jointe" />}
                    </div>
                    <div className="text-xs text-slate-500 truncate max-w-xs">{incident.description}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{incident.zone}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      incident.priority === 'Critique' ? 'bg-red-100 text-red-700' :
                      incident.priority === 'Haute'    ? 'bg-orange-100 text-orange-700' :
                      incident.priority === 'Moyenne'  ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {incident.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      incident.status === 'En attente' ? 'bg-amber-50 text-amber-700' :
                      incident.status === 'En cours'   ? 'bg-blue-50 text-blue-700' :
                      'bg-emerald-50 text-emerald-700'
                    }`}>
                      {incident.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{incident.time}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(incident)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm('Êtes-vous sûr de vouloir supprimer cet incident ?')) {
                            try {
                              await deleteIncident(incident.id);
                            } catch (error) {
                              console.error(error);
                              alert('Échec de la suppression en base de données.');
                            }
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}