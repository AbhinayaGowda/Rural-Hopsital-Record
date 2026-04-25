import { lazy, Suspense, useState } from 'react';
import PropTypes from 'prop-types';
import Button from './Button.jsx';
import Spinner from './Spinner.jsx';
import styles from './location-picker.module.css';

const LocationPickerMap = lazy(() => import('./LocationPickerMap.jsx'));

export default function LocationPicker({ value, onChange }) {
  const [expanded, setExpanded] = useState(!!(value?.lat));
  const [status, setStatus] = useState('');

  const handleGps = () => {
    setStatus('Requesting location…');
    if (!navigator.geolocation) {
      setStatus('Geolocation not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        onChange({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy), source: 'gps' });
        setExpanded(true);
        setStatus(`Captured (±${Math.round(accuracy)}m). You can drag the pin to adjust.`);
      },
      () => {
        setStatus('Location denied — click the map to place a pin manually.');
        setExpanded(true);
        onChange({ lat: null, lng: null, accuracy: null, source: 'pin_placed' });
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const handleSkip = () => {
    onChange({ lat: null, lng: null, accuracy: null, source: 'skipped' });
    setExpanded(false);
    setStatus('Location skipped.');
  };

  const handleMapMove = (lat, lng) => {
    onChange({ lat, lng, accuracy: value?.accuracy ?? null, source: value?.source === 'gps' ? 'gps' : 'pin_placed' });
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <Button type="button" size="sm" onClick={handleGps}>
          Capture Live Location
        </Button>
        {!expanded && (
          <Button type="button" size="sm" variant="secondary" onClick={() => { setExpanded(true); onChange({ ...value, source: 'pin_placed' }); }}>
            Place pin on map
          </Button>
        )}
        <Button type="button" size="sm" variant="secondary" onClick={handleSkip}>
          Skip
        </Button>
      </div>

      {status && <p className={styles.status}>{status}</p>}

      {value?.lat && value?.lng && (
        <p className={styles.coords}>
          {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          {value.accuracy ? ` (±${value.accuracy}m)` : ''}
          {value.source ? ` · ${value.source}` : ''}
        </p>
      )}

      {expanded && (
        <Suspense fallback={<div className={styles.mapPlaceholder}><Spinner center /></div>}>
          <LocationPickerMap
            lat={value?.lat || null}
            lng={value?.lng || null}
            onMove={handleMapMove}
          />
        </Suspense>
      )}

      <p className={styles.hint}>© OpenStreetMap contributors</p>
    </div>
  );
}

LocationPicker.propTypes = {
  value: PropTypes.shape({
    lat:      PropTypes.number,
    lng:      PropTypes.number,
    accuracy: PropTypes.number,
    source:   PropTypes.string,
  }),
  onChange: PropTypes.func.isRequired,
};
