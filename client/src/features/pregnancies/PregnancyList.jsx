import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth.js';
import { pregnanciesApi } from '../../api/pregnancies.js';
import Badge from '../../components/Badge.jsx';
import Spinner from '../../components/Spinner.jsx';
import { fmtDate } from '../../utils/date.js';
import { statusColor } from '../../utils/format.js';
import styles from '../form.module.css';

export default function PregnancyList({ memberId }) {
  const { session } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['pregnancies', memberId],
    queryFn: () => pregnanciesApi.list(memberId, { limit: 20, offset: 0 }, session.access_token),
    enabled: !!session,
  });

  if (isLoading) return <Spinner center />;
  const items = data?.items ?? [];
  if (items.length === 0) return <p className={styles.listEmpty}>No pregnancy records.</p>;

  return (
    <div className={styles.listWrap}>
      {items.map((p) => (
        <div key={p.id} className={styles.listItem}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 14 }}>Pregnancy</strong>
              <Badge color={statusColor(p.status)}>{p.status}</Badge>
              <Badge color={statusColor(p.risk_level)}>{p.risk_level} risk</Badge>
            </div>
            <div className={styles.listMeta}>
              {p.lmp_date          && <span>LMP: {fmtDate(p.lmp_date)}</span>}
              {p.expected_due_date && <span>EDD: {fmtDate(p.expected_due_date)}</span>}
              {p.actual_delivery_date && <span>Delivered: {fmtDate(p.actual_delivery_date)}</span>}
              {p.notes && <span>{p.notes}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

PregnancyList.propTypes = { memberId: PropTypes.string.isRequired };
