import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Trash2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useIncidents } from '../../store';
import { apiRequest } from '../../services/api';
import type { Incident, Priority, IncidentStatus } from '../../types/index';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function ClickToSelect({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (event) => { onSelect(event.latlng.lat, event.latlng.lng); } });
  return null;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom()); }, [lat, lng, map]);
  return null;
}

interface IncidentModalProps {
  onClose: () => void;
  incidentToEdit?: Incident | null;
}

type SectorOption = { id: number; name: string };
type ZoneOption   = { id: number; name: string; secteurs: SectorOption[] };
type EntityOption = { id: number; name: string; zones: ZoneOption[] };

export default function IncidentModal({ onClose, incidentToEdit }: IncidentModalProps) {
  const { addIncident, updateIncident } = useIncidents();

  const [title, setTitle]           = useState('');
  const [zone, setZone]             = useState('');
  const [entiteId, setEntiteId]     = useState<number | null>(null);
  const [zoneId, setZoneId]         = useState<number | null>(null);
  const [secteurId, setSecteurId]   = useState<number | null>(null);
  const [entities, setEntities]     = useState<EntityOption[]>([]);
  const [priority, setPriority]     = useState<Priority>('Moyenne');
  const [description, setDescription] = useState('');
  const [status, setStatus]         = useState<IncidentStatus>('En attente');
  const [lat, setLat]               = useState(48.8566);
  const [lng, setLng]               = useState(2.3522);
  const [photoUrl, setPhotoUrl]     = useState<string | undefined>(undefined);
  const [isMapOpen, setIsMapOpen]   = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isRefLoading, setIsRefLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load reference data (entities / zones / secteurs)
  useEffect(() => {
    const loadReferences = async () => {
      setIsRefLoading(true);
      try {
        const data = await apiRequest<{ entities: EntityOption[] }>('/api/incidents/reference-data');
        const list = data.entities || [];
        setEntities(list);
        if (!incidentToEdit && list.length > 0) {
          const first = list[0];
          setEntiteId(first.id);
          if (first.zones.length > 0) {
            const firstZone = first.zones[0];
            setZoneId(firstZone.id);
            setZone(firstZone.name);
            if (firstZone.secteurs.length > 0) setSecteurId(firstZone.secteurs[0].id);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsRefLoading(false);
      }
    };
    void loadReferences();
  }, [incidentToEdit]);

  // Populate form when editing
  useEffect(() => {
    if (incidentToEdit) {
      setTitle(incidentToEdit.title);
      setZone(incidentToEdit.zone);
      setEntiteId(incidentToEdit.entiteId ?? null);
      setZoneId(null);
      setSecteurId(incidentToEdit.secteurId ?? null);
      setPriority(incidentToEdit.priority);
      setDescription(incidentToEdit.description);
      setStatus(incidentToEdit.status);
      setLat(incidentToEdit.lat);
      setLng(incidentToEdit.lng);
      setPhotoUrl(incidentToEdit.photoUrl);
    }
  }, [incidentToEdit]);

  // Resolve entity/zone/secteur IDs when editing
  useEffect(() => {
    if (!incidentToEdit || entities.length === 0) return;
    if (entiteId && zoneId && secteurId) return;

    const bySectorId = incidentToEdit.secteurId
      ? entities
          .flatMap((e) => e.zones.map((z) => ({ e, z })))
          .flatMap(({ e, z }) => z.secteurs.map((s) => ({ e, z, s })))
          .find((entry) => entry.s.id === incidentToEdit.secteurId)
      : undefined;

    if (bySectorId) {
      setEntiteId(bySectorId.e.id);
      setZoneId(bySectorId.z.id);
      setSecteurId(bySectorId.s.id);
      setZone(bySectorId.z.name);
      return;
    }

    const byZoneName = entities
      .flatMap((e) => e.zones.map((z) => ({ e, z })))
      .find((entry) => entry.z.name === incidentToEdit.zone);

    if (byZoneName) {
      setEntiteId(byZoneName.e.id);
      setZoneId(byZoneName.z.id);
      setZone(byZoneName.z.name);
      if (byZoneName.z.secteurs.length > 0) setSecteurId(byZoneName.z.secteurs[0].id);
    }
  }, [incidentToEdit, entities, entiteId, zoneId, secteurId]);

  // Cleanup camera on unmount
  useEffect(() => { return () => { stopCamera(); }; }, []);

  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsCameraOpen(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert("Impossible d'accéder à la caméra. Veuillez vérifier les permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      alert("La caméra n'est pas encore prête. Veuillez réessayer dans un instant.");
      return;
    }
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setPhotoUrl(canvas.toDataURL('image/jpeg', 0.8));
      stopCamera();
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { alert("La géolocalisation n'est pas supportée par votre navigateur."); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setIsLocating(false); },
      (err) => { setIsLocating(false); console.error(err); alert('Impossible de récupérer votre position. Vérifiez les permissions de localisation.'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entiteId || !secteurId) { alert("Veuillez sélectionner l'entité et le secteur."); return; }
    try {
      if (incidentToEdit) {
        await updateIncident(incidentToEdit.id, { title, zone, entiteId, secteurId, priority, description, status, lat, lng, photoUrl });
      } else {
        await addIncident({ title, zone, entiteId, secteurId, priority, description, lat, lng, photoUrl });
      }
      onClose();
    } catch (error) {
      console.error(error);
      alert("Échec de l'enregistrement dans la base de données.");
    }
  };

  const selectedEntity   = entities.find((e) => e.id === entiteId) || null;
  const zonesForEntity   = selectedEntity?.zones || [];
  const selectedZone     = zonesForEntity.find((z) => z.id === zoneId) || null;
  const sectorsForZone   = selectedZone?.secteurs || [];

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 overflow-y-auto">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 my-8">
          <div className="flex justify-between items-center p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">
              {incidentToEdit ? "Modifier l'incident" : 'Déclarer un incident'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Titre de l'incident</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="Ex: Fuite d'eau..." required autoFocus />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Entité</label>
                  <select
                    value={entiteId ?? ''}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setEntiteId(id);
                      const entity = entities.find((it) => it.id === id);
                      if (entity?.zones.length) {
                        const z = entity.zones[0];
                        setZoneId(z.id); setZone(z.name);
                        setSecteurId(z.secteurs.length ? z.secteurs[0].id : null);
                      } else { setZoneId(null); setSecteurId(null); setZone(''); }
                    }}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" required
                  >
                    {isRefLoading && <option value="">Chargement...</option>}
                    {!isRefLoading && entities.length === 0 && <option value="">Aucune entité</option>}
                    {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Zone</label>
                  <select
                    value={zoneId ?? ''}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setZoneId(id);
                      const z = zonesForEntity.find((it) => it.id === id);
                      setZone(z?.name || '');
                      setSecteurId(z?.secteurs.length ? z.secteurs[0].id : null);
                    }}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" required
                  >
                    {zonesForEntity.length === 0 && <option value="">Aucune zone</option>}
                    {zonesForEntity.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Secteur</label>
                  <select value={secteurId ?? ''} onChange={(e) => setSecteurId(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" required
                  >
                    {sectorsForZone.length === 0 && <option value="">Aucun secteur</option>}
                    {sectorsForZone.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Priorité</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Basse">Basse</option>
                    <option value="Moyenne">Moyenne</option>
                    <option value="Haute">Haute</option>
                    <option value="Critique">Critique</option>
                  </select>
                </div>
              </div>

              {incidentToEdit && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Statut</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as IncidentStatus)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="En attente">En attente</option>
                    <option value="En cours">En cours</option>
                    <option value="Résolu">Résolu</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Latitude (GPS)</label>
                  <input type="text" value={lat.toFixed(6)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-slate-600" readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Longitude (GPS)</label>
                  <input type="text" value={lng.toFixed(6)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-slate-600" readOnly />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button type="button" onClick={() => setIsMapOpen(true)}
                  className="w-full px-4 py-2.5 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl text-sm font-medium transition-colors">
                  Sélectionner sur OpenStreetMap
                </button>
                <button type="button" onClick={useCurrentLocation} disabled={isLocating}
                  className="w-full px-4 py-2.5 border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 rounded-xl text-sm font-medium transition-colors">
                  {isLocating ? 'Localisation...' : 'Utiliser ma position'}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 h-28 resize-none"
                  placeholder="Détails de l'incident..." />
              </div>

              {/* Photo Capture */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Preuve photographique</label>
                {!isCameraOpen && !photoUrl && (
                  <button type="button" onClick={startCamera}
                    className="w-full border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-blue-400 hover:text-blue-500 transition-colors">
                    <Camera size={24} className="mb-2" />
                    <span className="text-sm font-medium">Prendre une photo</span>
                  </button>
                )}
                {isCameraOpen && (
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex flex-col">
                    <video ref={videoRef} autoPlay playsInline muted
                      onLoadedMetadata={() => { videoRef.current?.play().catch(e => console.error('Error playing video:', e)); }}
                      className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center gap-4">
                      <button type="button" onClick={stopCamera} className="px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700">Annuler</button>
                      <button type="button" onClick={capturePhoto} className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 flex items-center gap-2">
                        <Camera size={16} /> Capturer
                      </button>
                    </div>
                  </div>
                )}
                {photoUrl && !isCameraOpen && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 group">
                    <img src={photoUrl} alt="Preuve" className="w-full h-48 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={() => setPhotoUrl(undefined)}
                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg" title="Supprimer la photo">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Annuler</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-500 text-white font-medium hover:bg-blue-600 rounded-xl shadow-sm shadow-blue-500/20 transition-all active:scale-95">
                  {incidentToEdit ? 'Mettre à jour' : 'Soumettre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {isMapOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Choisir l'emplacement</h3>
                <p className="text-xs text-slate-500">Cliquez sur la carte pour sélectionner le point exact.</p>
              </div>
              <button type="button" onClick={() => setIsMapOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="h-[380px]">
              <MapContainer center={[lat, lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <RecenterMap lat={lat} lng={lng} />
                <ClickToSelect onSelect={(pickedLat, pickedLng) => { setLat(pickedLat); setLng(pickedLng); }} />
                <Marker position={[lat, lng]} />
              </MapContainer>
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-600">Position: {lat.toFixed(6)}, {lng.toFixed(6)}</p>
              <div className="flex gap-2">
                <button type="button" onClick={useCurrentLocation} disabled={isLocating}
                  className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-60">
                  {isLocating ? 'Localisation...' : 'Ma position'}
                </button>
                <button type="button" onClick={() => setIsMapOpen(false)} className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600">Confirmer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}