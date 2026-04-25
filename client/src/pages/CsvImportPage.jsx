import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { adminApi } from '../api/admin.js';
import Button from '../components/Button.jsx';
import styles from './page.module.css';

export default function CsvImportPage() {
  const fileRef  = useRef(null);
  const [result, setResult] = useState(null);

  const mutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('file', file);
      return adminApi.importHouseholds(fd);
    },
    onSuccess: (data) => setResult(data),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setResult(null);
    mutation.mutate(file);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Import Households from CSV</h1>
      <p className={styles.meta}>
        CSV must have columns: <code>malaria_number</code> (required), <code>village</code> (required),
        then any of: <code>address_line, district, state, pincode, notes</code>
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
        <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ fontSize: 14 }} />
        <Button type="submit" loading={mutation.isPending}>Import</Button>
      </form>

      {mutation.isError && (
        <p style={{ color: 'var(--color-danger)', marginBottom: 16 }}>{mutation.error?.message}</p>
      )}

      {result && (
        <div>
          <div style={{ display: 'flex', gap: 24, marginBottom: 16, fontSize: 14 }}>
            <span style={{ color: 'var(--color-success)' }}>✓ {result.imported.length} imported</span>
            <span style={{ color: 'var(--color-muted)' }}>⊘ {result.skipped.length} skipped (already exist)</span>
            {result.errors.length > 0 && <span style={{ color: 'var(--color-danger)' }}>✗ {result.errors.length} errors</span>}
          </div>

          {result.errors.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>Errors</h3>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Field</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={i}>
                        <td>{e.row}</td>
                        <td><code>{e.field}</code></td>
                        <td>{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.imported.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>Imported</h3>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Row</th><th>Malaria Number</th><th>ID</th></tr></thead>
                  <tbody>
                    {result.imported.slice(0, 50).map((r) => (
                      <tr key={r.id}>
                        <td>{r.row}</td>
                        <td>{r.malaria_number}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.imported.length > 50 && <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>… and {result.imported.length - 50} more</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
