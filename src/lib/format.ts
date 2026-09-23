/**
 * Formatting helpers shared by server and client components.
 * Dates from the API are plain 'yyyy-MM-dd' keys in the association's
 * timezone, so they are formatted without converting through the browser TZ.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function parts(key: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(key || '');
  return m ? [+m[1], +m[2], +m[3]] : null;
}

/** 2026-10-24 → 24 Oct 2026 */
export function formatDate(key: string | null | undefined): string {
  const p = parts(key || '');
  return p ? `${p[2]} ${MONTHS[p[1] - 1]} ${p[0]}` : '';
}

/** 2026-10-24 → 24 Oct */
export function formatDayMonth(key: string): string {
  const p = parts(key);
  return p ? `${p[2]} ${MONTHS[p[1] - 1]}` : '';
}

/** 29 Oct – 1 Nov 2026 */
export function formatDateRange(start: string, end: string): string {
  if (!start) return '';
  if (!end || end === start) return formatDate(start);
  const a = parts(start), b = parts(end);
  if (!a || !b) return formatDate(start);
  if (a[0] === b[0]) return `${formatDayMonth(start)} – ${formatDayMonth(end)} ${b[0]}`;
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** '2026-10-24 17:30' → 24 Oct 2026, 5:30 PM */
export function formatDateTime(value: string): string {
  if (!value) return '';
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/.exec(value);
  if (!m) return formatDate(value);
  return `${formatDate(m[1])}, ${formatTime(`${m[2]}:${m[3]}`)}`;
}

/** 17:30 → 5:30 PM */
export function formatTime(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
  if (!m) return hhmm || '';
  const h = +m[1];
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

/** ISO timestamp → 24 Oct 2026, 10:30 AM in the association timezone. */
export function formatTimestamp(iso: string, timeZone = 'Asia/Kolkata'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-IN', { timeZone, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);
}

export function formatMoney(amount: number | string | null | undefined, currency = 'INR'): string {
  const n = Number(amount || 0);
  if (!n) return 'Free';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString('en-IN')}`;
  }
}

export function formatNumber(n: number | string | null | undefined): string {
  return Number(n || 0).toLocaleString('en-IN');
}

/** Today as yyyy-MM-dd in the association timezone (independent of the browser timezone). */
export function todayInTimezone(timeZone = 'Asia/Kolkata', now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function daysBetween(a: string, b: string): number {
  const pa = parts(a), pb = parts(b);
  if (!pa || !pb) return 0;
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
}

/**
 * Countdown label (spec §83): "4 DAYS LEFT", "1 DAY LEFT", "TODAY", "ONGOING",
 * or null for past/cancelled events.
 */
export function countdownLabel(ev: { startDate: string; endDate: string; lifecycle: string }, timeZone = 'Asia/Kolkata', now = new Date()): string | null {
  if (ev.lifecycle === 'CANCELLED') return null;
  const today = todayInTimezone(timeZone, now);
  const end = ev.endDate || ev.startDate;
  if (!ev.startDate) return null;
  if (today > end) return null;
  if (today === ev.startDate) return 'TODAY';
  if (today > ev.startDate) return 'ONGOING';
  const days = daysBetween(today, ev.startDate);
  return days === 1 ? '1 DAY LEFT' : `${days} DAYS LEFT`;
}

export function ordinal(n: number | null | undefined): string {
  if (!n) return '';
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** SKATING_TRAINING → Skating Training */
export function labelize(value: string | null | undefined): string {
  return String(value || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bJudge\b/, 'Judge');
}

export function initials(name: string): string {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

export function plural(n: number, word: string, pluralWord?: string): string {
  return `${formatNumber(n)} ${n === 1 ? word : pluralWord || word + 's'}`;
}
