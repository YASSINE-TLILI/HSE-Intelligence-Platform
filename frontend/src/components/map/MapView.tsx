import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useIncidents } from '../../store/';
import type { Map as LeafletMap } from 'leaflet';

// 🔥 Fix icons Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 🧠 IMPORTANT: remplace whenCreated
function MapController({ mapRef }: { mapRef: React.MutableRefObject<LeafletMap | null> }) {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  return null;
}

export default function MapView() {
  const { incidents } = useIncidents();

  const [userLocation, setUserLocation] =
    useState<[number, number] | null>(null);

  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((position) => {
      setUserLocation([
        position.coords.latitude,
        position.coords.longitude,
      ]);
    });
  }, []);

  const goToUserLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((position) => {
      const coords: [number, number] = [
        position.coords.latitude,
        position.coords.longitude,
      ];

      setUserLocation(coords);

      // 🔥 centrer la map
      mapRef.current?.setView(coords, 16);
    });
  };

  const center: [number, number] =
    userLocation ||
    (incidents.length > 0
      ? [incidents[0].lat, incidents[0].lng]
      : [48.8566, 2.3522]);

  return (
    <div className="h-full relative">

      <button
        onClick={goToUserLocation}
        style={{
          position: 'absolute',
          zIndex: 1000,
          top: 10,
          right: 10,
          background: 'white',
          padding: '8px',
          borderRadius: '8px',
        }}
      >
        📍 Ma position
      </button>

      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100vh', width: '100%' }}
      >
        {/* 🔥 NEW: récupérer map */}
        <MapController mapRef={mapRef} />

        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLocation && (
          <Marker position={userLocation}>
            <Popup>📍 Vous êtes ici</Popup>
          </Marker>
        )}

        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            position={[incident.lat, incident.lng]}
            eventHandlers={{
              click: () => {
                goToUserLocation();
              },
            }}
          >
            <Popup>
              <strong>{incident.title}</strong>
              <br />
              {incident.zone}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}