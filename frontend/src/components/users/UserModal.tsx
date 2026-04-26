import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, Building2, Layers, ChevronDown } from 'lucide-react';
import { useUsers } from '../../store';
import { apiRequest } from '../../services';
import type { User as UserType, UserRole } from '../../types';

interface UserModalProps {
  onClose: () => void;
  userToEdit?: UserType | null;
}

// ─── Types référentiels ────────────────────────────────────────────────────────

interface Secteur {
  id: number;
  name: string;
}

interface Zone {
  id: number;
  name: string;
  secteurs: Secteur[];
}

interface Entite {
  id: number;
  name: string;
  zones: Zone[];
}

// ─── Constantes ────────────────────────────────────────────────────────────────

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'DECLARANT',           label: 'Déclarant' },
  { value: 'RESPONSABLE_SECTEUR', label: 'Responsable Secteur' },
  { value: 'RESPONSABLE_ZONE',    label: 'Responsable Zone' },
  { value: 'RESPONSABLE_ENTITE',  label: 'Responsable Entité' },
  { value: 'ADMINISTRATEUR',      label: 'Administrateur' },
];

const ROLE_COLORS: Record<UserRole, string> = {
  DECLARANT:           'bg-gray-100 text-gray-700 border-gray-200',
  RESPONSABLE_SECTEUR: 'bg-blue-50 text-blue-700 border-blue-200',
  RESPONSABLE_ZONE:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  RESPONSABLE_ENTITE:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  ADMINISTRATEUR:      'bg-purple-50 text-purple-700 border-purple-200',
};

// ─── Sous-composants ───────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ label, icon, required, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
        {icon && <span className="text-slate-400">{icon}</span>}
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 ' +
  'placeholder:text-slate-300 transition-all';

const selectCls =
  'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 ' +
  'transition-all appearance-none cursor-pointer';

// ─── Composant principal ────────────────────────────────────────────────────────

export default function UserModal({ onClose, userToEdit }: UserModalProps) {
  const { addUser, updateUser } = useUsers();

  // ── Champs du formulaire ──────────────────────────────────────────────────
  const [nom,           setNom]           = useState('');
  const [prenom,        setPrenom]        = useState('');
  const [email,         setEmail]         = useState('');
  const [telephone,     setTelephone]     = useState('');
  const [adresse,       setAdresse]       = useState('');
  const [role,          setRole]          = useState<UserRole>('DECLARANT');
  const [dateNaissance, setDateNaissance] = useState('');

  // ── Sélections hiérarchiques ──────────────────────────────────────────────
  const [idEntite,  setIdEntite]  = useState<number | null>(null);
  const [idZone,    setIdZone]    = useState<number | null>(null);
  const [idSecteur, setIdSecteur] = useState<number | null>(null);

  // ── Référentiels ──────────────────────────────────────────────────────────
  const [entities,        setEntities]        = useState<Entite[]>([]);
  const [availableZones,  setAvailableZones]  = useState<Zone[]>([]);
  const [availableSect,   setAvailableSect]   = useState<Secteur[]>([]);
  const [loadingRefs,     setLoadingRefs]     = useState(false);

  // ── Soumission ────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);

  // ── Chargement des référentiels ───────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingRefs(true);
      try {
        const data = await apiRequest<{ entities: Entite[] }>('/api/incidents/reference-data');
        setEntities(data.entities || []);
      } catch (err) {
        console.error('Erreur chargement référentiels:', err);
      } finally {
        setLoadingRefs(false);
      }
    };
    void load();
  }, []);

  // ── Pré-remplissage en mode édition ──────────────────────────────────────
  useEffect(() => {
    if (!userToEdit) return;
    setNom(userToEdit.nom || '');
    setPrenom(userToEdit.prenom || '');
    setEmail(userToEdit.email || '');
    setTelephone(userToEdit.telephone || '');
    setAdresse(userToEdit.adresse || '');
    setRole(userToEdit.role || 'DECLARANT');
    setDateNaissance(
      userToEdit.dateNaissance
        ? new Date(userToEdit.dateNaissance).toISOString().slice(0, 10)
        : '',
    );
    setIdEntite(userToEdit.idEntite ?? null);
    setIdZone(userToEdit.idZone ?? null);
    setIdSecteur(userToEdit.idSecteur ?? null);
  }, [userToEdit]);

  // ── Cascades hiérarchiques ────────────────────────────────────────────────
  useEffect(() => {
    if (idEntite === null) {
      setAvailableZones([]);
      setIdZone(null);
      setAvailableSect([]);
      setIdSecteur(null);
      return;
    }
    const entite = entities.find((e) => e.id === idEntite);
    setAvailableZones(entite?.zones ?? []);
    // Réinitialiser zone/secteur seulement si pas en mode édition avec valeur existante
    if (!userToEdit || userToEdit.idEntite !== idEntite) {
      setIdZone(null);
      setAvailableSect([]);
      setIdSecteur(null);
    }
  }, [idEntite, entities]);

  useEffect(() => {
    if (idZone === null) {
      setAvailableSect([]);
      setIdSecteur(null);
      return;
    }
    const zone = availableZones.find((z) => z.id === idZone);
    setAvailableSect(zone?.secteurs ?? []);
    if (!userToEdit || userToEdit.idZone !== idZone) {
      setIdSecteur(null);
    }
  }, [idZone, availableZones]);

  // Initialise les listes après chargement des référentiels en mode édition
  useEffect(() => {
    if (!userToEdit || entities.length === 0) return;
    if (userToEdit.idEntite) {
      const entite = entities.find((e) => e.id === userToEdit.idEntite);
      const zones  = entite?.zones ?? [];
      setAvailableZones(zones);
      if (userToEdit.idZone) {
        const zone = zones.find((z) => z.id === userToEdit.idZone);
        setAvailableSect(zone?.secteurs ?? []);
      }
    }
  }, [entities, userToEdit]);

  // ── Noms resolus pour affichage ───────────────────────────────────────────
  const nomEntite  = entities.find((e) => e.id === idEntite)?.name ?? '';
  const nomZone    = availableZones.find((z) => z.id === idZone)?.name ?? '';
  const nomSecteur = availableSect.find((s) => s.id === idSecteur)?.name ?? '';

  // ── Soumission ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      nom,
      prenom,
      email,
      telephone,
      adresse,
      role,
      dateNaissance: dateNaissance ?? undefined,
      idEntite,
      idZone,
      idSecteur,
      nomEntite,
      nomZone,
      nomSecteur,
    };
    try {
      if (userToEdit) {
        await updateUser(userToEdit.id, payload);
      } else {
        await addUser(payload as Omit<UserType, 'id'>);
      }
      onClose();
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl shadow-slate-900/10 my-8 overflow-hidden">

        {/* ── En-tête ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/60">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {userToEdit ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {userToEdit
                ? `Modification du profil de ${userToEdit.prenom} ${userToEdit.nom}`
                : 'Remplissez les informations pour créer un compte'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Formulaire ── */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Section : Identité */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Identité
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom" icon={<User size={13} />} required>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className={inputCls}
                  placeholder="Ex: Benali"
                  required
                />
              </Field>
              <Field label="Prénom" icon={<User size={13} />} required>
                <input
                  type="text"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  className={inputCls}
                  placeholder="Ex: Youssef"
                  required
                />
              </Field>
            </div>
          </div>

          {/* Section : Contact */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Contact
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Email" icon={<Mail size={13} />} required>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="exemple@domaine.com"
                  required
                />
              </Field>
              <Field label="Téléphone" icon={<Phone size={13} />}>
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className={inputCls}
                  placeholder="+212 6XX XXX XXX"
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Adresse" icon={<MapPin size={13} />}>
                <input
                  type="text"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  className={inputCls}
                  placeholder="Adresse complète"
                />
              </Field>
            </div>
          </div>

          {/* Section : Profil */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Profil
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Rôle" required>
                <div className="relative">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className={`${selectCls} ${ROLE_COLORS[role]} font-medium border`}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </Field>
              <Field label="Date de naissance">
                <input
                  type="date"
                  value={dateNaissance}
                  onChange={(e) => setDateNaissance(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          {/* Section : Périmètre */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Building2 size={12} />
              Périmètre d'affectation
            </p>
            {loadingRefs ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-3">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Chargement des référentiels…
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                {/* Entité */}
                <Field label="Entité" icon={<Building2 size={13} />}>
                  <div className="relative">
                    <select
                      value={idEntite ?? ''}
                      onChange={(e) => setIdEntite(e.target.value ? Number(e.target.value) : null)}
                      className={selectCls}
                    >
                      <option value="">— Sélectionner —</option>
                      {entities.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </Field>

                {/* Zone */}
                <Field label="Zone" icon={<Layers size={13} />}>
                  <div className="relative">
                    <select
                      value={idZone ?? ''}
                      onChange={(e) => setIdZone(e.target.value ? Number(e.target.value) : null)}
                      disabled={availableZones.length === 0}
                      className={`${selectCls} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <option value="">— Sélectionner —</option>
                      {availableZones.map((z) => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </Field>

                {/* Secteur */}
                <Field label="Secteur" icon={<MapPin size={13} />}>
                  <div className="relative">
                    <select
                      value={idSecteur ?? ''}
                      onChange={(e) => setIdSecteur(e.target.value ? Number(e.target.value) : null)}
                      disabled={availableSect.length === 0}
                      className={`${selectCls} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <option value="">— Sélectionner —</option>
                      {availableSect.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </Field>

              </div>
            )}

            {/* Affichage des noms résolus */}
            {(nomEntite || nomZone || nomSecteur) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {nomEntite && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                    <Building2 size={11} />
                    {nomEntite}
                  </span>
                )}
                {nomZone && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                    <Layers size={11} />
                    {nomZone}
                  </span>
                )}
                {nomSecteur && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                    <MapPin size={11} />
                    {nomSecteur}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Boutons ── */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-sm font-semibold bg-blue-500 hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl shadow-sm shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"
            >
              {submitting && (
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              )}
              {userToEdit ? 'Mettre à jour' : 'Créer l\'utilisateur'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}