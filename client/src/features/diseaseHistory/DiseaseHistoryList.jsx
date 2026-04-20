import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth.js';
import { diseaseHistoryApi } from '../../api/diseaseHistory.js';
import Badge from '../../components/Badge.jsx';
import Spinner from '../../components/Spinner.jsx';
import { fmtDate } from '../../utils/date.js';
import { statusColor } from '../../utils/format.js';
import styles from '../form.module.css';

export default function DiseaseHistoryList({ memberId }) {
  const { session } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['disease-history', memberId],
    queryFn: () => diseaseHistoryApi.list(memberId, { limit: 50, offset: 0 }),
    enabled: !!session,
  });

  if (isLoading) return <Spinner center />;
  const items = data?.items ?? [];
  if (items.length === 0) return <p className={styles.listEmpty}>No conditions recorded.</p>;

  return (
    <div className={styles.listWrap}>
      {items.map((d) => (
        <div key={d.id} className={styles.listItem}>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 14 }}>{d.disease_name}</strong>
            <div className={styles.listMeta}>
              {d.diagnosed_on && <span>Diagnosed: {fmtDate(d.diagnosed_on)}</span>}
              {d.recovered_on && <span>Recovered: {fmtDate(d.recovered_on)}</span>}
              {d.notes && <span>{d.notes}</span>}
            </div>
          </div>
          <Badge color={statusColor(d.status)}>{d.status}</Badge>
        </div>
      ))}
    </div>
  );
}

DiseaseHistoryList.propTypes = { memberId: PropTypes.string.isRequired };
