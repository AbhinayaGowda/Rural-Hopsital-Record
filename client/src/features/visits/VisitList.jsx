import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth.js';
import { visitsApi } from '../../api/visits.js';
import Spinner from '../../components/Spinner.jsx';
import { fmtDate } from '../../utils/date.js';
import styles from '../form.module.css';

export default function VisitList({ memberId }) {
  const { session } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['visits', memberId],
    queryFn: () => visitsApi.list(memberId, { limit: 50, offset: 0 }, session.access_token),
    enabled: !!session,
  });

  if (isLoading) return <Spinner center />;
  const items = data?.items ?? [];
  if (items.length === 0) return <p className={styles.listEmpty}>No visits recorded.</p>;

  return (
    <div className={styles.listWrap}>
      {items.map((v) => (
        <div key={v.id} className={styles.listItem}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>{fmtDate(v.visit_date)}</strong>
            {v.diagnosis && <p style={{ marginTop: 4, fontSize: 14 }}>{v.diagnosis}</p>}
            {v.symptoms  && <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 2 }}>Symptoms: {v.symptoms}</p>}
            {v.prescription && <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 2 }}>Rx: {v.prescription}</p>}
            {v.follow_up_date && <p style={{ fontSize: 13, color: '#d97706', marginTop: 4 }}>Follow-up: {fmtDate(v.follow_up_date)}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

VisitList.propTypes = { memberId: PropTypes.string.isRequired };
