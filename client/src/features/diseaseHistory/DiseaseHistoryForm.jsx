import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '../../hooks/useDebounce.js';
import { diseaseHistoryApi } from '../../api/diseaseHistory.js';
import { locationsApi } from '../../api/locations.js';
import Input from '../../components/Input.jsx';
import Select from '../../components/Select.jsx';
import Button from '../../components/Button.jsx';
import styles from '../form.module.css';
import condStyles from './condition-search.module.css';

export default function DiseaseHistoryForm({ memberId, onSuccess, onCancel }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    disease_name: '', condition_id: null,
    diagnosed_on: '', recovered_on: '',
    status: 'active', notes: '',
  });
  const [condQ, setCondQ]     = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const dropRef = useRef(null);
  const dq = useDebounce(condQ, 300);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const { data: suggestions = [] } = useQuery({
    queryKey: ['condition-search', dq],
    queryFn: () => locationsApi.medicalConditions({ q: dq, limit: 8 }),
    enabled: dq.length >= 2,
  });

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectCondition = (c) => {
    setF(p => ({ ...p, disease_name: c.name, condition_id: c.id }));
    setCondQ(c.name);
    setShowDrop(false);
  };

  const mutation = useMutation({
    mutationFn: (data) => diseaseHistoryApi.create(memberId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['disease-history', memberId] }); onSuccess(); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { disease_name: f.disease_name, status: f.status };
    if (f.condition_id)  payload.condition_id  = f.condition_id;
    if (f.diagnosed_on)  payload.diagnosed_on  = f.diagnosed_on;
    if (f.recovered_on)  payload.recovered_on  = f.recovered_on;
    if (f.notes)         payload.notes         = f.notes;
    mutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>

      {/* Condition autocomplete */}
      <div className={condStyles.wrap} ref={dropRef}>
        <Input
          id="cond_search"
          label="Disease / Condition *"
          value={condQ}
          onChange={e => {
            setCondQ(e.target.value);
            setF(p => ({ ...p, disease_name: e.target.value, condition_id: null }));
            setShowDrop(true);
          }}
          onFocus={() => condQ.length >= 2 && setShowDrop(true)}
          required
          placeholder="Type to search ICD-10 conditions…"
          autoComplete="off"
        />
        {showDrop && suggestions.length > 0 && (
          <ul className={condStyles.dropdown}>
            {suggestions.map(c => (
              <li key={c.id} className={condStyles.item} onMouseDown={() => selectCondition(c)}>
                <span className={condStyles.code}>{c.code}</span>
                <span className={condStyles.name}>{c.name}</span>
                {c.is_chronic && <span className={condStyles.tag}>chronic</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

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
