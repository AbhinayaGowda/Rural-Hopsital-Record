import { useState } from 'react';
import PropTypes from 'prop-types';
import Input from '../../components/Input.jsx';
import Button from '../../components/Button.jsx';
import styles from '../form.module.css';

export default function HouseholdForm({ initial, onSubmit, loading, error, onCancel }) {
  const [f, setF] = useState({
    malaria_number: initial?.malaria_number ?? '',
    address_line:   initial?.address_line  ?? '',
    village:        initial?.village       ?? '',
    district:       initial?.district      ?? '',
    state:          initial?.state         ?? '',
    pincode:        initial?.pincode       ?? '',
    notes:          initial?.notes         ?? '',
  });

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''));
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {!initial && (
        <Input id="malaria_number" label="Malaria Number *" value={f.malaria_number} onChange={set('malaria_number')} required placeholder="e.g. MH-0042" />
      )}
      <div className={styles.row}>
        <Input id="village"  label="Village"  value={f.village}  onChange={set('village')}  placeholder="Village name" />
        <Input id="district" label="District" value={f.district} onChange={set('district')} placeholder="District" />
      </div>
      <div className={styles.row}>
        <Input id="state"   label="State"   value={f.state}   onChange={set('state')}   placeholder="State" />
        <Input id="pincode" label="Pincode" value={f.pincode} onChange={set('pincode')} placeholder="6-digit PIN" pattern="\d{6}" />
      </div>
      <Input id="address_line" label="Address" value={f.address_line} onChange={set('address_line')} placeholder="Street / locality" />
      <div className={styles.field}>
        <label className={styles.label}>Notes</label>
        <textarea className={styles.textarea} value={f.notes} onChange={set('notes')} rows={2} />
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>{initial ? 'Save changes' : 'Create household'}</Button>
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
