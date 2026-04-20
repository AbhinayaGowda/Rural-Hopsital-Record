import { useState } from 'react';
import PropTypes from 'prop-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth.js';
import { vaccinationsApi } from '../../api/vaccinations.js';
import Badge from '../../components/Badge.jsx';
import Spinner from '../../components/Spinner.jsx';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import Input from '../../components/Input.jsx';
import { fmtDate } from '../../utils/date.js';
import { statusColor } from '../../utils/format.js';
import styles from '../form.module.css';

export default function VaccinationList({ memberId }) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState({});
  const [adminDate, setAdminDate] = useState(new Date().toISOString().slice(0, 10));
  const [showBatch, setShowBatch] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['vaccinations', memberId],
    queryFn: () => vaccinationsApi.list(memberId, { limit: 100, offset: 0 }, session.access_token),
    enabled: !!session,
  });

  const batchMutation = useMutation({
    mutationFn: (doses) => vaccinationsApi.batchAdminister(memberId, { doses }, session.access_token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vaccinations', memberId] }); setShowBatch(false); setSelected({}); },
  });

  if (isLoading) return <Spinner center />;
  const items = data?.items ?? [];
  if (items.length === 0) return <p className={styles.listEmpty}>No vaccination records. (Records are created automatically on delivery.)</p>;

  const pending = items.filter((v) => v.status === 'pending');
  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  const handleAdminister = () => {
    const doses = selectedIds.map((vaccination_id) => ({ vaccination_id, administered_date: adminDate }));
    batchMutation.mutate(doses);
  };

  return (
    <div>
      {pending.length > 0 && (
        <div style={{ padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
          <Button size="sm" onClick={() => setShowBatch(true)}>Administer doses…</Button>
        </div>
      )}

      <div className={styles.listWrap}>
        {items.map((v) => (
          <div key={v.id} className={styles.listItem}>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 14 }}>{v.vaccine_code}</strong>
              <div className={styles.listMeta}>
                {v.scheduled_date    && <span>Scheduled: {fmtDate(v.scheduled_date)}</span>}
                {v.administered_date && <span>Given: {fmtDate(v.administered_date)}</span>}
              </div>
            </div>
            <Badge color={statusColor(v.status)}>{v.status}</Badge>
          </div>
        ))}
      </div>

      <Modal open={showBatch} onClose={() => setShowBatch(false)} title="Administer Vaccines" wide>
        <div className={styles.form}>
          <Input id="admin_date" label="Administered Date" type="date" value={adminDate} onChange={(e) => setAdminDate(e.target.value)} />
          <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>Select doses to mark as administered:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map((v) => (
              <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={!!selected[v.id]}
                  onChange={(e) => setSelected((s) => ({ ...s, [v.id]: e.target.checked }))}
                />
                <strong>{v.vaccine_code}</strong>
                <span style={{ color: 'var(--color-muted)', fontSize: 12 }}>Scheduled {fmtDate(v.scheduled_date)}</span>
              </label>
            ))}
          </div>
          {batchMutation.error && <p className={styles.error}>{batchMutation.error.message}</p>}
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => setShowBatch(false)}>Cancel</Button>
            <Button
              onClick={handleAdminister}
              loading={batchMutation.isPending}
              disabled={selectedIds.length === 0}
            >
              Administer {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

VaccinationList.propTypes = { memberId: PropTypes.string.isRequired };
