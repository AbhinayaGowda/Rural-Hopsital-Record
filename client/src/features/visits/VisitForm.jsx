import { useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth.js';
import { visitsApi } from '../../api/visits.js';
import Input from '../../components/Input.jsx';
import Button from '../../components/Button.jsx';
import styles from '../form.module.css';

export default function VisitForm({ memberId, onSuccess, onCancel }) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({ visit_date: new Date().toISOString().slice(0, 10), symptoms: '', diagnosis: '', prescription: '', notes: '', follow_up_date: '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (data) => visitsApi.create(memberId, data, session.access_token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['visits', memberId] }); onSuccess(); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { visit_date: f.visit_date };
    if (f.symptoms)      payload.symptoms      = f.symptoms;
    if (f.diagnosis)     payload.diagnosis     = f.diagnosis;
    if (f.prescription)  payload.prescription  = f.prescription;
    if (f.notes)         payload.notes         = f.notes;
    if (f.follow_up_date) payload.follow_up_date = f.follow_up_date;
    mutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Input id="visit_date" label="Visit Date *" type="date" value={f.visit_date} onChange={set('visit_date')} required />
      <div className={styles.field}>
        <label className={styles.label}>Symptoms</label>
        <textarea className={styles.textarea} value={f.symptoms} onChange={set('symptoms')} rows={2} placeholder="Chief complaints…" />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Diagnosis</label>
        <textarea className={styles.textarea} value={f.diagnosis} onChange={set('diagnosis')} rows={2} placeholder="Clinical findings…" />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Prescription</label>
        <textarea className={styles.textarea} value={f.prescription} onChange={set('prescription')} rows={2} placeholder="Medications / dosage…" />
      </div>
      <Input id="follow_up_date" label="Follow-up Date" type="date" value={f.follow_up_date} onChange={set('follow_up_date')} />
      <div className={styles.field}>
        <label className={styles.label}>Notes</label>
        <textarea className={styles.textarea} value={f.notes} onChange={set('notes')} rows={2} />
      </div>
      {mutation.error && <p className={styles.error}>{mutation.error.message}</p>}
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={mutation.isPending}>Save visit</Button>
      </div>
    </form>
  );
}

VisitForm.propTypes = {
  memberId: PropTypes.string.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
