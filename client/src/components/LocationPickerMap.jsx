import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default icon paths broken by Vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function LocationPickerMap({ lat, lng, onMove }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markerRef    = useRef(null);

  useEffect(() => {
    if (mapRef.current) return; // already initialised

    const center = lat && lng ? [lat, lng] : [20.5937, 78.9629]; // India center
    const zoom   = lat && lng ? 15 : 5;

    const map = L.map(containerRef.current, { center, zoom });
    mapRef.current = map;

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    if (lat && lng) {
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current = marker;
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onMove(pos.lat, pos.lng);
      });
    }

    map.on('click', (e) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        const marker = L.marker([clickLat, clickLng], { draggable: true }).addTo(map);
        markerRef.current = marker;
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onMove(pos.lat, pos.lng);
        });
      }
      onMove(clickLat, clickLng);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Sync if lat/lng changes externally (e.g. GPS capture)
  useEffect(() => {
    if (!mapRef.current || !lat || !lng) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
      markerRef.current = marker;
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onMove(pos.lat, pos.lng);
      });
    }
    mapRef.current.setView([lat, lng], 15);
  }, [lat, lng]);

  return (
    <div ref={containerRef} style={{ height: 260, width: '100%', borderRadius: 6, border: '1px solid #e5e7eb' }} />
  );
}

LocationPickerMap.propTypes = {
  lat:    PropTypes.number,
  lng:    PropTypes.number,
  onMove: PropTypes.func.isRequired,
};
