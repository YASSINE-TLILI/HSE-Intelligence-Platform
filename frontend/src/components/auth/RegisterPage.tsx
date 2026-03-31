import React, { useState } from 'react';
import { apiRequest } from '../../services/api';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase, 
  Lock, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function RegisterPage() {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');

  const [mot_passe, setMotPasse] = useState('');
  const [confirm_mot_passe, setConfirmMotPasse] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [role, setRole] = useState('');

  const [id_secteur, setIdSecteur] = useState('');
  const [id_zone, setIdZone] = useState('');
  const [id_entite, setIdEntite] = useState('');
  const [id_site, setIdSite] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (mot_passe !== confirm_mot_passe) {
      setError('Le mot de passe ne correspond pas.');
      return;
    }

    if (!role) {
      setError('Veuillez choisir un rôle.');
      return;
    }

    if ((role === 'DECLARANT' || role === 'RESPONSABLE_SECTEUR') && !id_secteur) {
      setError('ID secteur obligatoire.');
      return;
    }

    if (role === 'RESPONSABLE_ZONE' && !id_zone) {
      setError('ID zone obligatoire.');
      return;
    }

    if (role === 'RESPONSABLE_HSE' && !id_entite) {
      setError('ID entité obligatoire.');
      return;
    }

    if (role === 'ADMINISTRATEUR' && !id_site) {
      setError('ID site obligatoire.');
      return;
    }

    setIsLoading(true);

    try {
      await apiRequest('/api/auth/register-request', {
        method: 'POST',
        body: JSON.stringify({
          nom,
          prenom,
          personalEmail,
          telephone,
          adresse,
          dateNaissance: dateNaissance || null,
          mot_passe: mot_passe,
          confirm_mot_passe: confirm_mot_passe,
          role,
          id_secteur: id_secteur || null,
          id_zone: id_zone || null,
          id_entite: id_entite || null,
          id_site: id_site || null,
        }),
      });

      setMessage('Inscription soumise avec succès.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la soumission de l\'inscription.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header avec décoration */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-4">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Créer un compte</h1>
          <p className="text-slate-600">Rejoignez notre plateforme de gestion HSE</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <form onSubmit={handleSubmit}>
            <div className="p-8">
              {/* Messages d'alerte */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              
              {message && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-700">{message}</p>
                </div>
              )}

              {/* Informations personnelles */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Informations personnelles
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nom</label>
                    <input 
                      value={nom} 
                      onChange={(e) => setNom(e.target.value)} 
                      required 
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                      placeholder="tlili"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Prénom</label>
                    <input 
                      value={prenom} 
                      onChange={(e) => setPrenom(e.target.value)} 
                      required 
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                      placeholder="Yassine"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="email" 
                        value={personalEmail} 
                        onChange={(e) => setPersonalEmail(e.target.value)} 
                        required 
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                        placeholder="yassine.tlili@email.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        value={telephone} 
                        onChange={(e) => setTelephone(e.target.value)} 
                        required 
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                        placeholder="+212 06 12 34 56 78"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Adresse</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        value={adresse} 
                        onChange={(e) => setAdresse(e.target.value)} 
                        required 
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                        placeholder="123 Rue Exemple, Casablanca"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Date de naissance</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="date" 
                        value={dateNaissance} 
                        onChange={(e) => setDateNaissance(e.target.value)} 
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Informations professionnelles */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-500" />
                  Informations professionnelles
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Rôle</label>
                    <select 
                      value={role} 
                      onChange={(e) => setRole(e.target.value)} 
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"
                    >
                      <option value="">Sélectionner un rôle</option>
                      <option value="DECLARANT">Déclarant</option>
                      <option value="RESPONSABLE_SECTEUR">Responsable secteur</option>
                      <option value="RESPONSABLE_ZONE">Responsable zone</option>
                      <option value="RESPONSABLE_HSE">Responsable HSE</option>
                      <option value="ADMINISTRATEUR">Administrateur</option>
                    </select>
                  </div>

                  {(role === 'DECLARANT' || role === 'RESPONSABLE_SECTEUR') && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">ID Secteur</label>
                      <input 
                        type="number" 
                        value={id_secteur} 
                        onChange={(e) => setIdSecteur(e.target.value)} 
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                        placeholder="Saisir l'ID du secteur"
                      />
                    </div>
                  )}

                  {role === 'RESPONSABLE_ZONE' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">ID Zone</label>
                      <input 
                        type="number" 
                        value={id_zone} 
                        onChange={(e) => setIdZone(e.target.value)} 
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                        placeholder="Saisir l'ID de la zone"
                      />
                    </div>
                  )}

                  {role === 'RESPONSABLE_HSE' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">ID Entité</label>
                      <input 
                        type="number" 
                        value={id_entite} 
                        onChange={(e) => setIdEntite(e.target.value)} 
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                        placeholder="Saisir l'ID de l'entité"
                      />
                    </div>
                  )}

                  {role === 'ADMINISTRATEUR' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">ID Site</label>
                      <input 
                        type="number" 
                        value={id_site} 
                        onChange={(e) => setIdSite(e.target.value)} 
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                        placeholder="Saisir l'ID du site"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Sécurité */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-500" />
                  Sécurité
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Mot de passe</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={mot_passe} 
                        onChange={(e) => setMotPasse(e.target.value)} 
                        required 
                        className="w-full pr-10 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Confirmer le mot de passe</label>
                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        value={confirm_mot_passe} 
                        onChange={(e) => setConfirmMotPasse(e.target.value)} 
                        required 
                        className="w-full pr-10 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-200">
                <a 
                  href="/login" 
                  className="text-sm text-slate-600 hover:text-slate-800 transition-colors"
                >
                  ← Retour à la connexion
                </a>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-60 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Inscription en cours...
                    </span>
                  ) : (
                    'Inscription'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          En créant un compte, vous acceptez nos conditions d'utilisation et notre politique de confidentialité
        </p>
      </div>
    </div>
  );
}    