import { useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pregnanciesApi } from '../../api/pregnancies.js';
import Input from '../../components/Input.jsx';
import Button from '../../components/Button.jsx';
import styles from '../form.module.css';
import outcomeStyles from './pregnancy-outcome.module.css';

const today = () => new Date().toISOString().slice(0, 10);

export default function TerminateForm({ pregnancyId, memberId, onSuccess, onCancel }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    status:               'miscarried',
    actual_delivery_date: today(),
    notes:                '',
  });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { status: f.status };
      if (f.actual_delivery_date) payload.actual_delivery_date = f.actual_delivery_date;
      if (f.notes.trim())         payload.notes = f.notes.trim();
      return pregnanciesApi.update(pregnancyId, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pregnancies', memberId] });
      onSuccess();
    },
  });

  const label = f.status === 'miscarried' ? 'Record miscarriage' : 'Record termination';

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
      className={styles.form}
    >
      <div className={outcomeStyles.warning}>
        This action cannot be undone. The pregnancy will be closed and no further outcome actions
        will be available.
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Outcome type *</label>
        <div className={outcomeStyles.outcomeChoices}>
          <label className={outcomeStyles.outcomeChoice}>
            <input
              type="radio"
              name="status"
              value="miscarried"
              checked={f.status === 'miscarried'}
              onChange={set('status')}
            />
            <span>
              <strong>Miscarriage</strong>
              <span className={outcomeStyles.outcomeDesc}>Natural pregnancy loss</span>
            </span>
          </label>
          <label className={outcomeStyles.outcomeChoice}>
            <input
              type="radio"
              name="status"
              value="terminated"
              checked={f.status === 'terminated'}
              onChange={set('status')}
            />
            <span>
              <strong>Termination</strong>
              <span className={outcomeStyles.outcomeDesc}>Elective or medical termination</span>
            </span>
          </label>
        </div>
      </div>

      <Input
        id="actual_delivery_date"
        label="Date of event"
        type="date"
        value={f.actual_delivery_date}
        onChange={set('actual_delivery_date')}
      />

      <div className={styles.field}>
        <label className={styles.label}>Clinical notes (optional)</label>
        <textarea
          className={styles.textarea}
          value={f.notes}
          onChange={set('notes')}
          rows={3}
          placeholder="Reason, circumstances, or follow-up instructions…"
        />
      </div>

      {mutation.error && (
        <p className={styles.error}>{mutation.error.message}</p>
      )}

      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" variant="danger" loading={mutation.isPending}>
          {label}
        </Button>
      </div>
    </form>
  );
}

TerminateForm.propTypes = {
  pregnancyId: PropTypes.string.isRequired,
  memberId:    PropTypes.string.isRequired,
  onSuccess:   PropTypes.func.isRequired,
  onCancel:    PropTypes.func.isRequired,
};
