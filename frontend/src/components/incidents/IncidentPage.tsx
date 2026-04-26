// src/components/incidents/IncidentPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Trash2, MapPin, Navigation, AlertTriangle, Activity, ArrowLeft, Save, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useIncidents } from '../../store';
import { apiRequest } from '../../services/api';
import type { Incident, Priority, IncidentStatus, TypeIncident } from '../../types/index';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function ClickToSelect({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onSelect(e.latlng.lat, e.latlng.lng) });
  return null;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom()); }, [lat, lng, map]);
  return null;
}

type SectorOption = { id: number; name: string };
type ZoneOption = { id: number; name: string; secteurs: SectorOption[] };
type EntityOption = { id: number; name: string; zones: ZoneOption[] };

interface IncidentPageProps {
  isEditMode?: boolean;
}

const inputCls =
  'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder:text-slate-300 transition-all';

const selectCls =
  'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all';

export default function IncidentPage({ isEditMode = false }: IncidentPageProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { addIncident, updateIncident, incidents, isLoading: incidentsLoading } = useIncidents();

  const [zone, setZone] = useState('');
  const [entiteId, setEntiteId] = useState<number | null>(null);
  const [zoneId, setZoneId] = useState<number | null>(null);
  const [secteurId, setSecteurId] = useState<number | null>(null);
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [priority, setPriority] = useState<Priority>('Moyenne');
  const [typeIncident, setTypeIncident] = useState<TypeIncident>('incident');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<IncidentStatus>('En attente');
  const [lat, setLat] = useState(48.8566);
  const [lng, setLng] = useState(2.3522);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isRefLoading, setIsRefLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Vérifier si on est en mode édition
  const editingIncidentId = isEditMode && id ? id : null;
  const isEditing = !!editingIncidentId;

  useEffect(() => {
    if (!isCameraOpen) return;
    if (!videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
  }, [isCameraOpen]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  // Charger les référentiels
  useEffect(() => {
    const load = async () => {
      setIsRefLoading(true);
      try {
        const data = await apiRequest<{ entities: EntityOption[] }>('/api/incidents/reference-data');
        const list = data.entities || [];
        setEntities(list);
        if (!isEditing && list.length > 0) {
          const first = list[0];
          setEntiteId(first.id);
          if (first.zones.length > 0) {
            const fz = first.zones[0];
            setZoneId(fz.id); 
            setZone(fz.name);
            if (fz.secteurs.length > 0) setSecteurId(fz.secteurs[0].id);
          }
        }
      } catch (err) { 
        console.error(err); 
      } finally { 
        setIsRefLoading(false); 
      }
    };
    void load();
  }, [isEditing]);

  // Charger les données pour l'édition
  useEffect(() => {
    if (isEditing && !incidentsLoading && incidents.length > 0) {
      setLoading(true);
      const incident = incidents.find(inc => inc.id === editingIncidentId);
      if (incident) {
        setZone(incident.zone || '');
        setEntiteId(incident.entiteId ?? null);
        setSecteurId(incident.secteurId ?? null);
        setPriority(incident.priority || 'Moyenne');
        setTypeIncident(incident.type_incident || 'incident');
        setDescription(incident.description || '');
        setStatus(incident.status || 'En attente');
        setLat(incident.lat || 48.8566);
        setLng(incident.lng || 2.3522);
        setPhotoUrl(incident.photoUrl);
      }
      setLoading(false);
    }
  }, [isEditing, editingIncidentId, incidents, incidentsLoading]);

  // Mettre à jour les sélections quand les entités sont chargées
  useEffect(() => {
    if (!isEditing || entities.length === 0 || incidentsLoading) return;
    
    const incident = incidents.find(inc => inc.id === editingIncidentId);
    if (!incident) return;

    type M = { e: EntityOption; z: ZoneOption; s: SectorOption };
    type M2 = { e: EntityOption; z: ZoneOption };
    const withS = incident.secteurId
      ? entities.flatMap((e) => e.zones.map((z): M2 => ({ e, z })))
          .flatMap(({ e, z }) => z.secteurs.map((s): M => ({ e, z, s })))
          .find((x) => x.s.id === incident.secteurId)
      : undefined;
    const withZ = !withS
      ? entities.flatMap((e) => e.zones.map((z): M2 => ({ e, z })))
          .find((x) => x.z.name === incident.zone)
      : undefined;
    if (withS) {
      setEntiteId(withS.e.id); 
      setZoneId(withS.z.id);
      setSecteurId(withS.s.id); 
      setZone(withS.z.name);
    } else if (withZ) {
      setEntiteId(withZ.e.id); 
      setZoneId(withZ.z.id); 
      setZone(withZ.z.name);
      if (withZ.z.secteurs[0]) setSecteurId(withZ.z.secteurs[0].id);
    }
  }, [isEditing, entities, editingIncidentId, incidents, incidentsLoading]);

  // Caméra
  const startCamera = async () => {
    setCameraError(null); 
    setIsVideoReady(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Caméra non disponible."); 
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCameraError(`Erreur caméra : ${msg}`);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsCameraOpen(false); 
    setIsVideoReady(false); 
    setCameraError(null);
  };

  const capturePhoto = () => {
    const v = videoRef.current; 
    const c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth || 640; 
    c.height = v.videoHeight || 480;
    c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
    setPhotoUrl(c.toDataURL('image/jpeg', 0.85));
    stopCamera();
  };

  // Géolocalisation
  const useCurrentLocation = () => {
    if (!navigator.geolocation) { 
      alert('Géolocalisation non supportée.'); 
      return; 
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { 
        setLat(p.coords.latitude); 
        setLng(p.coords.longitude); 
        setIsLocating(false); 
      },
      () => { 
        setIsLocating(false); 
        alert('Impossible de récupérer votre position.'); 
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const selectedEntity = entities.find((e) => e.id === entiteId) ?? null;
  const zonesForEntity = selectedEntity?.zones ?? [];
  const selectedZone = zonesForEntity.find((z) => z.id === zoneId) ?? null;
  const sectorsForZone = selectedZone?.secteurs ?? [];

  // Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entiteId || !secteurId) { 
      alert("Veuillez sélectionner l'entité et le secteur."); 
      return; 
    }
    setSubmitting(true);
    try {
      const incidentData = {
        zone, 
        entiteId, 
        secteurId, 
        priority,
        type_incident: typeIncident, 
        description, 
        lat, 
        lng, 
        photoUrl,
      };
      
      if (isEditing) {
        await updateIncident(editingIncidentId!, incidentData);
      } else {
        await addIncident(incidentData);
      }
      navigate('/incidents');
    } catch (error) {
      console.error(error); 
      alert("Échec de l'enregistrement.");
    } finally { 
      setSubmitting(false); 
    }
  };

  if (loading || incidentsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* En-tête de la page */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/incidents')}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ArrowLeft size={18} />
                  Retour
                </button>
                <div className="h-6 w-px bg-slate-200"></div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    {isEditing ? "Modifier l'incident" : "Déclarer un incident / anomalie"}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isEditing ? "Mettez à jour les informations du signalement." : "Renseignez les détails et le type de signalement."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/incidents')}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  form="incident-form"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white rounded-lg shadow-sm shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"
                >
                  {submitting && (
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  )}
                  <Save size={16} />
                  {isEditing ? 'Mettre à jour' : 'Soumettre'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <form id="incident-form" onSubmit={handleSubmit} className="space-y-6">

            {/* Type Incident / Anomalie */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Type de signalement
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTypeIncident('incident')}
                  className={`flex items-center gap-3 px-5 py-4 rounded-xl border-2 transition-all text-sm font-medium ${
                    typeIncident === 'incident'
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <AlertTriangle size={18} className={typeIncident === 'incident' ? 'text-red-500' : 'text-slate-400'} />
                  <span className="font-semibold">Incident</span>
                  {typeIncident === 'incident' && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-red-400" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTypeIncident('anomalie')}
                  className={`flex items-center gap-3 px-5 py-4 rounded-xl border-2 transition-all text-sm font-medium ${
                    typeIncident === 'anomalie'
                      ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Activity size={18} className={typeIncident === 'anomalie' ? 'text-amber-500' : 'text-slate-400'} />
                  <span className="font-semibold">Anomalie</span>
                  {typeIncident === 'anomalie' && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Localisation */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Localisation
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Entité</label>
                  <select 
                    value={entiteId ?? ''} 
                    onChange={(e) => {
                      const id = Number(e.target.value); 
                      setEntiteId(id);
                      const ent = entities.find((x) => x.id === id);
                      const fz = ent?.zones[0];
                      setZoneId(fz?.id ?? null); 
                      setZone(fz?.name ?? '');
                      setSecteurId(fz?.secteurs[0]?.id ?? null);
                    }} 
                    className={selectCls} 
                    required
                  >
                    {isRefLoading && <option value="">Chargement...</option>}
                    {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Zone</label>
                  <select 
                    value={zoneId ?? ''} 
                    onChange={(e) => {
                      const id = Number(e.target.value); 
                      setZoneId(id);
                      const z = zonesForEntity.find((x) => x.id === id);
                      setZone(z?.name ?? ''); 
                      setSecteurId(z?.secteurs[0]?.id ?? null);
                    }} 
                    className={selectCls} 
                    required
                  >
                    {zonesForEntity.length === 0 && <option value="">Aucune zone</option>}
                    {zonesForEntity.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Secteur</label>
                  <select 
                    value={secteurId ?? ''} 
                    onChange={(e) => setSecteurId(Number(e.target.value))} 
                    className={selectCls} 
                    required
                  >
                    {sectorsForZone.length === 0 && <option value="">Aucun secteur</option>}
                    {sectorsForZone.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Priorité + Statut */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    Priorité
                  </label>
                  <select 
                    value={priority} 
                    onChange={(e) => setPriority(e.target.value as Priority)} 
                    className={selectCls}
                  >
                    <option value="Basse">🟢 Basse</option>
                    <option value="Moyenne">🟡 Moyenne</option>
                    <option value="Critique">🔴 Critique</option>
                  </select>
                </div>
                {isEditing && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                      Statut
                    </label>
                    <select 
                      value={status} 
                      onChange={(e) => setStatus(e.target.value as IncidentStatus)} 
                      className={selectCls}
                    >
                      <option value="En attente">⏳ En attente</option>
                      <option value="Résolu">✅ Résolu</option>
                      <option value="Rejeté">❌ Rejeté</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Description
              </label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                className={`${inputCls} h-32 resize-none`} 
                placeholder="Décrivez précisément l'incident ou l'anomalie..."
                required
              />
            </div>

            {/* Position GPS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Position GPS
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
                  <MapPin size={16} className="text-slate-400 flex-shrink-0" />
                  <span className="font-mono">
                    {lat.toFixed(6)}°, {lng.toFixed(6)}°
                  </span>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setIsMapOpen(true)}
                    className="px-4 py-2.5 text-sm font-medium border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors whitespace-nowrap"
                  >
                    📍 Choisir sur la carte
                  </button>
                  <button 
                    type="button" 
                    onClick={useCurrentLocation} 
                    disabled={isLocating}
                    className="px-4 py-2.5 text-sm font-medium border border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <Navigation size={14} />
                    {isLocating ? 'Localisation...' : 'Ma position'}
                  </button>
                </div>
              </div>
            </div>

            {/* Photo */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Preuve photographique
              </label>
              {cameraError && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  ⚠️ {cameraError}
                </div>
              )}
              {!isCameraOpen && !photoUrl && (
                <button 
                  type="button" 
                  onClick={startCamera}
                  className="w-full border-2 border-dashed border-slate-200 rounded-xl py-8 flex flex-col items-center gap-3 text-slate-400 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-500 transition-colors"
                >
                  <Camera size={28} />
                  <span className="text-sm font-medium">Prendre une photo</span>
                </button>
              )}
              {isCameraOpen && (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    onCanPlay={() => setIsVideoReady(true)} 
                    className="w-full h-full object-cover" 
                  />
                  {!isVideoReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                      <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 flex justify-center gap-3 z-20">
                    <button 
                      type="button" 
                      onClick={stopCamera} 
                      className="px-5 py-2 bg-slate-700/80 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      Annuler
                    </button>
                    <button 
                      type="button" 
                      onClick={capturePhoto} 
                      disabled={!isVideoReady}
                      className="px-5 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-blue-600 disabled:opacity-40 transition-colors"
                    >
                      <Camera size={14} /> 
                      {isVideoReady ? 'Capturer' : 'Chargement...'}
                    </button>
                  </div>
                </div>
              )}
              {photoUrl && !isCameraOpen && (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={photoUrl} alt="Preuve photographique" className="w-full h-64 object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      type="button" 
                      onClick={() => setPhotoUrl(undefined)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <Trash2 size={16} /> Supprimer
                    </button>
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </form>
        </div>
      </div>

      {/* Modal carte */}
      {isMapOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Choisir l'emplacement</h3>
                <p className="text-sm text-slate-500">Cliquez sur la carte pour sélectionner un point.</p>
              </div>
              <button 
                onClick={() => setIsMapOpen(false)} 
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="h-96">
              <MapContainer center={[lat, lng]} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <RecenterMap lat={lat} lng={lng} />
                <ClickToSelect onSelect={(pl, pg) => { setLat(pl); setLng(pg); }} />
                <Marker position={[lat, lng]} />
              </MapContainer>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
              <p className="text-sm text-slate-600 font-mono">
                📍 {lat.toFixed(6)}°, {lng.toFixed(6)}°
              </p>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={useCurrentLocation} 
                  disabled={isLocating}
                  className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-60 flex items-center gap-2"
                >
                  <Navigation size={14} /> {isLocating ? 'Localisation...' : 'Ma position'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsMapOpen(false)}
                  className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}