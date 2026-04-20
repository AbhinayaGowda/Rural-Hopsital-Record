import { format, parseISO, isValid, differenceInYears } from 'date-fns';

export function fmtDate(str) {
  if (!str) return '—';
  try {
    const d = parseISO(str);
    return isValid(d) ? format(d, 'dd MMM yyyy') : '—';
  } catch {
    return '—';
  }
}

export function fmtDateTime(str) {
  if (!str) return '—';
  try {
    const d = parseISO(str);
    return isValid(d) ? format(d, 'dd MMM yyyy, h:mm a') : '—';
  } catch {
    return '—';
  }
}

export function calcAge(dob) {
  if (!dob) return null;
  try {
    const d = parseISO(dob);
    return isValid(d) ? differenceInYears(new Date(), d) : null;
  } catch {
    return null;
  }
}

export function toDateInput(str) {
  if (!str) return '';
  return str.slice(0, 10);
}
