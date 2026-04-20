import { useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth.js';
import { diseaseHistoryApi } from '../../api/diseaseHistory.js';
import Input from '../../components/Input.jsx';
import Select from '../../components/Select.jsx';
import Button from '../../components/Button.jsx';
import styles from '../form.module.css';

export default function DiseaseHistoryForm({ memberId, onSuccess, onCancel }) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({ disease_name: '', diagnosed_on: '', recovered_on: '', status: 'active', notes: '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (data) => diseaseHistoryApi.create(memberId, data, session.access_token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['disease-history', memberId] }); onSuccess(); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { disease_name: f.disease_name, status: f.status };
    if (f.diagnosed_on) payload.diagnosed_on = f.diagnosed_on;
    if (f.recovered_on) payload.recovered_on = f.recovered_on;
    if (f.notes)        payload.notes        = f.notes;
    mutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Input id="disease_name" label="Disease / Condition *" value={f.disease_name} onChange={set('disease_name')} required placeholder="e.g. Malaria, Type-2 Diabetes" />
      <div className={styles.row}>
        <Input id="diagnosed_on" label="Diagnosed On" type="date" value={f.diagnosed_on} onChange={set('diagnosed_on')} />
        <Select id="status" label="Status" value={f.status} onChange={set('status')}>
          <option value="active">Active</option>
          <option value="recovered">Recovered</option>
          <option value="chronic">Chronic</option>
        </Select>
      </div>
      {f.status === 'recovered' && (
        <Input id="recovered_on" label="Recovered On" type="date" value={f.recovered_on} onChange={set('recovered_on')} />
      )}
      <div className={styles.field}>
        <label className={styles.label}>Notes</label>
        <textarea className={styles.textarea} value={f.notes} onChange={set('notes')} rows={2} />
      </div>
      {mutation.error && <p className={styles.error}>{mutation.error.message}</p>}
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={mutation.isPending}>Save</Button>
      </div>
    </form>
  );
}

DiseaseHistoryForm.propTypes = {
  memberId: PropTypes.string.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
