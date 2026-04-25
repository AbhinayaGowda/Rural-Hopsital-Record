import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { apiFetch } from '../api/client.js';
import Badge from '../components/Badge.jsx';
import Spinner from '../components/Spinner.jsx';
import { fmtDate } from '../utils/date.js';
import styles from './page.module.css';

const RISK_COLOR = { low: 'green', medium: 'yellow', high: 'red' };

function fetchMyPregnancies(doctorId) {
  return apiFetch(`/pregnancies?assigned_doctor_id=${doctorId}&status=active&limit=100&offset=0`);
}

export default function MyPregnanciesPage() {
  const { session, profile } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['my-pregnancies', profile?.id],
    queryFn:  () => fetchMyPregnancies(profile.id),
    enabled:  !!session && !!profile?.id,
  });

  if (isLoading) return <Spinner center />;

  const items = (data?.items ?? []).sort((a, b) => {
    const riskOrder = { high: 0, medium: 1, low: 2 };
    const riskDiff = (riskOrder[a.risk_level] ?? 2) - (riskOrder[b.risk_level] ?? 2);
    if (riskDiff !== 0) return riskDiff;
    return (a.expected_due_date ?? '').localeCompare(b.expected_due_date ?? '');
  });

  const riskRowBg = { high: '#fff1f2', medium: '#fffbeb', low: '#f0fdf4' };
  const riskBorder = { high: '#fca5a5', medium: '#fbbf24', low: '#86efac' };

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>My Pregnancies</h1>
      <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>Active pregnancies assigned to you, sorted by risk then due date.</p>

      {items.length === 0 && (
        <p style={{ color: 'var(--color-muted)', marginTop: 24 }}>No active pregnancies assigned to you.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        {items.map((p) => (
          <div
            key={p.id}
            style={{
              background: riskRowBg[p.risk_level] ?? 'var(--color-surface)',
              border:     `1px solid ${riskBorder[p.risk_level] ?? '#e5e7eb'}`,
              borderRadius: 8,
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                <Badge color={RISK_COLOR[p.risk_level] ?? 'gray'}>{p.risk_level} risk</Badge>
                {p.trimester && <Badge color="gray">T{p.trimester}</Badge>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {p.lmp_date          && <span>LMP: {fmtDate(p.lmp_date)}</span>}
                {p.expected_due_date && <span>EDD (ref): {fmtDate(p.expected_due_date)}</span>}
                {p.missed_checkup_count > 0 && (
                  <span style={{ color: 'var(--color-danger)' }}>{p.missed_checkup_count} missed checkup{p.missed_checkup_count !== 1 ? 's' : ''}</span>
                )}
              </div>
              {p.complications?.length > 0 && (
                <p style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>Complications: {p.complications.join(', ')}</p>
              )}
            </div>
            <Link
              to={`/members/${p.member_id}`}
              style={{ fontSize: 13, color: 'var(--color-primary)', textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              View patient →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
