import React, { useState } from 'react';
import { apiRequest } from '../../services/api';
import type { AuthUser } from '../../types/index';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Briefcase } from 'lucide-react';

export default function LoginPage({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const body = await apiRequest<{ user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      onLogin(body.user);
      console.log("API RESPONSE:", body.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header avec décoration */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl mb-4 relative">
            <Briefcase className="w-10 h-10 text-white" />
            <div className="absolute -inset-1 bg-blue-500/20 rounded-2xl blur-xl"></div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Bienvenue</h1>
          <p className="text-slate-300 text-lg">Connectez-vous à votre espace HSE</p>
        </div>

        {/* Formulaire de connexion */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">
          <div className="p-8 md:p-10">
            {/* Message d'erreur */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 backdrop-blur-sm">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email professionnel
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                    placeholder="yassine.tlili@email.com"
                    required
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Utilisez votre email professionnel validé
                </p>
              </div>

              {/* Mot de passe */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Lien mot de passe oublié */}
              <div className="text-right">
                <a 
                  href="/forgot-password" 
                  className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                >
                  Mot de passe oublié ?
                </a>
              </div>

              {/* Bouton de connexion */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-60 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Se connecter
                  </>
                )}
              </button>
            </form>

            {/* Lien vers l'inscription */}
            <div className="mt-6 pt-5 border-t border-white/10">
              <p className="text-sm text-slate-300 text-center">
                Nouveau sur la plateforme ?{' '}
                <a 
                  href="/register" 
                  className="text-blue-400 hover:text-blue-300 font-medium hover:underline transition-colors"
                >
                  Créer un compte
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Plateforme de gestion HSE - Sécurisé et conforme
        </p>
      </div>
    </div>
  );
}