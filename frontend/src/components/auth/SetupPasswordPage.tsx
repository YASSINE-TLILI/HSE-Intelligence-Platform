import React, { useState } from 'react';
import { apiRequest } from '../../services/api';

export default function SetupPasswordPage() {
  const params  = new URLSearchParams(window.location.search);
  const token   = params.get('token') || '';
  const [pin, setPin]                         = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage]                 = useState('');
  const [error, setError]                     = useState('');
  const [isLoading, setIsLoading]             = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!token) { setError('Token de configuration manquant.'); return; }
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return; }
    setIsLoading(true);
    try {
      await apiRequest('/api/auth/setup-password', {
        method: 'POST',
        body: JSON.stringify({ token, pin, password }),
      });
      setMessage('Mot de passe défini avec succès. Vous pouvez vous connecter.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900">Activer mon compte</h1>
        <p className="text-sm text-slate-500 mt-1">Entrez votre PIN d&apos;inscription et définissez votre mot de passe.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">PIN</label>
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} required className="w-full border border-slate-200 rounded-xl px-4 py-2.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border border-slate-200 rounded-xl px-4 py-2.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmer le mot de passe</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full border border-slate-200 rounded-xl px-4 py-2.5" />
          </div>
          {error   && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-600">{message}</p>}
          <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-medium">
            {isLoading ? 'Validation...' : 'Valider'}
          </button>
        </form>
        <p className="text-sm text-slate-600 mt-4">
          <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">Aller à la connexion</a>
        </p>
      </div>
    </div>
  );
}