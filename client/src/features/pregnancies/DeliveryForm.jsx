import { useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pregnanciesApi } from '../../api/pregnancies.js';
import Input from '../../components/Input.jsx';
import Select from '../../components/Select.jsx';
import Button from '../../components/Button.jsx';
import styles from '../form.module.css';
import outcomeStyles from './pregnancy-outcome.module.css';

const today = () => new Date().toISOString().slice(0, 10);

export default function DeliveryForm({ pregnancyId, memberId, onSuccess, onCancel }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    date_of_birth:    today(),
    full_name:        '',
    gender:           '',
    relation_to_head: '',
    birth_weight_kg:  '',
    delivery_type:    'normal',
    complications:    '',
  });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        date_of_birth:    f.date_of_birth || undefined,
        delivery_type:    f.delivery_type || undefined,
        relation_to_head: f.relation_to_head,
      };
      if (f.full_name.trim())      payload.full_name       = f.full_name.trim();
      if (f.gender)                payload.gender          = f.gender;
      if (f.birth_weight_kg)       payload.birth_weight_kg = parseFloat(f.birth_weight_kg);
      if (f.complications.trim())  payload.complications   = f.complications.trim();
      return pregnanciesApi.deliver(pregnancyId, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pregnancies', memberId] });
      // The newborn is now a household member — invalidate member lists too.
      qc.invalidateQueries({ queryKey: ['members'] });
      onSuccess();
    },
  });

  const canSubmit = !!f.relation_to_head;

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
      className={styles.form}
    >
      <div className={outcomeStyles.warning}>
        This action is irreversible. It will create a new household member record for the baby,
        seed their birth vaccinations, and seal this pregnancy record.
      </div>

      <div className={styles.row}>
        <Input
          id="date_of_birth"
          label="Date of birth"
          type="date"
          value={f.date_of_birth}
          onChange={set('date_of_birth')}
        />
        <Select
          id="delivery_type"
          label="Delivery type"
          value={f.delivery_type}
          onChange={set('delivery_type')}
        >
          <option value="normal">Normal / vaginal</option>
          <option value="c-section">C-section</option>
          <option value="assisted">Assisted (forceps / vacuum)</option>
        </Select>
      </div>

      <div className={styles.row}>
        <Select
          id="relation_to_head"
          label="Relation to household head *"
          value={f.relation_to_head}
          onChange={set('relation_to_head')}
          required
        >
          <option value="">— select —</option>
          <option value="son">Son</option>
          <option value="daughter">Daughter</option>
          <option value="other">Other</option>
        </Select>
        <Select
          id="gender"
          label="Baby's gender"
          value={f.gender}
          onChange={set('gender')}
        >
          <option value="">— unknown / to confirm —</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
          <option value="O">Other</option>
        </Select>
      </div>

      <div className={styles.row}>
        <Input
          id="full_name"
          label="Baby's name (optional)"
          value={f.full_name}
          onChange={set('full_name')}
          placeholder="Defaults to 'Newborn' if left blank"
        />
        <Input
          id="birth_weight_kg"
          label="Birth weight (kg)"
          type="number"
          step="0.01"
          min="0.5"
          max="10"
          value={f.birth_weight_kg}
          onChange={set('birth_weight_kg')}
          placeholder="e.g. 3.20"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Newborn complications (optional)</label>
        <textarea
          className={styles.textarea}
          value={f.complications}
          onChange={set('complications')}
          rows={2}
          placeholder="Any immediate complications noted at delivery…"
        />
      </div>

      {mutation.error && (
        <p className={styles.error}>{mutation.error.message}</p>
      )}

      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={mutation.isPending} disabled={!canSubmit}>
          Confirm delivery
        </Button>
      </div>
    </form>
  );
}

DeliveryForm.propTypes = {
  pregnancyId: PropTypes.string.isRequired,
  memberId:    PropTypes.string.isRequired,
  onSuccess:   PropTypes.func.isRequired,
  onCancel:    PropTypes.func.isRequired,
};
