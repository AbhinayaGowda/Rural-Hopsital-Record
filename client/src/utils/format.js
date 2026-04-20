export function fmtStatus(s) {
  if (!s) return '—';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function fmtGender(g) {
  return g === 'M' ? 'Male' : g === 'F' ? 'Female' : g === 'O' ? 'Other' : '—';
}

export function fmtRole(r) {
  if (r === 'ground_staff') return 'Ground Staff';
  return r ? r.charAt(0).toUpperCase() + r.slice(1) : '—';
}

export function statusColor(s) {
  const map = {
    active: 'green',
    delivered: 'green',
    completed: 'green',
    recovered: 'green',
    pending: 'yellow',
    follow_up: 'yellow',
    low: 'green',
    medium: 'yellow',
    high: 'red',
    deceased: 'gray',
    migrated: 'gray',
    dissolved: 'gray',
    miscarried: 'gray',
    terminated: 'gray',
    chronic: 'red',
    missed: 'red',
    skipped: 'gray',
  };
  return map[s] ?? 'gray';
}
