import { useState } from 'react';
import PropTypes from 'prop-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth.js';
import { referralsApi } from '../../api/referrals.js';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Spinner from '../../components/Spinner.jsx';
import Modal from '../../components/Modal.jsx';
import { fmtDate } from '../../utils/date.js';
import styles from '../form.module.css';

const URGENCY_COLOR = { routine: 'gray', urgent: 'yellow', emergency: 'red' };

export default function ReferralList({ memberId }) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [outcomeTarget, setOutcomeTarget] = useState(null);
  const [outcomeText, setOutcomeText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['referrals', memberId],
    queryFn: () => referralsApi.list(memberId, { limit: 20, offset: 0 }),
    enabled: !!session,
  });

  const outcomeMutation = useMutation({
    mutationFn: ({ referralId, outcome }) =>
      referralsApi.recordOutcome(memberId, referralId, { outcome }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['referrals', memberId] });
      setOutcomeTarget(null);
      setOutcomeText('');
    },
  });

  if (isLoading) return <Spinner center />;
  const items = data?.items ?? [];
  if (items.length === 0) return <p className={styles.listEmpty}>No referrals recorded.</p>;

  return (
    <>
      <div className={styles.listWrap}>
        {items.map((r) => (
          <div key={r.id} className={styles.listItem}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 14 }}>{r.referred_to}</strong>
                <Badge color={URGENCY_COLOR[r.urgency]}>{r.urgency}</Badge>
                {r.outcome && <Badge color="green">Outcome recorded</Badge>}
              </div>
              <div className={styles.listMeta}>
                <span>Referred: {fmtDate(r.referred_at)}</span>
                <span>Reason: {r.reason}</span>
                {r.outcome && <span>Outcome: {r.outcome}</span>}
              </div>
            </div>
            {!r.outcome && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => { setOutcomeTarget(r); setOutcomeText(''); }}
              >
                Record outcome
              </Button>
            )}
          </div>
        ))}
      </div>

      <Modal
        open={!!outcomeTarget}
        onClose={() => setOutcomeTarget(null)}
        title="Record Referral Outcome"
      >
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Outcome</label>
            <textarea
              className={styles.textarea}
              value={outcomeText}
              onChange={(e) => setOutcomeText(e.target.value)}
              rows={3}
              placeholder="Describe what happened at the referral…"
            />
          </div>
          {outcomeMutation.error && <p className={styles.error}>{outcomeMutation.error.message}</p>}
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => setOutcomeTarget(null)}>Cancel</Button>
            <Button
              loading={outcomeMutation.isPending}
              disabled={!outcomeText.trim()}
              onClick={() => outcomeMutation.mutate({ referralId: outcomeTarget.id, outcome: outcomeText.trim() })}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

ReferralList.propTypes = { memberId: PropTypes.string.isRequired };
