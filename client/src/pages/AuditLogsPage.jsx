import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth.js';
import { auditLogsApi } from '../api/auditLogs.js';
import Spinner from '../components/Spinner.jsx';
import Button from '../components/Button.jsx';
import { fmtDateTime } from '../utils/date.js';
import styles from './simple-page.module.css';

export default function AuditLogsPage() {
  const { session } = useAuth();
  const [page, setPage] = useState(0);
  const limit = 30;

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => auditLogsApi.list({ limit, offset: page * limit }, session.access_token),
    enabled: !!session,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Audit Logs</h1>
      {isLoading && <Spinner center />}
      {!isLoading && items.length === 0 && <p className={styles.empty}>No audit logs yet.</p>}
      {items.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Time</th><th>Action</th><th>Table</th><th>Actor</th></tr>
            </thead>
            <tbody>
              {items.map((log) => (
                <tr key={log.id}>
                  <td>{fmtDateTime(log.created_at)}</td>
                  <td><code>{log.action}</code></td>
                  <td><code>{log.table_name}</code></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{log.actor_id?.slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</Button>
          <span>Page {page + 1} / {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</Button>
        </div>
      )}
    </div>
  );
}
