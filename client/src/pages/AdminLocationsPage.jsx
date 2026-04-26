import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { locationsApi } from '../api/locations.js';
import { apiFetch } from '../api/client.js';
import Input from '../components/Input.jsx';
import Select from '../components/Select.jsx';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import Spinner from '../components/Spinner.jsx';
import styles from './admin-locations.module.css';

export default function AdminLocationsPage() {
  const qc = useQueryClient();
  const [stateId, setStateId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [newVillageName, setNewVillageName] = useState('');
  const [addMsg, setAddMsg] = useState('');

  const { data: states = [] } = useQuery({
    queryKey: ['states'],
    queryFn: () => locationsApi.states(),
    staleTime: Infinity,
  });

  const { data: districts = [] } = useQuery({
    queryKey: ['districts', stateId],
    queryFn: () => locationsApi.districts(stateId),
    staleTime: Infinity,
    enabled: !!stateId,
  });

  const { data: villages = [], isLoading: vLoading } = useQuery({
    queryKey: ['villages-admin', districtId],
    queryFn: () => locationsApi.villages({ districtId, limit: 200 }),
    staleTime: 30_000,
    enabled: !!districtId,
  });

  const invalidateVillages = () => {
    qc.invalidateQueries({ queryKey: ['villages-admin', districtId] });
    qc.invalidateQueries({ queryKey: ['villages', districtId] });
  };

  const addMut = useMutation({
    mutationFn: () => locationsApi.createVillage({ districtId, name: newVillageName.trim() }),
    onSuccess: () => {
      setNewVillageName('');
      setAddMsg('Village added.');
      invalidateVillages();
      setTimeout(() => setAddMsg(''), 2500);
    },
    onError: (e) => setAddMsg(e.message),
  });

  const verifyMut = useMutation({
    mutationFn: ({ id, verified }) =>
      apiFetch(`/locations/villages/${id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verified }),
      }),
    onSuccess: invalidateVillages,
  });

  const selectedDistrict = districts.find(d => d.id === districtId);

  const verified   = villages.filter(v => v.verified);
  const unverified = villages.filter(v => !v.verified);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Location Management</h1>
      <p className={styles.sub}>Browse and manage villages. Unverified villages were added manually by staff in the field — review and verify them.</p>

      {/* Cascade selects */}
      <div className={styles.filters}>
        <Select value={stateId} onChange={e => { setStateId(e.target.value); setDistrictId(''); }}>
          <option value="">Select state…</option>
          {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        {stateId && (
          <Select value={districtId} onChange={e => setDistrictId(e.target.value)}>
            <option value="">Select district…</option>
            {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        )}
      </div>

      {districtId && (
        <>
          <div className={styles.districtHeader}>
            <h2 className={styles.districtName}>{selectedDistrict?.name}</h2>
            <span className={styles.counts}>
              {verified.length} verified · {unverified.length} unverified
            </span>
          </div>

          {/* Add village form */}
          <div className={styles.addRow}>
            <Input
              placeholder="New village name…"
              value={newVillageName}
              onChange={e => setNewVillageName(e.target.value)}
            />
            <Button
              size="sm"
              disabled={!newVillageName.trim()}
              loading={addMut.isPending}
              onClick={() => addMut.mutate()}
            >
              + Add Village
            </Button>
          </div>
          {addMsg && (
            <p className={addMsg.includes('added') ? styles.success : styles.error}>{addMsg}</p>
          )}

          {vLoading ? <Spinner center /> : (
            <>
              {unverified.length > 0 && (
                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>Unverified (needs review)</h3>
                  <div className={styles.villageList}>
                    {unverified.map(v => (
                      <VillageRow key={v.id} village={v} onVerify={() => verifyMut.mutate({ id: v.id, verified: true })} />
                    ))}
                  </div>
                </section>
              )}

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Verified ({verified.length})</h3>
                <div className={styles.villageList}>
                  {verified.length === 0 && <p className={styles.empty}>No verified villages yet.</p>}
                  {verified.map(v => (
                    <VillageRow key={v.id} village={v} verified />
                  ))}
                </div>
              </section>
            </>
          )}
        </>
      )}

      {!stateId && (
        <p className={styles.hint}>Select a state and district to view and manage villages.</p>
      )}
    </div>
  );
}

function VillageRow({ village, verified, onVerify }) {
  return (
    <div className={styles.villageRow}>
      <span className={styles.villageName}>{village.name}</span>
      {village.pincode && <span className={styles.pincode}>{village.pincode}</span>}
      {verified ? (
        <Badge color="green">Verified</Badge>
      ) : (
        <Button variant="ghost" size="sm" onClick={onVerify}>Verify</Button>
      )}
    </div>
  );
}
