import { useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { referralsApi } from '../../api/referrals.js';
import Input from '../../components/Input.jsx';
import Select from '../../components/Select.jsx';
import Button from '../../components/Button.jsx';
import styles from '../form.module.css';

export default function ReferralForm({ memberId, onSuccess, onCancel }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ referred_to: '', reason: '', urgency: 'routine' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (data) => referralsApi.create(memberId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['referrals', memberId] });
      onSuccess();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(f);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.row}>
        <Input
          id="referred_to"
          label="Referred to (facility / doctor)"
          value={f.referred_to}
          onChange={set('referred_to')}
          required
        />
        <Select id="urgency" label="Urgency" value={f.urgency} onChange={set('urgency')}>
          <option value="routine">Routine</option>
          <option value="urgent">Urgent</option>
          <option value="emergency">Emergency</option>
        </Select>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Reason</label>
        <textarea
          className={styles.textarea}
          value={f.reason}
          onChange={set('reason')}
          rows={3}
          required
          placeholder="Clinical reason for referral…"
        />
      </div>
      {mutation.error && <p className={styles.error}>{mutation.error.message}</p>}
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={mutation.isPending}>Create referral</Button>
      </div>
    </form>
  );
}

ReferralForm.propTypes = {
  memberId: PropTypes.string.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
