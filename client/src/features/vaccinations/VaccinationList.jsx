import { useState } from 'react';
import PropTypes from 'prop-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth.js';
import { useRole } from '../../hooks/useRole.js';
import { vaccinationsApi } from '../../api/vaccinations.js';
import Badge from '../../components/Badge.jsx';
import Spinner from '../../components/Spinner.jsx';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import Input from '../../components/Input.jsx';
import { fmtDate } from '../../utils/date.js';
import styles from '../form.module.css';

function statusColor(s) {
  if (s === 'completed') return 'green';
  if (s === 'pending')   return 'blue';
  if (s === 'missed')    return 'red';
  if (s === 'skipped')   return 'gray';
  return 'gray';
}

function vaccineName(v) {
  return v.vaccine_name || v.vaccine_code || 'Unknown';
}

export default function VaccinationList({ memberId }) {
  const { session } = useAuth();
  const { isDoctor, isGroundStaff } = useRole();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [administerTarget, setAdministerTarget] = useState(null);

  const canAdminister = isDoctor || isGroundStaff;

  const { data, isLoading } = useQuery({
    queryKey: ['vaccinations', memberId],
    queryFn: () => vaccinationsApi.list(memberId, { limit: 100, offset: 0 }),
    enabled: !!session,
  });

  if (isLoading) return <Spinner center />;
  const items = data?.items ?? [];

  return (
    <div>
      <div style={{ padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
        <Button size="sm" onClick={() => setShowAdd(true)}>+ Log Vaccine</Button>
      </div>

      {items.length === 0 ? (
        <p className={styles.listEmpty}>No vaccination records.</p>
      ) : (
        <div className={styles.listWrap}>
          {items.map((v) => (
            <div key={v.id} className={styles.listItem}>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 14 }}>{vaccineName(v)}</strong>
                <div className={styles.listMeta}>
                  {v.administered_date && <span>Given: {fmtDate(v.administered_date)}</span>}
                  {v.next_dose_date    && <span>Next dose: {fmtDate(v.next_dose_date)}</span>}
                  {v.scheduled_date && !v.administered_date && <span>Scheduled: {fmtDate(v.scheduled_date)}</span>}
                  {v.notes && <span>{v.notes}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Badge color={statusColor(v.status)}>{v.status}</Badge>
                {canAdminister && (v.status === 'pending' || v.status === 'missed') && (
                  <Button size="sm" onClick={() => setAdministerTarget(v)}>Mark Done</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log Vaccine">
        <AddVaccineForm
          memberId={memberId}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['vaccinations', memberId] }); setShowAdd(false); }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <Modal open={!!administerTarget} onClose={() => setAdministerTarget(null)} title="Mark Vaccination Done">
        {administerTarget && (
          <AdministerForm
            vaccination={administerTarget}
            onSuccess={() => { qc.invalidateQueries({ queryKey: ['vaccinations', memberId] }); setAdministerTarget(null); }}
            onCancel={() => setAdministerTarget(null)}
          />
        )}
      </Modal>
    </div>
  );
}

VaccinationList.propTypes = { memberId: PropTypes.string.isRequired };

function AdministerForm({ vaccination, onSuccess, onCancel }) {
  const [f, setF] = useState({
    administered_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => vaccinationsApi.administer(vaccination.id, {
      administered_date: f.administered_date,
      notes: f.notes || undefined,
    }),
    onSuccess,
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className={styles.form}>
      <p style={{ fontSize: 14, color: 'var(--color-muted)', marginBottom: 8 }}>
        Vaccine: <strong>{vaccination.vaccine_name || vaccination.vaccine_code}</strong>
      </p>
      <Input
        id="administered_date"
        label="Date Administered *"
        type="date"
        value={f.administered_date}
        onChange={set('administered_date')}
        required
      />
      <div className={styles.field}>
        <label className={styles.label}>Notes (optional)</label>
        <textarea className={styles.textarea} value={f.notes} onChange={set('notes')} rows={2} />
      </div>
      {mutation.error && <p className={styles.error}>{mutation.error.message}</p>}
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={mutation.isPending}>Confirm Done</Button>
      </div>
    </form>
  );
}

AdministerForm.propTypes = {
  vaccination: PropTypes.object.isRequired,
  onSuccess:   PropTypes.func.isRequired,
  onCancel:    PropTypes.func.isRequired,
};

function AddVaccineForm({ memberId, onSuccess, onCancel }) {
  const [f, setF] = useState({
    vaccine_name:      '',
    administered_date: new Date().toISOString().slice(0, 10),
    next_dose_date:    '',
    notes:             '',
  });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        vaccine_name:      f.vaccine_name,
        administered_date: f.administered_date,
      };
      if (f.next_dose_date) payload.next_dose_date = f.next_dose_date;
      if (f.notes)          payload.notes          = f.notes;
      return vaccinationsApi.create(memberId, payload);
    },
    onSuccess,
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
      className={styles.form}
    >
      <Input
        id="vaccine_name"
        label="Vaccine Name *"
        value={f.vaccine_name}
        onChange={set('vaccine_name')}
        required
        placeholder="e.g. BCG, OPV, COVID-19 Dose 1…"
      />
      <Input
        id="administered_date"
        label="Date Administered *"
        type="date"
        value={f.administered_date}
        onChange={set('administered_date')}
        required
      />
      <Input
        id="next_dose_date"
        label="Next Dose Due (optional)"
        type="date"
        value={f.next_dose_date}
        onChange={set('next_dose_date')}
      />
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

AddVaccineForm.propTypes = {
  memberId:  PropTypes.string.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onCancel:  PropTypes.func.isRequired,
};
