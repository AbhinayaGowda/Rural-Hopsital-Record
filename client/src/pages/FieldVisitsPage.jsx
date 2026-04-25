import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth.js';
import { fieldVisitsApi } from '../api/fieldVisits.js';
import { locationsApi } from '../api/locations.js';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';
import Select from '../components/Select.jsx';
import Input from '../components/Input.jsx';
import styles from './page.module.css';
import formStyles from '../features/form.module.css';

function fmtDate(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function FieldVisitsPage() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['field-visits'],
    queryFn:  () => fieldVisitsApi.list({ limit: 50, offset: 0 }),
    enabled:  !!session,
  });

  const { data: villages } = useQuery({
    queryKey: ['villages-all'],
    queryFn:  () => locationsApi.villages({ limit: 200 }),
    enabled:  !!session,
  });

  const [f, setF] = useState({ village_id: '', households_updated: 0, members_added: 0, notes: '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (payload) => fieldVisitsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['field-visits'] });
      setShowForm(false);
      setF({ village_id: '', households_updated: 0, members_added: 0, notes: '' });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      village_id:         f.village_id,
      households_updated: parseInt(f.households_updated, 10) || 0,
      members_added:      parseInt(f.members_added, 10) || 0,
      notes:              f.notes || undefined,
    });
  };

  if (isLoading) return <Spinner center />;

  const items = data?.items ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Field Visits</h1>
        <Button onClick={() => setShowForm(true)}>+ Log Visit</Button>
      </div>

      {items.length === 0 && <p style={{ color: 'var(--color-muted)' }}>No field visits logged yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        {items.map((v) => (
          <div key={v.id} style={{ background: 'var(--color-surface)', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 14 }}>{v.villages?.name ?? v.village_id}</strong>
              {v.villages?.districts?.name && <span style={{ color: 'var(--color-muted)', fontSize: 12 }}>{v.villages.districts.name}</span>}
              <Badge color="gray">{fmtDate(v.visited_at)}</Badge>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4, display: 'flex', gap: 16 }}>
              <span>{v.households_updated} households updated</span>
              <span>{v.members_added} members added</span>
              {v.notes && <span>{v.notes}</span>}
            </div>
          </div>
        ))}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Log Field Visit">
        <form onSubmit={handleSubmit} className={formStyles.form}>
          <div className={formStyles.field}>
            <label className={formStyles.label}>Village *</label>
            <Select id="village_id" value={f.village_id} onChange={set('village_id')} required>
              <option value="">Select village…</option>
              {(villages?.items ?? []).map((v) => (
                <option key={v.id} value={v.id}>{v.name}{v.districts?.name ? ` — ${v.districts.name}` : ''}</option>
              ))}
            </Select>
          </div>
          <div className={formStyles.row}>
            <Input id="households_updated" label="Households updated" type="number" min={0} value={f.households_updated} onChange={set('households_updated')} />
            <Input id="members_added" label="Members added" type="number" min={0} value={f.members_added} onChange={set('members_added')} />
          </div>
          <div className={formStyles.field}>
            <label className={formStyles.label}>Notes</label>
            <textarea className={formStyles.textarea} value={f.notes} onChange={set('notes')} rows={2} />
          </div>
          {mutation.isError && <p className={formStyles.error}>{mutation.error?.message}</p>}
          <div className={formStyles.actions}>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending}>Log Visit</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
