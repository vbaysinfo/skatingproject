/**
 * Core.gs — locking + ID generation, cache, rate limiting, audit logs,
 * error logs and notifications.
 */

/* ------------------------------------------------------------------ */
/* Locking                                                             */
/* ------------------------------------------------------------------ */

let _lockDepth = 0;
/** Runs fn while holding the script lock (re-entrant within one execution). */
function withLock(fn) {
  if (_lockDepth > 0) return fn();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new ApiError('BUSY', 'The system is busy. Please try again in a moment.', 503);
  _lockDepth++;
  try {
    return fn();
  } finally {
    _lockDepth--;
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------------ */
/* IDs — PREFIX-YYYY-000001, sequence per prefix and year              */
/* ------------------------------------------------------------------ */

const ID_SOURCES = {
  MembershipNumber: ['Memberships', 'Membership_Number'],
  CertificateNumber: ['Student_Certifications', 'Certificate_Number'],
};

function pad6(n) { const s = String(n); return s.length >= 6 ? s : ('000000' + s).slice(-6); }

function maxExistingSequence(kind, prefix, year) {
  const src = ID_SOURCES[kind] || [kind, PRIMARY_KEY[kind]];
  let max = 0;
  try {
    Db.refresh(src[0]);
    const re = new RegExp('^' + prefix + '-' + year + '-(\\d+)$');
    Db.all(src[0]).forEach(function (r) {
      const m = String(r[src[1]]).match(re);
      if (m) max = Math.max(max, +m[1]);
    });
  } catch (e) { /* sheet may not exist yet */ }
  return max;
}

/**
 * Generates a unique, sequential ID under the script lock so simultaneous
 * requests never receive the same number. The counter lives in Script
 * Properties and is re-seeded from the sheet if it is ever lost.
 */
function generateID(kind) {
  const prefix = ID_PREFIX[kind];
  if (!prefix) throw new Error('Unknown ID kind ' + kind);
  return withLock(function () {
    const year = currentYear();
    const props = PropertiesService.getScriptProperties();
    const key = 'SEQ_' + prefix + '_' + year;
    let n = Number(props.getProperty(key) || 0);
    if (!n) n = maxExistingSequence(kind, prefix, year);
    n += 1;
    props.setProperty(key, String(n));
    return prefix + '-' + year + '-' + pad6(n);
  });
}

/** Lock-free unique ID for high-volume append-only logs. */
function logId(prefix) {
  return prefix + '-' + formatInTz(new Date(), 'yyyyMMddHHmmss') + '-' + randomCode(5);
}

/* ------------------------------------------------------------------ */
/* Cache (CacheService, versioned per tag)                             */
/* ------------------------------------------------------------------ */

const CACHE_TAGS = ['settings', 'home', 'events', 'programs', 'gallery', 'videos', 'plans', 'announcements', 'sponsors', 'results',
  'rankings'];

const AppCache = (function () {
  function store() { return CacheService.getScriptCache(); }

  function version(tag) {
    const c = store();
    let v = c.get('ver:' + tag);
    if (!v) { v = randomCode(6); c.put('ver:' + tag, v, 21600); }
    return v;
  }

  function fullKey(tag, key) { return 'c:' + tag + ':' + version(tag) + ':' + key; }

  function get(tag, key) {
    const c = store();
    const k = fullKey(tag, key);
    const head = c.get(k);
    if (!head) return null;
    if (head.indexOf('__chunks:') === 0) {
      const n = +head.slice(9);
      const keys = [];
      for (let i = 0; i < n; i++) keys.push(k + ':' + i);
      const parts = c.getAll(keys);
      let s = '';
      for (let i = 0; i < n; i++) { if (parts[keys[i]] === undefined || parts[keys[i]] === null) return null; s += parts[keys[i]]; }
      return JSON.parse(s);
    }
    return JSON.parse(head);
  }

  function put(tag, key, value, ttl) {
    const c = store();
    const k = fullKey(tag, key);
    const s = JSON.stringify(value);
    const seconds = Math.max(1, Math.min(21600, Math.floor(ttl || 300)));
    try {
      if (s.length < 90000) { c.put(k, s, seconds); return; }
      const chunk = 90000, map = {};
      const n = Math.ceil(s.length / chunk);
      if (n > 50) return; // too large to cache sensibly
      for (let i = 0; i < n; i++) map[k + ':' + i] = s.substr(i * chunk, chunk);
      c.putAll(map, seconds);
      c.put(k, '__chunks:' + n, seconds);
    } catch (e) {
      console.warn('Cache put failed: ' + e);
    }
  }

  function clear(tags) {
    const c = store();
    (tags || CACHE_TAGS).forEach(function (t) { c.put('ver:' + t, randomCode(6), 21600); });
  }

  return { get: get, put: put, clear: clear };
})();

function cacheSeconds() {
  return Math.max(10, Math.min(21600, toNumber(getSettingValue('CACHE_SECONDS', 300), 300)));
}

/** Returns a cached value or computes and caches it. */
function cached(tag, key, fn) {
  const hit = AppCache.get(tag, key);
  if (hit !== null && hit !== undefined) return hit;
  const value = fn();
  AppCache.put(tag, key, value, cacheSeconds());
  return value;
}

/** Clears the caches affected by a change to the given sheets. */
function clearCacheForSheets(sheetNames) {
  const tags = {};
  sheetNames.forEach(function (s) { (SHEET_CACHE_TAGS[s] || []).forEach(function (t) { tags[t] = true; }); });
  const list = Object.keys(tags);
  if (list.length) AppCache.clear(list);
  if (sheetNames.indexOf('Settings') !== -1) resetSettingsMemo();
}

/** Clears all website caches. */
function clearCache() {
  AppCache.clear();
  resetSettingsMemo();
  return { cleared: true, at: nowIso() };
}

/* ------------------------------------------------------------------ */
/* Rate limiting                                                       */
/* ------------------------------------------------------------------ */

function rateLimit(bucket, limit, windowSeconds) {
  const c = CacheService.getScriptCache();
  const win = Math.floor(new Date().getTime() / 1000 / windowSeconds);
  const key = 'rl:' + sha256Hex(bucket).slice(0, 32) + ':' + win;
  const n = Number(c.get(key) || 0);
  if (n >= limit) throw new ApiError('RATE_LIMITED', 'Too many requests. Please wait a few minutes and try again.', 429);
  c.put(key, String(n + 1), windowSeconds + 5);
}

/* ------------------------------------------------------------------ */
/* Audit + error logs                                                  */
/* ------------------------------------------------------------------ */

const AUDIT_REDACT = ['Password_Hash', 'Password_Salt', 'Password_Iterations', 'Parent_Mobile', 'Address', 'Emergency_Contact_Phone'];

function diffForAudit(oldObj, newObj) {
  const o = {}, n = {};
  const keys = {};
  Object.keys(oldObj || {}).forEach(function (k) { keys[k] = true; });
  Object.keys(newObj || {}).forEach(function (k) { keys[k] = true; });
  Object.keys(keys).forEach(function (k) {
    if (k === 'Updated_At' || k === 'Created_At') return;
    const a = oldObj ? oldObj[k] : undefined, b = newObj ? newObj[k] : undefined;
    if (String(a === undefined ? '' : a) === String(b === undefined ? '' : b)) return;
    const redact = AUDIT_REDACT.indexOf(k) !== -1;
    if (oldObj && a !== undefined) o[k] = redact ? '[redacted]' : a;
    if (newObj && b !== undefined) n[k] = redact ? '[redacted]' : b;
  });
  return { o: o, n: n };
}

function writeAuditLog(ctx, action, entityType, entityId, oldObj, newObj) {
  try {
    const d = diffForAudit(oldObj, newObj);
    const clip = function (x) { const s = JSON.stringify(x); return s === '{}' ? '' : s.slice(0, 5000); };
    Db.insert('Audit_Logs', {
      Log_ID: logId('LOG'),
      User_ID: ctx && ctx.user ? ctx.user.User_ID : 'SYSTEM',
      Role: ctx && ctx.user ? ctx.user.Role : 'SYSTEM',
      Action: action,
      Entity_Type: entityType,
      Entity_ID: entityId || '',
      Old_Value: clip(d.o),
      New_Value: clip(d.n),
      Timestamp: nowIso(),
      IP_or_Context: ctx ? str(ctx.context).slice(0, 200) : 'trigger',
    });
  } catch (e) {
    console.error('Audit log failed: ' + e);
  }
}

function logError(action, err, ctx) {
  try {
    console.error(action + ': ' + (err && err.stack ? err.stack : err));
    Db.insert('Error_Logs', {
      Error_ID: logId('ERR'),
      Action: action || '',
      Code: err && err.code ? err.code : 'INTERNAL',
      Message: String(err && err.message ? err.message : err).slice(0, 1000),
      Stack: String(err && err.stack ? err.stack : '').slice(0, 3000),
      User_ID: ctx && ctx.user ? ctx.user.User_ID : '',
      Timestamp: nowIso(),
    });
  } catch (e) {
    console.error('Error log failed: ' + e);
  }
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

/**
 * Creates a notification for a user. When `dedupeKey` is given the same
 * notification is never created twice (safe for daily triggers).
 */
function notifyUser(userId, title, message, type, relatedId, dedupeKey) {
  if (!userId) return null;
  if (dedupeKey && Db.findOne('Notifications', 'Dedupe_Key', dedupeKey)) return null;
  const rec = Db.insert('Notifications', {
    Notification_ID: logId('NTF'),
    User_ID: userId,
    Title: title,
    Message: message,
    Type: type || 'GENERAL',
    Related_ID: relatedId || '',
    Read_Status: 'UNREAD',
    Created_At: nowIso(),
    Dedupe_Key: dedupeKey || '',
  });
  if (toBool(getSettingValue('EMAIL_NOTIFICATIONS', 'FALSE'))) {
    try {
      const user = Db.byId('Users', userId);
      if (user && isEmail(user.Email) && MailApp.getRemainingDailyQuota() > 5) {
        MailApp.sendEmail({
          to: user.Email,
          subject: title + ' — ' + getSettingValue('SITE_NAME', 'Skating Association'),
          body: message + '\n\n' + (siteUrl() ? siteUrl() + '/dashboard/notifications' : ''),
        });
      }
    } catch (e) { console.warn('Email failed: ' + e); }
  }
  return rec;
}

function notifyStudent(studentId, title, message, type, relatedId, dedupeKey) {
  const s = Db.byId('Students', studentId);
  if (!s || !s.User_ID) return null;
  return notifyUser(s.User_ID, title, message, type, relatedId, dedupeKey);
}
