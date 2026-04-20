import { useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth.js';
import { pregnanciesApi } from '../../api/pregnancies.js';
import Input from '../../components/Input.jsx';
import Select from '../../components/Select.jsx';
import Button from '../../components/Button.jsx';
import styles from '../form.module.css';

export default function PregnancyForm({ memberId, onSuccess, onCancel }) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({ lmp_date: '', expected_due_date: '', risk_level: 'low', status: 'active', notes: '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (data) => pregnanciesApi.create(memberId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pregnancies', memberId] }); onSuccess(); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { risk_level: f.risk_level, status: f.status };
    if (f.lmp_date)           payload.lmp_date           = f.lmp_date;
    if (f.expected_due_date)  payload.expected_due_date  = f.expected_due_date;
    if (f.notes)              payload.notes              = f.notes;
    mutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.row}>
        <Input id="lmp_date" label="LMP Date (Last Menstrual Period)" type="date" value={f.lmp_date} onChange={set('lmp_date')} />
        <Input id="expected_due_date" label="Expected Due Date" type="date" value={f.expected_due_date} onChange={set('expected_due_date')} />
      </div>
      <div className={styles.row}>
        <Select id="risk_level" label="Risk Level" value={f.risk_level} onChange={set('risk_level')}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </Select>
        <Select id="status" label="Status" value={f.status} onChange={set('status')}>
          <option value="active">Active</option>
          <option value="delivered">Delivered</option>
          <option value="miscarried">Miscarried</option>
          <option value="terminated">Terminated</option>
        </Select>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Notes</label>
        <textarea className={styles.textarea} value={f.notes} onChange={set('notes')} rows={2} />
      </div>
      {mutation.error && <p className={styles.error}>{mutation.error.message}</p>}
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={mutation.isPending}>Save pregnancy</Button>
      </div>
    </form>
  );
}

PregnancyForm.propTypes = {
  memberId: PropTypes.string.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
