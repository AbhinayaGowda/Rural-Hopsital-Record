import { useState } from 'react';
import PropTypes from 'prop-types';
import Input from '../../components/Input.jsx';
import Select from '../../components/Select.jsx';
import Button from '../../components/Button.jsx';
import styles from '../form.module.css';

const RELATIONS = ['self','spouse','son','daughter','parent','sibling','other'];

export default function MemberForm({ initial, isFirst, onSubmit, loading, error, onCancel }) {
  const [f, setF] = useState({
    full_name:       initial?.full_name        ?? '',
    gender:          initial?.gender           ?? '',
    date_of_birth:   initial?.date_of_birth    ?? '',
    relation_to_head: initial?.relation_to_head ?? (isFirst ? 'self' : ''),
    is_head:         initial?.is_head          ?? (isFirst ? true : false),
    contact_number:  initial?.contact_number   ?? '',
    aadhaar:         '',
    abha_id:         initial?.abha_id ?? '',
  });

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((p) => ({ ...p, [k]: v }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {};
    if (f.full_name)       payload.full_name       = f.full_name;
    if (f.gender)          payload.gender          = f.gender;
    if (f.date_of_birth)   payload.date_of_birth   = f.date_of_birth;
    if (f.relation_to_head) payload.relation_to_head = f.relation_to_head;
    payload.is_head = f.is_head;
    if (f.contact_number)  payload.contact_number  = f.contact_number;
    if (f.aadhaar)         payload.aadhaar         = f.aadhaar;
    if (f.abha_id)         payload.abha_id         = f.abha_id;
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Input id="full_name" label="Full Name *" value={f.full_name} onChange={set('full_name')} required placeholder="As on government ID" />

      <div className={styles.row}>
        <Select id="gender" label="Gender" value={f.gender} onChange={set('gender')}>
          <option value="">Select…</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
          <option value="O">Other</option>
        </Select>
        <Input id="date_of_birth" label="Date of Birth" type="date" value={f.date_of_birth} onChange={set('date_of_birth')} />
      </div>

      <div className={styles.row}>
        <Select id="relation_to_head" label="Relation to Head *" value={f.relation_to_head} onChange={set('relation_to_head')} required>
          <option value="">Select…</option>
          {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </Select>
        <Input id="contact_number" label="Contact Number" value={f.contact_number} onChange={set('contact_number')} placeholder="10-digit mobile" maxLength={10} pattern="\d{10}" />
      </div>

      <Input id="aadhaar" label="Aadhaar Number" value={f.aadhaar} onChange={set('aadhaar')} placeholder="12-digit number (optional)" maxLength={12} pattern="\d{12}" />
      <Input id="abha_id" label="ABHA ID (optional)" value={f.abha_id} onChange={set('abha_id')} placeholder="Ayushman Bharat Health Account ID" />

      <label className={styles.checkRow}>
        <input type="checkbox" checked={f.is_head} onChange={set('is_head')} />
        <span>This member is the household head</span>
      </label>

      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>{initial ? 'Save changes' : 'Add member'}</Button>
      </div>
    </form>
  );
}

MemberForm.propTypes = {
  initial: PropTypes.object,
  isFirst: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onCancel: PropTypes.func.isRequired,
};
