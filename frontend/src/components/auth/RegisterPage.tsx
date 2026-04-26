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
  AlertCircle,
  Building2,
  Layers,
  Globe,
  Users,
  Shield
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
  const [id_entreprise, setIdEntreprise] = useState('');

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

    if (role === 'RESPONSABLE_ENTITE' && !id_entite) {
      setError('ID entité obligatoire.');
      return;
    }

    if (role === 'ADMINISTRATEUR' && !id_site) {
      setError('ID site obligatoire.');
      return;
    }

    if (role === 'SOUS_TRAITANT' && (!id_secteur || !id_entreprise)) {
      setError('ID secteur et ID entreprise sont obligatoires pour un sous-traitant.');
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
          id_entreprise: id_entreprise || null,
        }),
      });

      setMessage('Inscription soumise avec succès. Un administrateur examinera votre demande.');
      // Réinitialiser le formulaire
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la soumission de l\'inscription.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = () => {
    switch(role) {
      case 'ADMINISTRATEUR': return <Shield className="w-5 h-5" />;
      case 'RESPONSABLE_ENTITE': return <Building2 className="w-5 h-5" />;
      case 'RESPONSABLE_ZONE': return <Globe className="w-5 h-5" />;
      case 'RESPONSABLE_SECTEUR': return <Layers className="w-5 h-5" />;
      case 'SOUS_TRAITANT': return <Users className="w-5 h-5" />;
      default: return <Briefcase className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Header avec décoration */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl mb-4 relative">
            <Briefcase className="w-10 h-10 text-white" />
            <div className="absolute -inset-1 bg-blue-500/20 rounded-2xl blur-xl"></div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Créer un compte</h1>
          <p className="text-slate-300 text-lg">Rejoignez notre plateforme de gestion HSE</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">
          <form onSubmit={handleSubmit}>
            <div className="p-8 md:p-10">
              {/* Messages d'alerte */}
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 backdrop-blur-sm">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}
              
              {message && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3 backdrop-blur-sm">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-200">{message}</p>
                </div>
              )}

              {/* Informations personnelles */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500/20 rounded-lg">
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                  Informations personnelles
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Nom complet</label>
                    <input 
                      value={nom} 
                      onChange={(e) => setNom(e.target.value)} 
                      required 
                      className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                      placeholder="Tlili"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Prénom</label>
                    <input 
                      value={prenom} 
                      onChange={(e) => setPrenom(e.target.value)} 
                      required 
                      className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                      placeholder="Yassine"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="email" 
                        value={personalEmail} 
                        onChange={(e) => setPersonalEmail(e.target.value)} 
                        required 
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        placeholder="yassine.tlili@email.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Téléphone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        value={telephone} 
                        onChange={(e) => setTelephone(e.target.value)} 
                        required 
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        placeholder="+212 6 12 34 56 78"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Adresse complète</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        value={adresse} 
                        onChange={(e) => setAdresse(e.target.value)} 
                        required 
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        placeholder="123 Rue Exemple, Casablanca, Maroc"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Date de naissance</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="date" 
                        value={dateNaissance} 
                        onChange={(e) => setDateNaissance(e.target.value)} 
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Informations professionnelles */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500/20 rounded-lg">
                    {getRoleIcon()}
                  </div>
                  Informations professionnelles
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Rôle dans l'organisation</label>
                    <select 
                      value={role} 
                      onChange={(e) => setRole(e.target.value)} 
                      className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                    >
                      <option value="" className="bg-slate-800">Sélectionner un rôle</option>
                      <option value="DECLARANT" className="bg-slate-800">Déclarant</option>
                      <option value="RESPONSABLE_SECTEUR" className="bg-slate-800">Responsable secteur</option>
                      <option value="RESPONSABLE_ZONE" className="bg-slate-800">Responsable zone</option>
                      <option value="RESPONSABLE_ENTITE" className="bg-slate-800">Responsable Entité</option>
                      <option value="ADMINISTRATEUR" className="bg-slate-800">Administrateur</option>
                      <option value="SOUS_TRAITANT" className="bg-slate-800">Sous-traitant</option>
                    </select>
                  </div>

                  {(role === 'DECLARANT' || role === 'RESPONSABLE_SECTEUR') && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">ID du Secteur</label>
                      <input 
                        type="number" 
                        value={id_secteur} 
                        onChange={(e) => setIdSecteur(e.target.value)} 
                        className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        placeholder="Saisir l'ID du secteur"
                      />
                    </div>
                  )}

                  {role === 'SOUS_TRAITANT' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">ID du Secteur</label>
                        <input 
                          type="number" 
                          value={id_secteur} 
                          onChange={(e) => setIdSecteur(e.target.value)} 
                          className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                          placeholder="ID du secteur"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">ID de l'Entreprise</label>
                        <input 
                          type="number" 
                          value={id_entreprise} 
                          onChange={(e) => setIdEntreprise(e.target.value)} 
                          className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                          placeholder="ID de l'entreprise"
                        />
                      </div>
                    </>
                  )}

                  {role === 'RESPONSABLE_ZONE' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">ID de la Zone</label>
                      <input 
                        type="number" 
                        value={id_zone} 
                        onChange={(e) => setIdZone(e.target.value)} 
                        className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        placeholder="ID de la zone"
                      />
                    </div>
                  )}

                  {role === 'RESPONSABLE_ENTITE' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">ID de l'Entité</label>
                      <input 
                        type="number" 
                        value={id_entite} 
                        onChange={(e) => setIdEntite(e.target.value)} 
                        className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        placeholder="ID de l'entité"
                      />
                    </div>
                  )}

                  {role === 'ADMINISTRATEUR' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">ID du Site</label>
                      <input 
                        type="number" 
                        value={id_site} 
                        onChange={(e) => setIdSite(e.target.value)} 
                        className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        placeholder="ID du site"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Sécurité */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500/20 rounded-lg">
                    <Lock className="w-4 h-4 text-blue-400" />
                  </div>
                  Sécurité du compte
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Mot de passe</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={mot_passe} 
                        onChange={(e) => setMotPasse(e.target.value)} 
                        required 
                        className="w-full pr-10 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        placeholder="Créez un mot de passe sécurisé"
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
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Confirmer le mot de passe</label>
                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        value={confirm_mot_passe} 
                        onChange={(e) => setConfirmMotPasse(e.target.value)} 
                        required 
                        className="w-full pr-10 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        placeholder="Confirmez votre mot de passe"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-white/10">
                <a 
                  href="/login" 
                  className="text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-2"
                >
                  ← Retour à la connexion
                </a>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-60 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
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
                    'Créer mon compte'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          En créant un compte, vous acceptez nos conditions d'utilisation et notre politique de confidentialité
        </p>
      </div>
    </div>
  );
}