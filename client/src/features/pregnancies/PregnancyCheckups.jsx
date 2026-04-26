import { useState } from 'react';
import PropTypes from 'prop-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth.js';
import { pregnanciesApi } from '../../api/pregnancies.js';
import Button from '../../components/Button.jsx';
import Input from '../../components/Input.jsx';
import Spinner from '../../components/Spinner.jsx';
import Modal from '../../components/Modal.jsx';
import { fmtDate } from '../../utils/date.js';
import styles from '../form.module.css';

export default function PregnancyCheckups({ pregnancyId, isActive }) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['checkups', pregnancyId],
    queryFn: () => pregnanciesApi.listCheckups(pregnancyId, { limit: 50, offset: 0 }),
    enabled: !!session && open,
  });

  const items = data?.items ?? [];

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ fontSize: 13, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        {open ? '▾' : '▸'} Checkups {data ? `(${data.total})` : ''}
      </button>

      {open && (
        <div style={{ marginTop: 8, paddingLeft: 8, borderLeft: '2px solid #e5e7eb' }}>
          {isActive && (
            <div style={{ marginBottom: 8 }}>
              <Button size="sm" onClick={() => setShowForm(true)}>+ Log Checkup</Button>
            </div>
          )}

          {isLoading ? <Spinner /> : items.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>No checkups recorded yet.</p>
          ) : (
            items.map((c) => (
              <div key={c.id} style={{ marginBottom: 10, padding: '8px 10px', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                <strong>{fmtDate(c.checkup_date)}</strong>
                {c.week_number && <span style={{ marginLeft: 8, color: 'var(--color-muted)' }}>Week {c.week_number}</span>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 4, color: 'var(--color-muted)' }}>
                  {c.weight_kg      && <span>Weight: {c.weight_kg} kg</span>}
                  {c.bp_systolic    && <span>BP: {c.bp_systolic}/{c.bp_diastolic}</span>}
                  {c.hemoglobin     && <span>Hb: {c.hemoglobin} g/dL</span>}
                  {c.next_checkup_date && <span>Next: {fmtDate(c.next_checkup_date)}</span>}
                  {c.notes          && <span>{c.notes}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Log Pregnancy Checkup" wide>
        <CheckupForm
          pregnancyId={pregnancyId}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['checkups', pregnancyId] });
            setShowForm(false);
            setOpen(true);
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}

PregnancyCheckups.propTypes = {
  pregnancyId: PropTypes.string.isRequired,
  isActive:    PropTypes.bool.isRequired,
};

function CheckupForm({ pregnancyId, onSuccess, onCancel }) {
  const [f, setF] = useState({
    checkup_date:      new Date().toISOString().slice(0, 10),
    week_number:       '',
    weight_kg:         '',
    bp_systolic:       '',
    bp_diastolic:      '',
    hemoglobin:        '',
    notes:             '',
    next_checkup_date: '',
  });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { checkup_date: f.checkup_date };
      if (f.week_number)        payload.week_number        = parseInt(f.week_number, 10);
      if (f.weight_kg)          payload.weight_kg          = parseFloat(f.weight_kg);
      if (f.bp_systolic)        payload.bp_systolic        = parseInt(f.bp_systolic, 10);
      if (f.bp_diastolic)       payload.bp_diastolic       = parseInt(f.bp_diastolic, 10);
      if (f.hemoglobin)         payload.hemoglobin         = parseFloat(f.hemoglobin);
      if (f.notes)              payload.notes              = f.notes;
      if (f.next_checkup_date)  payload.next_checkup_date  = f.next_checkup_date;
      return pregnanciesApi.addCheckup(pregnancyId, payload);
    },
    onSuccess,
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className={styles.form}>
      <div className={styles.row}>
        <Input id="checkup_date" label="Checkup Date *" type="date" value={f.checkup_date} onChange={set('checkup_date')} required />
        <Input id="week_number" label="Week Number" type="number" min="1" max="45" value={f.week_number} onChange={set('week_number')} placeholder="e.g. 12" />
      </div>
      <div className={styles.row}>
        <Input id="weight_kg" label="Weight (kg)" type="number" step="0.1" value={f.weight_kg} onChange={set('weight_kg')} placeholder="e.g. 58.5" />
        <Input id="hemoglobin" label="Haemoglobin (g/dL)" type="number" step="0.1" value={f.hemoglobin} onChange={set('hemoglobin')} placeholder="e.g. 11.2" />
      </div>
      <div className={styles.row}>
        <Input id="bp_systolic" label="BP Systolic (mmHg)" type="number" value={f.bp_systolic} onChange={set('bp_systolic')} placeholder="e.g. 120" />
        <Input id="bp_diastolic" label="BP Diastolic (mmHg)" type="number" value={f.bp_diastolic} onChange={set('bp_diastolic')} placeholder="e.g. 80" />
      </div>
      <Input id="next_checkup_date" label="Next Checkup Date" type="date" value={f.next_checkup_date} onChange={set('next_checkup_date')} />
      <div className={styles.field}>
        <label className={styles.label}>Notes</label>
        <textarea className={styles.textarea} value={f.notes} onChange={set('notes')} rows={2} />
      </div>
      {mutation.error && <p className={styles.error}>{mutation.error.message}</p>}
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={mutation.isPending}>Save Checkup</Button>
      </div>
    </form>
  );
}

CheckupForm.propTypes = {
  pregnancyId: PropTypes.string.isRequired,
  onSuccess:   PropTypes.func.isRequired,
  onCancel:    PropTypes.func.isRequired,
};
