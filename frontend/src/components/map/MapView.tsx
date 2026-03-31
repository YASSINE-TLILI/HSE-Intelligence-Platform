import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useIncidents } from '../../store/';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function MapView() {
  const { incidents } = useIncidents();
  const center: [number, number] = incidents.length > 0
    ? [incidents[0].lat, incidents[0].lng]
    : [48.8566, 2.3522];

  return (
    <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-[calc(100vh-140px)] flex flex-col">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-900">Carte des incidents</h2>
        <p className="text-sm text-slate-500">Localisation GPS des incidents déclarés</p>
      </div>
      <div className="flex-1 relative z-0">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {incidents.map((incident) => (
            <Marker key={incident.id} position={[incident.lat, incident.lng]}>
              <Popup>
                <div className="font-sans">
                  <h3 className="font-bold text-slate-900 mb-1">{incident.title}</h3>
                  <p className="text-sm text-slate-600 mb-2">{incident.zone}</p>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                    incident.priority === 'Critique' ? 'bg-red-100 text-red-700' :
                    incident.priority === 'Haute'    ? 'bg-orange-100 text-orange-700' :
                    incident.priority === 'Moyenne'  ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {incident.priority}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}