import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth.js';
import { useRole } from '../../hooks/useRole.js';
import { pregnanciesApi } from '../../api/pregnancies.js';
import Badge from '../../components/Badge.jsx';
import Spinner from '../../components/Spinner.jsx';
import PregnancyOutcomeActions from './PregnancyOutcomeActions.jsx';
import PregnancyCheckups from './PregnancyCheckups.jsx';
import { fmtDate } from '../../utils/date.js';
import { statusColor } from '../../utils/format.js';
import styles from '../form.module.css';
import outcomeStyles from './pregnancy-outcome.module.css';

const RISK_COLOR = { low: 'green', medium: 'yellow', high: 'red' };

const OUTCOME_LABEL = {
  delivered:  { icon: '👶', text: 'Delivery recorded' },
  miscarried: { icon: '🕊️',  text: 'Miscarriage recorded' },
  terminated: { icon: '📋', text: 'Termination recorded' },
};

export default function PregnancyList({ memberId }) {
  const { session } = useAuth();
  const { isDoctor } = useRole();
  const { data, isLoading } = useQuery({
    queryKey: ['pregnancies', memberId],
    queryFn: () => pregnanciesApi.list(memberId, { limit: 20, offset: 0 }),
    enabled: !!session,
  });

  if (isLoading) return <Spinner center />;
  const items = data?.items ?? [];
  if (items.length === 0) return <p className={styles.listEmpty}>No pregnancy records.</p>;

  return (
    <div className={styles.listWrap}>
      {items.map((p) => {
        const outcome = OUTCOME_LABEL[p.status];
        return (
          <div key={p.id} className={styles.listItem}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 14 }}>
                  Pregnancy{p.trimester && p.status === 'active' ? ` — Trimester ${p.trimester}` : ''}
                </strong>
                <Badge color={statusColor(p.status)}>{p.status}</Badge>
                <Badge color={RISK_COLOR[p.risk_level] ?? 'gray'}>{p.risk_level} risk</Badge>
              </div>

              <div className={styles.listMeta}>
                {p.lmp_date             && <span>LMP: {fmtDate(p.lmp_date)}</span>}
                {p.expected_due_date    && <span>EDD (ref): {fmtDate(p.expected_due_date)}</span>}
                {p.actual_delivery_date && <span>Event date: {fmtDate(p.actual_delivery_date)}</span>}
                {p.missed_checkup_count > 0 && (
                  <span style={{ color: 'var(--color-danger)' }}>
                    {p.missed_checkup_count} missed checkup{p.missed_checkup_count !== 1 ? 's' : ''}
                  </span>
                )}
                {p.complications?.length > 0 && (
                  <span>Complications: {p.complications.join(', ')}</span>
                )}
                {p.notes && <span>{p.notes}</span>}
              </div>

              {/* Outcome banner for closed pregnancies */}
              {outcome && (
                <div className={outcomeStyles.outcomeBanner}>
                  <span className={outcomeStyles.outcomeBannerIcon}>{outcome.icon}</span>
                  <span>{outcome.text}{p.actual_delivery_date ? ` on ${fmtDate(p.actual_delivery_date)}` : ''}</span>
                </div>
              )}

              {/* Checkup history + log checkup (doctors only) */}
              {isDoctor && (
                <PregnancyCheckups pregnancyId={p.id} isActive={p.status === 'active'} />
              )}

              {/* Outcome actions — only doctors, only active pregnancies */}
              {isDoctor && (
                <PregnancyOutcomeActions pregnancy={p} memberId={memberId} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

PregnancyList.propTypes = { memberId: PropTypes.string.isRequired };
