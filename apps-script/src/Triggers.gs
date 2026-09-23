/**
 * Triggers.gs — scheduled automation and direct-edit handling.
 *
 * Event UPCOMING/ONGOING/PAST is always computed from dates at request
 * time; these triggers only handle notifications, expiry and housekeeping.
 */

function dailyMaintenance() {
  resetRequestState();
  const out = {};
  const run = function (name, fn) { try { out[name] = fn(); } catch (e) { logError('trigger:' + name, e, null); out[name] = 'error'; } };
  run('memberships', processMembershipExpiry);
  run('reminders', processEventReminders);
  run('pendingPayments', expirePendingRegistrations);
  run('sessions', pruneSessions);
  clearCache();
  console.log(JSON.stringify(out));
  return out;
}

function hourlyMaintenance() {
  resetRequestState();
  try { return expirePendingRegistrations(); } catch (e) { logError('trigger:hourly', e, null); }
}

/** 30-day and 7-day expiry notices; ACTIVE → EXPIRED after expiry. Never renews or charges. */
function processMembershipExpiry() {
  const today = todayKey();
  let expired = 0, notices = 0;
  Db.where('Memberships', function (m) { return upper(m.Status) === 'ACTIVE' && toDateKey(m.Expiry_Date); }).forEach(function (m) {
    const exp = toDateKey(m.Expiry_Date);
    const d = daysBetween(today, exp);
    if (d < 0) {
      Db.update('Memberships', m.Membership_ID, { Status: 'EXPIRED' });
      notifyStudent(m.Student_ID, 'Membership expired', 'Your membership ' + m.Membership_Number + ' expired on ' + formatDisplayDate(exp) + '. Renew to keep your benefits.',
        'MEMBERSHIP_EXPIRED', m.Membership_ID, 'MEMEXP:' + m.Membership_ID + ':' + exp);
      writeAuditLog(null, 'EXPIRE_MEMBERSHIP', 'Membership', m.Membership_ID, { Status: 'ACTIVE' }, { Status: 'EXPIRED' });
      expired++;
    } else if (d <= 7) {
      if (notifyStudent(m.Student_ID, 'Membership expires in ' + (d === 1 ? '1 day' : d + ' days'), 'Your membership ' + m.Membership_Number + ' expires on ' + formatDisplayDate(exp) + '.',
        'MEMBERSHIP_EXPIRING', m.Membership_ID, 'MEM7:' + m.Membership_ID + ':' + exp)) notices++;
    } else if (d <= 30) {
      if (notifyStudent(m.Student_ID, 'Membership expires in 30 days', 'Your membership ' + m.Membership_Number + ' expires on ' + formatDisplayDate(exp) + '.',
        'MEMBERSHIP_EXPIRING', m.Membership_ID, 'MEM30:' + m.Membership_ID + ':' + exp)) notices++;
    }
  });
  if (expired) clearCacheForSheets(['Memberships']);
  return { expired: expired, notices: notices };
}

/** Reminders 7 days and 1 day before an event for confirmed registrations. */
function processEventReminders() {
  const today = todayKey();
  const events = indexBy(Db.where('Events', function (e) { return upper(e.Status) === 'PUBLISHED'; }), 'Event_ID');
  let sent = 0;
  Db.where('Event_Registrations', function (r) { return upper(r.Registration_Status) === 'CONFIRMED' && events[r.Event_ID]; }).forEach(function (r) {
    const ev = events[r.Event_ID];
    const start = toDateKey(ev.Start_Date);
    const d = daysBetween(today, start);
    let key = null, title = null;
    if (d >= 0 && d <= 1) { key = 'REM1:'; title = d === 0 ? 'Your event is today' : 'Your event is tomorrow'; }
    else if (d > 1 && d <= 7) { key = 'REM7:'; title = 'Your event is in ' + d + ' days'; }
    if (!key) return;
    if (notifyStudent(r.Student_ID, title, ev.Event_Name + ' — ' + formatDisplayDate(start) + ', ' + [ev.Venue, ev.City].filter(Boolean).join(', ') +
      '. Registration ' + r.Registration_Number + (r.Bib_Number ? ', bib ' + r.Bib_Number : '') + '.', 'EVENT_REMINDER', r.Registration_ID, key + r.Registration_ID + ':' + start)) sent++;
  });
  return { sent: sent };
}

/** Releases seats held by unpaid registrations after PENDING_PAYMENT_EXPIRY_HOURS. */
function expirePendingRegistrations() {
  const hours = toNumber(getSettingValue('PENDING_PAYMENT_EXPIRY_HOURS', 72), 72);
  if (hours <= 0) return { released: 0 };
  const cutoff = new Date().getTime() - hours * 3600000;
  let released = 0;
  Db.where('Event_Registrations', function (r) {
    return upper(r.Registration_Status) === 'PENDING_PAYMENT' && r.Created_At && new Date(r.Created_At).getTime() < cutoff;
  }).forEach(function (r) {
    const pay = r.Payment_ID ? Db.byId('Payments', r.Payment_ID) : null;
    if (pay && upper(pay.Payment_Status) === 'SUCCESS') return;
    if (pay && str(pay.Transaction_ID)) return; // a manual reference was submitted — wait for admin verification
    Db.update('Event_Registrations', r.Registration_ID, { Registration_Status: 'CANCELLED', Payment_Status: 'CANCELLED', Remarks: 'Released: payment not completed' });
    if (pay) Db.update('Payments', pay.Payment_ID, { Payment_Status: 'CANCELLED' });
    notifyStudent(r.Student_ID, 'Registration released', 'Registration ' + r.Registration_Number + ' was released because payment was not completed in time.',
      'EVENT_REGISTRATION', r.Registration_ID, 'RELEASE:' + r.Registration_ID);
    released++;
  });
  if (released) clearCacheForSheets(['Event_Registrations']);
  return { released: released };
}

/** Keeps the Sessions sheet small by rewriting it without expired/revoked rows. */
function pruneSessions() {
  const t = Db.table('Sessions');
  if (t.rows.length < 1000) return { pruned: 0 };
  return withLock(function () {
    Db.refresh('Sessions');
    const tb = Db.table('Sessions');
    const now = new Date().getTime();
    const keep = tb.rows.filter(function (s) { return s.Status === 'ACTIVE' && new Date(s.Expires_At).getTime() > now; });
    const sh = tb.sheet;
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, tb.headers.length).clearContent();
    if (keep.length) sh.getRange(2, 1, keep.length, tb.headers.length).setValues(keep.map(function (r) { return tb.headers.map(function (h) { return r[h]; }); }));
    Db.refresh('Sessions');
    return { pruned: tb.rows.length - keep.length };
  });
}

/**
 * Installable onEdit trigger for direct spreadsheet edits:
 * fills missing IDs / slugs / Created_At, stamps Updated_At (used for
 * conflict detection) and clears the affected website caches.
 */
function onSheetEdit(e) {
  try {
    resetRequestState();
    const sh = e.range.getSheet();
    const name = sh.getName();
    if (!SCHEMA[name] || ['Audit_Logs', 'Error_Logs', 'Sessions', 'Notifications'].indexOf(name) !== -1) return;
    const firstRow = Math.max(2, e.range.getRow());
    const lastRow = e.range.getLastRow();
    if (lastRow < 2) { clearCacheForSheets([name]); return; }
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    const col = function (h) { return headers.indexOf(h); };
    const pk = PRIMARY_KEY[name];
    const range = sh.getRange(firstRow, 1, lastRow - firstRow + 1, headers.length);
    const values = range.getValues();
    let changed = false;
    withLock(function () {
      values.forEach(function (row) {
        const nonEmpty = row.some(function (v, i) { return i !== col(pk) && str(v) !== ''; });
        if (!nonEmpty) return;
        if (col(pk) !== -1 && !str(row[col(pk)]) && ID_PREFIX[name]) { row[col(pk)] = generateID(name); changed = true; }
        if (col('Slug') !== -1 && !str(row[col('Slug')])) {
          const src = name === 'Events' ? row[col('Event_Name')] : row[col('Program_Name')];
          if (str(src)) { row[col('Slug')] = uniqueSlug(name, src, row[col(pk)]); changed = true; }
        }
        if (name === 'Event_Registrations' && col('Registration_Number') !== -1 && !str(row[col('Registration_Number')])) {
          row[col('Registration_Number')] = row[col(pk)]; changed = true;
        }
        if (col('Created_At') !== -1 && !str(row[col('Created_At')])) { row[col('Created_At')] = nowIso(); changed = true; }
        const editedUpdatedAt = e.range.getNumColumns() === 1 && e.range.getColumn() - 1 === col('Updated_At');
        if (col('Updated_At') !== -1 && !editedUpdatedAt) { row[col('Updated_At')] = nowIso(); changed = true; }
      });
      if (changed) range.setValues(values);
    });
    clearCacheForSheets([name]);
    if (name === 'Events' && (col('Start_Date') === e.range.getColumn() - 1 || col('End_Date') === e.range.getColumn() - 1)) {
      writeAuditLog(null, 'EVENT_DATE_CHANGED_IN_SHEET', 'Event', str(values[0][col(pk)]), { value: e.oldValue }, { value: e.value });
    }
  } catch (err) {
    logError('onSheetEdit', err, null);
  }
}

/** Adds a menu when the script is bound to the database spreadsheet. */
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Skating Association')
      .addItem('Clear website cache', 'clearCache')
      .addItem('Run daily maintenance now', 'dailyMaintenance')
      .addItem('Re-install triggers', 'installTriggers')
      .addItem('Delete sample data', 'deleteSampleData')
      .addToUi();
  } catch (e) { /* not bound to a spreadsheet */ }
}
