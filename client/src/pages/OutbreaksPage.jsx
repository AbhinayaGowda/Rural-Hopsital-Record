import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth.js';
import { adminApi } from '../api/admin.js';
import Badge from '../components/Badge.jsx';
import Spinner from '../components/Spinner.jsx';
import styles from './page.module.css';

function fmtDate(s) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function OutbreaksPage() {
  const { session } = useAuth();
  const [days, setDays] = useState(7);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['outbreaks', days],
    queryFn:  () => adminApi.detectOutbreaks(days),
    enabled:  !!session,
  });

  const clusters = data ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Outbreak Detection</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13 }}>Window:</label>
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => { setDays(d); }}
              style={{
                padding: '4px 12px',
                borderRadius: 4,
                border: '1px solid #e5e7eb',
                background: days === d ? 'var(--color-primary)' : 'white',
                color: days === d ? 'white' : 'var(--color-text)',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>
        Clusters of 3+ members diagnosed with the same condition in the same village within the selected window.
      </p>

      {isLoading && <Spinner center />}

      {!isLoading && clusters.length === 0 && (
        <p style={{ color: 'var(--color-success)', marginTop: 24 }}>No outbreaks detected in the last {days} days.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        {clusters.map((c, i) => (
          <div
            key={i}
            style={{
              background: c.case_count >= 5 ? '#fff1f2' : '#fffbeb',
              border: `1px solid ${c.case_count >= 5 ? '#fca5a5' : '#fbbf24'}`,
              borderRadius: 8,
              padding: '12px 16px',
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
              <strong style={{ fontSize: 15 }}>{c.condition_name}</strong>
              <Badge color={c.case_count >= 5 ? 'red' : 'yellow'}>{c.case_count} cases</Badge>
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>Village: {c.village_name ?? '—'}</span>
              {c.district_name && <span>District: {c.district_name}</span>}
              <span>{fmtDate(c.earliest_case)} — {fmtDate(c.latest_case)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
