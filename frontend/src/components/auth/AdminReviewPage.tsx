import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';

type ReviewData = {
  idRequest: number;
  nom: string;
  prenom: string;
  personalEmail: string;
  telephone: string | null;
  adresse: string | null;
  dateNaissance: string | null;
  status: string;
  createdAt: string;
};

const ROLES = [
  'DECLARANT',
  'RESPONSABLE_SECTEUR',
  'RESPONSABLE_ZONE',
  'RESPONSABLE_ENTITE',
  'ADMINISTRATEUR',
];

export default function AdminReviewPage() {
  const params = new URLSearchParams(window.location.search);
  const token  = params.get('token') || '';
  const [reviewData, setReviewData]     = useState<ReviewData | null>(null);
  const [assignedRole, setAssignedRole] = useState('DECLARANT');
  const [companyEmail, setCompanyEmail] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [message, setMessage]           = useState('');
  const [error, setError]               = useState('');
  const [isLoading, setIsLoading]       = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!token) { setError('Token admin manquant.'); setIsLoading(false); return; }
      try {
        const body = await apiRequest<ReviewData>(`/api/admin/review?token=${encodeURIComponent(token)}`);
        setReviewData(body);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [token]);

  const decide = async (action: 'approve' | 'decline') => {
    setError('');
    setMessage('');
    try {
      const body = await apiRequest<{ message: string }>('/api/admin/review', {
        method: 'POST',
        body: JSON.stringify({ token, action, role: assignedRole, companyEmail, note: decisionNote }),
      });
      setMessage(body.message || 'Décision enregistrée.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-100 p-6 text-slate-600">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900">Validation administrateur</h1>
        <p className="text-sm text-slate-500 mt-1">Vérifiez les informations et choisissez un rôle.</p>

        {error   && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-4 text-sm text-emerald-600">{message}</p>}

        {reviewData && (
          <div className="mt-6 space-y-3 text-sm">
            <p><span className="font-semibold">Nom:</span> {reviewData.nom} {reviewData.prenom}</p>
            <p><span className="font-semibold">Email personnel:</span> {reviewData.personalEmail}</p>
            <p><span className="font-semibold">Téléphone:</span> {reviewData.telephone || '-'}</p>
            <p><span className="font-semibold">Adresse:</span> {reviewData.adresse || '-'}</p>
            <p><span className="font-semibold">Date naissance:</span> {reviewData.dateNaissance || '-'}</p>
            <p><span className="font-semibold">Statut:</span> {reviewData.status}</p>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Rôle attribué</label>
            <select value={assignedRole} onChange={(e) => setAssignedRole(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5">
              {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email entreprise (optionnel)</label>
            <input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="auto si vide" className="w-full border border-slate-200 rounded-xl px-4 py-2.5" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Note décision</label>
            <textarea value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} rows={3} className="w-full border border-slate-200 rounded-xl px-4 py-2.5" />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => void decide('approve')} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">Accepter</button>
          <button type="button" onClick={() => void decide('decline')} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl">Refuser</button>
        </div>
      </div>
    </div>
  );
}