import { useState } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import Input from '../../components/Input.jsx';
import Select from '../../components/Select.jsx';
import Button from '../../components/Button.jsx';
import LocationPicker from '../../components/LocationPicker.jsx';
import { locationsApi } from '../../api/locations.js';
import styles from '../form.module.css';

export default function HouseholdForm({ initial, onSubmit, loading, error, onCancel }) {
  const [f, setF] = useState({
    malaria_number: initial?.malaria_number ?? '',
    address_line:   initial?.address_line  ?? '',
    pincode:        initial?.pincode       ?? '',
    notes:          initial?.notes         ?? '',
    // text fields — synced from dropdown selections or typed in manual village mode
    village:        initial?.village       ?? '',
    district:       initial?.district      ?? '',
    state:          initial?.state         ?? '',
  });

  const [stateId,    setStateId]    = useState(initial?.state_id    ?? '');
  const [districtId, setDistrictId] = useState(initial?.district_id ?? '');
  const [villageId,  setVillageId]  = useState(initial?.village_id  ?? '');
  // manualVillage: user types the village name but still picks state+district from dropdowns
  const [manualVillage, setManualVillage] = useState(false);

  const [location, setLocation] = useState(
    initial?.latitude ? { lat: initial.latitude, lng: initial.longitude, source: initial.location_source } : null,
  );
  const [villageCreating, setVillageCreating] = useState(false);
  const [villageCreateError, setVillageCreateError] = useState('');

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const { data: states = [] }    = useQuery({ queryKey: ['states'],               queryFn: () => locationsApi.states(),          staleTime: Infinity });
  const { data: districts = [] } = useQuery({ queryKey: ['districts', stateId],   queryFn: () => locationsApi.districts(stateId), staleTime: Infinity, enabled: !!stateId });
  const { data: villages = [] }  = useQuery({ queryKey: ['villages', districtId], queryFn: () => locationsApi.villages({ districtId }), staleTime: 60_000, enabled: !!districtId && !manualVillage });

  const handleStateChange = (e) => {
    const sid = e.target.value;
    setStateId(sid);
    setDistrictId('');
    setVillageId('');
    const s = states.find(x => x.id === sid);
    setF(p => ({ ...p, state: s?.name ?? '', district: '', village: '' }));
  };

  const handleDistrictChange = (e) => {
    const did = e.target.value;
    setDistrictId(did);
    setVillageId('');
    const d = districts.find(x => x.id === did);
    setF(p => ({ ...p, district: d?.name ?? '', village: '' }));
  };

  const handleVillageChange = (e) => {
    const vid = e.target.value;
    setVillageId(vid);
    const v = villages.find(x => x.id === vid);
    setF(p => ({ ...p, village: v?.name ?? '', pincode: v?.pincode || p.pincode }));
  };

  const toggleManualVillage = (on) => {
    setManualVillage(on);
    setVillageId('');
    if (on) setF(p => ({ ...p, village: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setVillageCreateError('');

    const payload = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''));
    // Always include FK ids so scope-based filtering works
    if (stateId)    payload.state_id    = stateId;
    if (districtId) payload.district_id = districtId;

    if (manualVillage && f.village && districtId) {
      // Create (or fetch existing) village so we always store a village_id
      setVillageCreating(true);
      try {
        const village = await locationsApi.createVillage({ districtId, name: f.village.trim() });
        payload.village_id = village.id;
      } catch (err) {
        setVillageCreateError(err.message ?? 'Failed to save village');
        setVillageCreating(false);
        return;
      }
      setVillageCreating(false);
    } else if (!manualVillage && villageId) {
      payload.village_id = villageId;
    }

    if (location?.lat) {
      payload.latitude             = location.lat;
      payload.longitude            = location.lng;
      payload.location_accuracy_m  = location.accuracy ?? null;
      payload.location_source      = location.source   ?? 'pin_placed';
    } else if (location?.source === 'skipped') {
      payload.location_source = 'skipped';
    }
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {!initial && (
        <Input
          id="malaria_number"
          label="Malaria Number *"
          value={f.malaria_number}
          onChange={set('malaria_number')}
          required
          placeholder="e.g. MH-0042"
        />
      )}

      {/* State — always a dropdown */}
      <Select id="state_select" label="State" value={stateId} onChange={handleStateChange}>
        <option value="">Select state…</option>
        {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>

      {/* District — dropdown, cascades from state */}
      {stateId && (
        <Select id="district_select" label="District" value={districtId} onChange={handleDistrictChange}>
          <option value="">Select district…</option>
          {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
      )}

      {/* Village — dropdown OR free-text depending on toggle */}
      {districtId && (
        <>
          {manualVillage ? (
            <div>
              <Input
                id="village"
                label="Village"
                value={f.village}
                onChange={set('village')}
                placeholder="Type village name"
              />
              <button type="button" className={styles.toggleLink} onClick={() => toggleManualVillage(false)}>
                ← Pick from list instead
              </button>
            </div>
          ) : (
            <div>
              <Select id="village_select" label="Village" value={villageId} onChange={handleVillageChange}>
                <option value="">Select village…</option>
                {villages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
              <button type="button" className={styles.toggleLink} onClick={() => toggleManualVillage(true)}>
                Village not in list? Enter manually
              </button>
            </div>
          )}
        </>
      )}

      <div className={styles.row}>
        <Input id="pincode" label="Pincode" value={f.pincode} onChange={set('pincode')} placeholder="6-digit PIN" pattern="\d{6}" />
      </div>

      <Input id="address_line" label="Address" value={f.address_line} onChange={set('address_line')} placeholder="Street / locality" />

      <div className={styles.field}>
        <label className={styles.label}>Notes</label>
        <textarea className={styles.textarea} value={f.notes} onChange={set('notes')} rows={2} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Location (optional)</label>
        <LocationPicker value={location} onChange={setLocation} />
      </div>

      {villageCreateError && <p className={styles.error}>{villageCreateError}</p>}
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={villageCreating || loading}>{initial ? 'Save changes' : 'Create household'}</Button>
      </div>
    </form>
  );
}

HouseholdForm.propTypes = {
  initial: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onCancel: PropTypes.func.isRequired,
};
