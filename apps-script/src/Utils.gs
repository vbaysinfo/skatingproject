/**
 * Utils.gs — errors, dates (association timezone), validation, sanitising,
 * hashing and pagination helpers shared by every module.
 */

/** Error with a machine code and a user-friendly message. */
function ApiError(code, message, status) {
  this.name = 'ApiError';
  this.code = code;
  this.message = message || 'Something went wrong. Please try again.';
  this.status = status || 400;
}
ApiError.prototype = Object.create(Error.prototype);

function fail(code, message) {
  throw new ApiError(code, message);
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/* Dates — every lifecycle decision uses the association timezone.     */
/* ------------------------------------------------------------------ */

let _tzMemo = null;
function getTimezone() {
  if (_tzMemo) return _tzMemo;
  let tz = '';
  try { tz = getSettingValue('TIMEZONE', ''); } catch (e) { tz = ''; }
  _tzMemo = tz || DEFAULT_TIMEZONE;
  return _tzMemo;
}

function formatInTz(date, pattern) {
  return Utilities.formatDate(date, getTimezone(), pattern);
}

/** Today's date as yyyy-MM-dd in the association timezone. */
function todayKey() {
  return formatInTz(new Date(), 'yyyy-MM-dd');
}

/** Current local time as yyyy-MM-dd HH:mm in the association timezone. */
function nowLocalKey() {
  return formatInTz(new Date(), 'yyyy-MM-dd HH:mm');
}

/** ISO timestamp with offset, e.g. 2026-10-24T10:30:00+05:30 */
function nowIso() {
  return formatInTz(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX");
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

function pad2(n) { return (n < 10 ? '0' : '') + n; }

function validYmd(y, m, d) {
  if (!(y > 1900 && y < 3000 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return '';
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return '';
  return y + '-' + pad2(m) + '-' + pad2(d);
}

/**
 * Normalises a date cell/string into yyyy-MM-dd. Accepts Date objects,
 * 2026-10-24, 2026-10-24T10:00, 24-Oct-2026, 24 Oct 2026, 24/10/2026, 24-10-2026.
 */
function toDateKey(value) {
  if (value === null || value === undefined || value === '') return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (isNaN(value.getTime())) return '';
    return formatInTz(value, 'yyyy-MM-dd');
  }
  const s = String(value).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return validYmd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[\s\-\/\.]([A-Za-z]{3,9})[\s\-\/\.,]+(\d{4})/);
  if (m) {
    const mon = MONTHS[m[2].toLowerCase().slice(0, 3)];
    return mon ? validYmd(+m[3], mon, +m[1]) : '';
  }
  m = s.match(/^(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{4})/);
  if (m) return validYmd(+m[3], +m[2], +m[1]);
  return '';
}

/**
 * Normalises a date-time into 'yyyy-MM-dd HH:mm'. A bare date becomes the
 * start (00:00) or end (23:59) of that day depending on `endOfDay`.
 */
function toDateTimeKey(value, endOfDay) {
  if (value === null || value === undefined || value === '') return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (isNaN(value.getTime())) return '';
    const local = formatInTz(value, 'yyyy-MM-dd HH:mm');
    if (/ 00:00$/.test(local) && endOfDay) return local.slice(0, 10) + ' 23:59';
    return local;
  }
  const s = String(value).trim();
  const date = toDateKey(s);
  if (!date) return '';
  const t = s.match(/[T\s](\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
  if (t) {
    let h = +t[1];
    if (t[3]) {
      const pm = t[3].toLowerCase() === 'pm';
      if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12;
    }
    return date + ' ' + pad2(h) + ':' + t[2];
  }
  return date + (endOfDay ? ' 23:59' : ' 00:00');
}

function dateKeyToUtc(key) {
  const p = key.split('-');
  return Date.UTC(+p[0], +p[1] - 1, +p[2]);
}

/** Whole days from dateKey a to dateKey b (b - a). */
function daysBetween(a, b) {
  return Math.round((dateKeyToUtc(b) - dateKeyToUtc(a)) / 86400000);
}

function addDays(key, n) {
  const d = new Date(dateKeyToUtc(key) + n * 86400000);
  return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
}

function addMonths(key, n) {
  const p = key.split('-').map(Number);
  let y = p[0], m = p[1] - 1 + n;
  y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const d = Math.min(p[2], last);
  return y + '-' + pad2(m + 1) + '-' + pad2(d);
}

/** Age in completed years on a given date key. */
function ageOn(dobKey, onKey) {
  if (!dobKey || !onKey) return null;
  const a = dobKey.split('-').map(Number), b = onKey.split('-').map(Number);
  let age = b[0] - a[0];
  if (b[1] < a[1] || (b[1] === a[1] && b[2] < a[2])) age--;
  return age;
}

function currentYear() { return +todayKey().slice(0, 4); }

/* ------------------------------------------------------------------ */
/* Values                                                              */
/* ------------------------------------------------------------------ */

function toBool(v) {
  if (v === true) return true;
  if (v === false || v === null || v === undefined) return false;
  return ['TRUE', 'YES', 'Y', '1', 'ON'].indexOf(String(v).trim().toUpperCase()) !== -1;
}

function toNumber(v, fallback) {
  if (v === null || v === undefined || v === '') return fallback === undefined ? 0 : fallback;
  const n = Number(String(v).replace(/[,₹\s]/g, ''));
  return isNaN(n) ? (fallback === undefined ? 0 : fallback) : n;
}

function str(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function upper(v) { return str(v).toUpperCase(); }

/** Strips control characters and neutralises spreadsheet formulas. */
function sanitizeCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Object.prototype.toString.call(value) === '[object Date]') return value;
  let s = String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  if (s.length > 20000) s = s.slice(0, 20000);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}

/** Reverses the apostrophe guard when a value is read back. */
function unsanitizeCell(value) {
  if (typeof value === 'string' && /^'[=+\-@\t\r]/.test(value)) return value.slice(1);
  return value;
}

function slugify(text) {
  return str(text).toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'item';
}

function splitList(v) {
  if (Array.isArray(v)) return v.map(str).filter(Boolean);
  return str(v).split(/[\n,;|]+/).map(function (s) { return s.trim(); }).filter(Boolean);
}

function parseJsonSafe(s, fallback) {
  if (!s) return fallback;
  if (typeof s === 'object') return s;
  try { return JSON.parse(s); } catch (e) { return fallback; }
}

function pick(obj, keys) {
  const out = {};
  keys.forEach(function (k) { if (obj[k] !== undefined) out[k] = obj[k]; });
  return out;
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@<>()]+@[^\s@<>()]+\.[A-Za-z]{2,}$/;
const MOBILE_RE = /^\+?[0-9][0-9\s\-]{8,16}$/;

function isEmail(v) { return EMAIL_RE.test(str(v)); }
function isMobile(v) { return MOBILE_RE.test(str(v)); }

/**
 * Validates `data` against rules: { Field: 'required|email|mobile|date|number|min:0|max:200|in:A,B' }.
 * Throws VALIDATION_ERROR with a readable message listing the first problem.
 */
function validate(data, rules) {
  Object.keys(rules).forEach(function (field) {
    const label = field.replace(/_/g, ' ');
    const parts = rules[field].split('|');
    const value = data[field];
    const empty = value === undefined || value === null || str(value) === '';
    if (parts.indexOf('required') !== -1 && empty) fail('VALIDATION_ERROR', label + ' is required.');
    if (empty) return;
    parts.forEach(function (rule) {
      const r = rule.split(':');
      switch (r[0]) {
        case 'email': if (!isEmail(value)) fail('VALIDATION_ERROR', 'Please enter a valid email address.'); break;
        case 'mobile': if (!isMobile(value)) fail('VALIDATION_ERROR', 'Please enter a valid mobile number.'); break;
        case 'date': if (!toDateKey(value)) fail('VALIDATION_ERROR', label + ' must be a valid date.'); break;
        case 'number': if (isNaN(Number(String(value).replace(/,/g, '')))) fail('VALIDATION_ERROR', label + ' must be a number.'); break;
        case 'min': if (toNumber(value) < Number(r[1])) fail('VALIDATION_ERROR', label + ' must be at least ' + r[1] + '.'); break;
        case 'max': if (str(value).length > Number(r[1])) fail('VALIDATION_ERROR', label + ' is too long.'); break;
        case 'in': if (r[1].split(',').indexOf(upper(value)) === -1) fail('VALIDATION_ERROR', label + ' has an invalid value.'); break;
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* Hashing                                                             */
/* ------------------------------------------------------------------ */

function bytesToHex(bytes) {
  return bytes.map(function (b) { const v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}

function sha256Hex(text) {
  return bytesToHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8));
}

function hmacSha256Hex(data, key) {
  return bytesToHex(Utilities.computeHmacSha256Signature(data, key, Utilities.Charset.UTF_8));
}

function randomToken() {
  return sha256Hex(Utilities.getUuid() + ':' + Utilities.getUuid() + ':' + new Date().getTime() + ':' + Math.random());
}

/** Short human-friendly verification code (no ambiguous characters). */
function randomCode(length) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const hex = randomToken();
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[parseInt(hex.substr(i * 2, 2), 16) % alphabet.length];
  return out;
}

/** PBKDF2-HMAC-SHA256 (single 32-byte block) → hex. */
function pbkdf2Hex(password, saltHex, iterations) {
  const pw = Utilities.newBlob(String(password)).getBytes();
  const salt = Utilities.newBlob(saltHex).getBytes().concat([0, 0, 0, 1]);
  let u = Utilities.computeHmacSha256Signature(salt, pw);
  const t = u.slice();
  for (let i = 1; i < iterations; i++) {
    u = Utilities.computeHmacSha256Signature(u, pw);
    for (let j = 0; j < t.length; j++) t[j] ^= u[j];
  }
  return bytesToHex(t);
}

/** Constant-time string comparison. */
function safeEqual(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/* ------------------------------------------------------------------ */
/* Lists                                                               */
/* ------------------------------------------------------------------ */

function paginate(items, page, pageSize) {
  const size = Math.max(1, Math.min(200, Math.floor(toNumber(pageSize, 25)) || 25));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const p = Math.max(1, Math.min(totalPages, Math.floor(toNumber(page, 1)) || 1));
  return { items: items.slice((p - 1) * size, p * size), page: p, pageSize: size, total: total, totalPages: totalPages };
}

function textMatch(record, fields, q) {
  if (!q) return true;
  const needle = String(q).toLowerCase();
  for (let i = 0; i < fields.length; i++) {
    if (String(record[fields[i]] || '').toLowerCase().indexOf(needle) !== -1) return true;
  }
  return false;
}

function sortBy(items, field, dir) {
  const d = dir === 'desc' ? -1 : 1;
  return items.slice().sort(function (a, b) {
    const x = a[field], y = b[field];
    const nx = Number(x), ny = Number(y);
    if (x !== '' && y !== '' && !isNaN(nx) && !isNaN(ny)) return (nx - ny) * d;
    return String(x || '').localeCompare(String(y || '')) * d;
  });
}

function groupCount(items, keyFn) {
  const out = {};
  items.forEach(function (i) { const k = keyFn(i) || 'Unspecified'; out[k] = (out[k] || 0) + 1; });
  return out;
}

function indexBy(items, field) {
  const out = {};
  items.forEach(function (i) { out[i[field]] = i; });
  return out;
}

function lastNMonths(n) {
  const out = [];
  let key = todayKey().slice(0, 7) + '-01';
  for (let i = 0; i < n; i++) { out.unshift(key.slice(0, 7)); key = addMonths(key, -1); }
  return out;
}
