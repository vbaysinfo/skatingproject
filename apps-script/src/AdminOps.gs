/**
 * AdminOps.gs — admin operations with business rules: events, categories,
 * registrations, results, memberships, students and payments.
 */

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

const EVENT_EDITABLE = ['Event_Code', 'Event_Name', 'Slug', 'Event_Type', 'Poster_URL', 'Start_Date', 'End_Date', 'Registration_Start',
  'Registration_Deadline', 'Venue', 'City', 'State', 'Description', 'Rules_URL', 'Entry_Fee', 'Maximum_Participants', 'Organizer', 'Contact',
  'Featured', 'Status', 'Rules_Text', 'Schedule', 'Registration_Override', 'Capacity_Override', 'Allow_Duplicate_Registration',
  'Sponsor_IDs', 'Map_URL'];

function cleanEventData(d, existing) {
  const out = {};
  EVENT_EDITABLE.forEach(function (k) {
    if (d[k] === undefined) return;
    let v = d[k];
    if (typeof v === 'boolean') v = v ? 'TRUE' : 'FALSE';
    out[k] = typeof v === 'string' ? v.trim() : v;
  });
  const merged = Object.assign({}, existing || {}, out);
  validate(merged, { Event_Name: 'required|max:200', Start_Date: 'required|date', End_Date: 'required|date', Entry_Fee: 'number|min:0',
    Maximum_Participants: 'number|min:0', Registration_Start: 'date', Registration_Deadline: 'date' });
  ['Start_Date', 'End_Date'].forEach(function (k) { if (out[k] !== undefined) out[k] = toDateKey(out[k]); });
  ['Registration_Start', 'Registration_Deadline'].forEach(function (k) {
    if (out[k] !== undefined && str(out[k]) !== '') {
      const hasTime = /\d{1,2}:\d{2}/.test(String(out[k]));
      out[k] = hasTime ? toDateTimeKey(out[k], false) : toDateKey(out[k]);
    }
  });
  if (toDateKey(merged.End_Date) < toDateKey(merged.Start_Date)) fail('VALIDATION_ERROR', 'End date cannot be before the start date.');
  if (merged.Registration_Deadline && toDateKey(merged.Registration_Deadline) > toDateKey(merged.End_Date)) {
    fail('VALIDATION_ERROR', 'Registration deadline cannot be after the event ends.');
  }
  if (out.Event_Type !== undefined) {
    out.Event_Type = upper(out.Event_Type) || 'OTHER';
    if (EVENT_TYPES.indexOf(out.Event_Type) === -1) fail('VALIDATION_ERROR', 'Invalid event type.');
  }
  if (out.Status !== undefined) {
    out.Status = upper(out.Status);
    if (['DRAFT', 'PUBLISHED', 'CANCELLED', 'ARCHIVED'].indexOf(out.Status) === -1) fail('VALIDATION_ERROR', 'Invalid status.');
  }
  if (out.Registration_Override !== undefined) {
    out.Registration_Override = upper(out.Registration_Override);
    if (['', 'AUTO', 'OPEN', 'CLOSED'].indexOf(out.Registration_Override) === -1) fail('VALIDATION_ERROR', 'Invalid registration override.');
  }
  ['Entry_Fee', 'Maximum_Participants'].forEach(function (k) { if (out[k] !== undefined && str(out[k]) !== '') out[k] = toNumber(out[k]); });
  return out;
}

function adminEventRow(e, counts, today) {
  const o = Object.assign({}, e);
  o.lifecycle = getEventLifecycleStatus(e, today);
  o.registrationCount = counts.byEvent[e.Event_ID] || 0;
  o.registrationState = getRegistrationState(e, o.registrationCount, o.lifecycle);
  o.posterThumb = driveImageUrl(e.Poster_URL, 400);
  return o;
}

function actionAdminGetEvents(p, ctx) {
  requireAdmin(ctx);
  const today = todayKey();
  const counts = registrationCounts();
  let rows = Db.all('Events').map(function (e) { return adminEventRow(e, counts, today); });
  if (p.status) rows = rows.filter(function (e) { return upper(e.Status) === upper(p.status); });
  else if (!p.includeArchived) rows = rows.filter(function (e) { return upper(e.Status) !== 'ARCHIVED'; });
  if (p.lifecycle) rows = rows.filter(function (e) { return e.lifecycle === upper(p.lifecycle); });
  if (p.type) rows = rows.filter(function (e) { return upper(e.Event_Type) === upper(p.type); });
  if (p.q) rows = rows.filter(function (e) { return textMatch(e, ['Event_Name', 'Event_Code', 'City', 'Venue', 'Event_ID'], p.q); });
  rows.sort(function (a, b) { return String(b.Start_Date).localeCompare(String(a.Start_Date)); });
  if (p.all) return { items: rows };
  return paginate(rows, p.page, p.pageSize || getSettingValue('ADMIN_PAGE_SIZE', 25));
}

function actionAdminGetEvent(p, ctx) {
  requireAdmin(ctx);
  const e = Db.byId('Events', str(p.id));
  if (!e) fail('NOT_FOUND', 'Event not found.');
  const counts = registrationCounts();
  const row = adminEventRow(e, counts, todayKey());
  row.categories = Db.where('Event_Categories', function (c) { return c.Event_ID === e.Event_ID && upper(c.Status) !== 'ARCHIVED'; })
    .map(function (c) { return Object.assign({}, c, { registrationCount: counts.byCategory[c.Category_ID] || 0 }); });
  row.driveFolderUrl = e.Drive_Folder_ID ? 'https://drive.google.com/drive/folders/' + e.Drive_Folder_ID : '';
  return row;
}

function actionAdminCreateEvent(p, ctx) {
  requireAdmin(ctx);
  const data = cleanEventData(p.data || {}, null);
  const ev = withLock(function () {
    const id = generateID('Events');
    const rec = Object.assign({ Status: 'DRAFT', Event_Type: 'OTHER', Featured: 'FALSE', Registration_Override: 'AUTO' }, data, {
      Event_ID: id,
      Event_Code: data.Event_Code || id.replace('EVT-', 'E'),
      Slug: uniqueSlug('Events', data.Slug || data.Event_Name),
    });
    return Db.insert('Events', rec);
  });
  try {
    const folder = ensureEventFolders(ev.Event_ID);
    if (folder) Db.update('Events', ev.Event_ID, { Drive_Folder_ID: folder.getId() });
  } catch (e) { logError('ensureEventFolders', e, ctx); }
  writeAuditLog(ctx, 'CREATE_EVENT', 'Event', ev.Event_ID, null, ev);
  clearCacheForSheets(['Events']);
  return actionAdminGetEvent({ id: ev.Event_ID }, ctx);
}

function registeredStudentIds(eventId) {
  const seen = {};
  Db.where('Event_Registrations', function (r) { return r.Event_ID === eventId && isActiveRegistration(r); })
    .forEach(function (r) { seen[r.Student_ID] = r.Registration_ID; });
  return seen;
}

/** Updates an event. Date changes notify registered students and are audited. */
function actionAdminUpdateEvent(p, ctx) {
  requireAdmin(ctx);
  const before = Db.byId('Events', str(p.id));
  if (!before) fail('NOT_FOUND', 'Event not found.');
  const snapshot = Object.assign({}, before);
  const data = cleanEventData(p.data || {}, snapshot);
  if (data.Slug !== undefined || data.Event_Name !== undefined) {
    data.Slug = uniqueSlug('Events', data.Slug || snapshot.Slug || data.Event_Name, snapshot.Event_ID);
  }
  const updated = Db.update('Events', snapshot.Event_ID, data, { expectedUpdatedAt: p.updatedAt });
  writeAuditLog(ctx, 'UPDATE_EVENT', 'Event', snapshot.Event_ID, snapshot, updated);
  const datesChanged = toDateKey(snapshot.Start_Date) !== toDateKey(updated.Start_Date) || toDateKey(snapshot.End_Date) !== toDateKey(updated.End_Date);
  if (datesChanged) {
    writeAuditLog(ctx, 'EVENT_DATE_CHANGED', 'Event', snapshot.Event_ID, { Start_Date: snapshot.Start_Date, End_Date: snapshot.End_Date },
      { Start_Date: updated.Start_Date, End_Date: updated.End_Date });
    const ids = registeredStudentIds(snapshot.Event_ID);
    const when = formatDisplayDate(toDateKey(updated.Start_Date)) + ' – ' + formatDisplayDate(toDateKey(updated.End_Date));
    Object.keys(ids).forEach(function (sid) {
      notifyStudent(sid, 'Event date changed', updated.Event_Name + ' will now take place on ' + when + '. Your registration remains valid.',
        'EVENT_UPDATE', snapshot.Event_ID, 'DATECHANGE:' + snapshot.Event_ID + ':' + toDateKey(updated.Start_Date) + ':' + ids[sid]);
    });
  }
  clearCacheForSheets(['Events']);
  return actionAdminGetEvent({ id: snapshot.Event_ID }, ctx);
}

function setEventStatus(p, ctx, status, auditAction) {
  requireAdmin(ctx);
  const before = Db.byId('Events', str(p.id));
  if (!before) fail('NOT_FOUND', 'Event not found.');
  const snapshot = Object.assign({}, before);
  const updated = Db.update('Events', snapshot.Event_ID, { Status: status });
  writeAuditLog(ctx, auditAction, 'Event', snapshot.Event_ID, { Status: snapshot.Status }, { Status: status });
  clearCacheForSheets(['Events']);
  return updated;
}

function actionAdminPublishEvent(p, ctx) { setEventStatus(p, ctx, 'PUBLISHED', 'PUBLISH_EVENT'); return actionAdminGetEvent(p, ctx); }
function actionAdminUnpublishEvent(p, ctx) { setEventStatus(p, ctx, 'DRAFT', 'UNPUBLISH_EVENT'); return actionAdminGetEvent(p, ctx); }
function actionAdminArchiveEvent(p, ctx) { setEventStatus(p, ctx, 'ARCHIVED', 'ARCHIVE_EVENT'); return { archived: true }; }

/** Cancels an event: registration closes, students are notified, unpaid payments are cancelled. */
function actionAdminCancelEvent(p, ctx) {
  const ev = setEventStatus(p, ctx, 'CANCELLED', 'CANCEL_EVENT');
  const reason = str(p.reason);
  const policy = getSettingValue('REFUND_POLICY', '');
  Db.where('Event_Registrations', function (r) { return r.Event_ID === ev.Event_ID && isActiveRegistration(r); }).forEach(function (r) {
    notifyStudent(r.Student_ID, 'Event cancelled', ev.Event_Name + ' has been cancelled.' + (reason ? ' Reason: ' + reason + '.' : '') +
      (upper(r.Payment_Status) === 'PAID' ? ' ' + policy : ''), 'EVENT_CANCELLED', ev.Event_ID, 'CANCEL:' + ev.Event_ID + ':' + r.Registration_ID);
    if (r.Payment_ID) {
      const pay = Db.byId('Payments', r.Payment_ID);
      if (pay && upper(pay.Payment_Status) === 'PENDING') Db.update('Payments', pay.Payment_ID, { Payment_Status: 'CANCELLED', Remarks: (pay.Remarks + ' | Event cancelled').slice(0, 300) });
      else if (pay && upper(pay.Payment_Status) === 'SUCCESS') Db.update('Payments', pay.Payment_ID, { Remarks: (pay.Remarks + ' | Event cancelled — refund per policy').slice(0, 300) });
    }
  });
  return actionAdminGetEvent(p, ctx);
}

/** Bulk-creates categories as the product of age groups × genders × races. */
function actionAdminGenerateCategories(p, ctx) {
  requireAdmin(ctx);
  const ev = Db.byId('Events', str(p.eventId));
  if (!ev) fail('NOT_FOUND', 'Event not found.');
  const ages = splitList(p.ageGroups), genders = splitList(p.genders), races = splitList(p.races);
  if (!ages.length && !genders.length && !races.length) fail('VALIDATION_ERROR', 'Add at least one age group, gender or race.');
  const existing = {};
  Db.where('Event_Categories', function (c) { return c.Event_ID === ev.Event_ID; }).forEach(function (c) { existing[c.Category_Name] = true; });
  const recs = [];
  (ages.length ? ages : ['']).forEach(function (a) {
    (genders.length ? genders : ['']).forEach(function (g) {
      (races.length ? races : ['']).forEach(function (r) {
        const name = [a, g, r].filter(Boolean).join(' • ');
        if (existing[name]) return;
        const dist = (String(r).match(/(\d+)\s*m\b/i) || [])[1];
        recs.push({ Event_ID: ev.Event_ID, Category_Name: name, Age_Group: a, Gender: upper(g), Race_Type: r, Distance: dist ? dist + 'm' : '',
          Entry_Fee: str(p.entryFee) === '' ? '' : toNumber(p.entryFee), Maximum_Participants: str(p.maxParticipants) === '' ? '' : toNumber(p.maxParticipants),
          Status: 'ACTIVE' });
      });
    });
  });
  withLock(function () { recs.forEach(function (r) { r.Category_ID = generateID('Event_Categories'); }); Db.insertMany('Event_Categories', recs); });
  writeAuditLog(ctx, 'CREATE_CATEGORIES', 'Event', ev.Event_ID, null, { count: recs.length });
  clearCacheForSheets(['Event_Categories']);
  return { created: recs.length };
}

/* ------------------------------------------------------------------ */
/* Registrations                                                       */
/* ------------------------------------------------------------------ */

function enrichRegistrations(regs) {
  const students = indexBy(Db.all('Students'), 'Student_ID');
  const cats = indexBy(Db.all('Event_Categories'), 'Category_ID');
  const events = indexBy(Db.all('Events'), 'Event_ID');
  return regs.map(function (r) {
    const s = students[r.Student_ID] || {}, c = cats[r.Category_ID] || {}, e = events[r.Event_ID] || {};
    return Object.assign({}, r, {
      Student_Name: s.Full_Name || '', Gender: s.Gender || '', Age: ageOn(toDateKey(s.DOB), toDateKey(e.Start_Date) || todayKey()),
      Academy: s.Academy_Name || '', City: s.City || '', Student_Email: s.Email || '', Parent_Mobile: s.Parent_Mobile || '',
      Category_Name: c.Category_Name || '', Age_Group: c.Age_Group || '', Race_Type: c.Race_Type || '', Event_Name: e.Event_Name || '',
    });
  });
}

function filteredRegistrations(p) {
  let regs = Db.all('Event_Registrations').slice();
  if (p.eventId) regs = regs.filter(function (r) { return r.Event_ID === str(p.eventId); });
  if (p.categoryId) regs = regs.filter(function (r) { return r.Category_ID === str(p.categoryId); });
  if (p.studentId) regs = regs.filter(function (r) { return r.Student_ID === str(p.studentId); });
  if (p.status) regs = regs.filter(function (r) { return upper(r.Registration_Status) === upper(p.status); });
  if (p.paymentStatus) regs = regs.filter(function (r) { return upper(r.Payment_Status) === upper(p.paymentStatus); });
  let rows = enrichRegistrations(regs);
  if (p.q) rows = rows.filter(function (r) { return textMatch(r, ['Registration_Number', 'Student_Name', 'Student_ID', 'Bib_Number', 'Academy', 'Student_Email'], p.q); });
  return sortBy(rows, p.sort || 'Created_At', p.dir || 'desc');
}

function actionAdminGetRegistrations(p, ctx) {
  requireAdmin(ctx);
  const rows = filteredRegistrations(p);
  const page = paginate(rows, p.page, p.pageSize || getSettingValue('ADMIN_PAGE_SIZE', 25));
  page.summary = {
    total: rows.length,
    confirmed: rows.filter(function (r) { return upper(r.Registration_Status) === 'CONFIRMED'; }).length,
    pendingPayment: rows.filter(function (r) { return upper(r.Registration_Status) === 'PENDING_PAYMENT'; }).length,
    cancelled: rows.filter(function (r) { return upper(r.Registration_Status) === 'CANCELLED'; }).length,
  };
  return page;
}

function actionAdminUpdateRegistration(p, ctx) {
  requireAdmin(ctx);
  const r = Db.byId('Event_Registrations', str(p.id));
  if (!r) fail('NOT_FOUND', 'Registration not found.');
  const before = Object.assign({}, r);
  const d = p.data || {};
  const patch = pick(d, ['Bib_Number', 'Heat', 'Lane', 'Remarks', 'Category_ID']);
  if (d.Registration_Status !== undefined) {
    patch.Registration_Status = upper(d.Registration_Status);
    if (['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'WAITLISTED'].indexOf(patch.Registration_Status) === -1) fail('VALIDATION_ERROR', 'Invalid status.');
  }
  if (patch.Bib_Number) {
    const clash = Db.where('Event_Registrations', function (x) {
      return x.Event_ID === r.Event_ID && x.Registration_ID !== r.Registration_ID && str(x.Bib_Number) === str(patch.Bib_Number) && isActiveRegistration(x);
    })[0];
    if (clash) fail('DUPLICATE', 'Bib number ' + patch.Bib_Number + ' is already assigned (' + clash.Registration_Number + ').');
  }
  const updated = Db.update('Event_Registrations', r.Registration_ID, patch, { expectedUpdatedAt: p.updatedAt });
  writeAuditLog(ctx, 'UPDATE_REGISTRATION', 'Registration', r.Registration_ID, before, updated);
  clearCacheForSheets(['Event_Registrations']);
  return enrichRegistrations([updated])[0];
}

/** Assigns sequential bib numbers to confirmed registrations without one. */
function actionAdminAssignBibs(p, ctx) {
  requireAdmin(ctx);
  const eventId = str(p.eventId);
  return withLock(function () {
    Db.refresh('Event_Registrations');
    const regs = Db.where('Event_Registrations', function (r) { return r.Event_ID === eventId && isActiveRegistration(r); });
    let next = Math.max(toNumber(p.startFrom, 101), 1);
    const used = {};
    regs.forEach(function (r) { if (str(r.Bib_Number)) used[str(r.Bib_Number)] = true; });
    let assigned = 0;
    sortBy(regs, 'Category_ID', 'asc').forEach(function (r) {
      if (str(r.Bib_Number) || upper(r.Registration_Status) !== 'CONFIRMED') return;
      while (used[String(next)]) next++;
      Db.update('Event_Registrations', r.Registration_ID, { Bib_Number: String(next) });
      used[String(next)] = true; next++; assigned++;
    });
    writeAuditLog(ctx, 'ASSIGN_BIBS', 'Event', eventId, null, { assigned: assigned });
    return { assigned: assigned };
  });
}

/** Admin registers a student directly (bypasses deadline; can mark as paid). */
function actionAdminCreateRegistration(p, ctx) {
  requireAdmin(ctx);
  const student = Db.byId('Students', str(p.studentId));
  if (!student) fail('VALIDATION_ERROR', 'Unknown student.');
  const ev = Db.byId('Events', str(p.eventId));
  if (!ev) fail('VALIDATION_ERROR', 'Unknown event.');
  const cat = p.categoryId ? Db.byId('Event_Categories', str(p.categoryId)) : null;
  const reg = withLock(function () {
    Db.refresh('Event_Registrations');
    const dup = Db.where('Event_Registrations', function (r) {
      return r.Event_ID === ev.Event_ID && r.Student_ID === student.Student_ID && isActiveRegistration(r) && (!cat || r.Category_ID === cat.Category_ID);
    })[0];
    if (dup && !toBool(ev.Allow_Duplicate_Registration) && !toBool(p.allowDuplicate)) fail('DUPLICATE_REGISTRATION', 'Student is already registered (' + dup.Registration_Number + ').');
    const fee = cat && str(cat.Entry_Fee) !== '' ? toNumber(cat.Entry_Fee) : eventEntryFee(ev, []);
    const id = generateID('Event_Registrations');
    const rec = Db.insert('Event_Registrations', {
      Registration_ID: id, Event_ID: ev.Event_ID, Student_ID: student.Student_ID, Category_ID: cat ? cat.Category_ID : '', Registration_Number: id,
      Registration_Date: todayKey(), Payment_Status: fee > 0 ? 'PENDING' : 'NOT_REQUIRED', Registration_Status: fee > 0 ? 'PENDING_PAYMENT' : 'CONFIRMED',
      Amount: fee, Remarks: 'Added by admin',
    });
    const pay = createPaymentRecord({ type: 'EVENT_REGISTRATION', amount: fee, userId: student.User_ID, studentId: student.Student_ID,
      eventId: ev.Event_ID, registrationId: id, remarks: ev.Event_Name });
    Db.update('Event_Registrations', id, { Payment_ID: pay.Payment_ID });
    return { rec: rec, pay: pay };
  });
  if (toBool(p.markPaid) && upper(reg.pay.Payment_Status) === 'PENDING') {
    markPaymentSuccess(reg.pay.Payment_ID, { transactionId: str(p.transactionId) || 'OFFLINE', gatewayResponseId: 'manual:' + ctx.user.User_ID }, ctx);
  }
  writeAuditLog(ctx, 'CREATE_REGISTRATION', 'Registration', reg.rec.Registration_ID, null, reg.rec);
  clearCacheForSheets(['Event_Registrations']);
  return enrichRegistrations([Db.byId('Event_Registrations', reg.rec.Registration_ID)])[0];
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

/** Points from Ranking_Settings: most specific rule (category/year) wins. */
function pointsFor(position, categoryName, raceType, year, rules) {
  const pos = toNumber(position, 0);
  if (!pos) return 0;
  const candidates = rules.filter(function (r) {
    if (upper(r.Status || 'ACTIVE') !== 'ACTIVE' || toNumber(r.Position) !== pos) return false;
    const c = str(r.Category);
    if (c && c !== str(categoryName) && c !== str(raceType)) return false;
    if (str(r.Year) && str(r.Year) !== str(year)) return false;
    return true;
  });
  candidates.sort(function (a, b) { return ((str(b.Category) ? 2 : 0) + (str(b.Year) ? 1 : 0)) - ((str(a.Category) ? 2 : 0) + (str(a.Year) ? 1 : 0)); });
  return candidates.length ? toNumber(candidates[0].Points) : 0;
}

function actionAdminGetResults(p, ctx) {
  requireAdmin(ctx);
  const eventId = str(p.eventId);
  const ev = Db.byId('Events', eventId);
  if (!ev) fail('NOT_FOUND', 'Event not found.');
  const students = indexBy(Db.all('Students'), 'Student_ID');
  const cats = Db.where('Event_Categories', function (c) { return c.Event_ID === eventId && upper(c.Status) !== 'ARCHIVED'; });
  let results = Db.where('Results', function (r) { return r.Event_ID === eventId; });
  if (p.categoryId) results = results.filter(function (r) { return r.Category_ID === str(p.categoryId); });
  const regs = Db.where('Event_Registrations', function (r) {
    return r.Event_ID === eventId && isActiveRegistration(r) && (!p.categoryId || r.Category_ID === str(p.categoryId));
  });
  return {
    event: { id: ev.Event_ID, name: ev.Event_Name, lifecycle: getEventLifecycleStatus(ev) },
    categories: cats.map(function (c) { return { id: c.Category_ID, name: c.Category_Name }; }),
    results: results.map(function (r) { return Object.assign({}, r, { Student_Name: (students[r.Student_ID] || {}).Full_Name || '' }); })
      .sort(function (a, b) { return (toNumber(a.Position) || 9999) - (toNumber(b.Position) || 9999); }),
    entrants: regs.map(function (r) {
      return { Student_ID: r.Student_ID, Student_Name: (students[r.Student_ID] || {}).Full_Name || '', Bib_Number: r.Bib_Number, Heat: r.Heat,
        Lane: r.Lane, Category_ID: r.Category_ID, Registration_Status: r.Registration_Status };
    }),
  };
}

/**
 * Upserts results in bulk. Points are calculated from Ranking_Settings when
 * left blank. Rows: [{ Result_ID?, Student_ID, Category_ID, Bib_Number, Heat, Lane, Race_Time, Position, Points, Result_Status }]
 */
function actionAdminSaveResults(p, ctx) {
  requireAdmin(ctx);
  const eventId = str(p.eventId);
  const ev = Db.byId('Events', eventId);
  if (!ev) fail('NOT_FOUND', 'Event not found.');
  const year = toDateKey(ev.Start_Date).slice(0, 4);
  const rules = Db.all('Ranking_Settings');
  const cats = indexBy(Db.where('Event_Categories', function (c) { return c.Event_ID === eventId; }), 'Category_ID');
  const rows = (p.rows || []).slice(0, 500);
  const saved = withLock(function () {
    Db.refresh('Results');
    const existing = Db.where('Results', function (r) { return r.Event_ID === eventId; });
    const byKey = {};
    existing.forEach(function (r) { byKey[r.Student_ID + '|' + r.Category_ID] = r; });
    const inserts = [], out = [];
    rows.forEach(function (row) {
      const categoryId = str(row.Category_ID || p.categoryId);
      if (!str(row.Student_ID) || !Db.byId('Students', str(row.Student_ID))) fail('VALIDATION_ERROR', 'Unknown student ' + str(row.Student_ID) + '.');
      if (categoryId && !cats[categoryId]) fail('VALIDATION_ERROR', 'Unknown category for this event.');
      const status = upper(row.Result_Status) || 'FINISHED';
      if (RESULT_STATUSES.indexOf(status) === -1) fail('VALIDATION_ERROR', 'Invalid result status ' + status + '.');
      if (str(row.Race_Time) && !/^[0-9:.]+$/.test(str(row.Race_Time))) fail('VALIDATION_ERROR', 'Race time must look like 1:23.456 or 45.67.');
      const position = status === 'FINISHED' ? str(row.Position) : '';
      const c = cats[categoryId] || {};
      const points = str(row.Points) !== '' ? toNumber(row.Points) : (status === 'FINISHED' ? pointsFor(position, c.Category_Name, c.Race_Type, year, rules) : 0);
      const data = { Event_ID: eventId, Category_ID: categoryId, Student_ID: str(row.Student_ID), Bib_Number: str(row.Bib_Number), Heat: str(row.Heat),
        Lane: str(row.Lane), Race_Time: str(row.Race_Time), Position: position, Points: points, Result_Status: status };
      const current = (row.Result_ID && Db.byId('Results', str(row.Result_ID))) || byKey[data.Student_ID + '|' + categoryId];
      if (current) out.push(Db.update('Results', current.Result_ID, data));
      else { data.Result_ID = generateID('Results'); data.Published = 'FALSE'; inserts.push(data); }
    });
    return out.concat(Db.insertMany('Results', inserts));
  });
  writeAuditLog(ctx, 'SAVE_RESULTS', 'Event', eventId, null, { rows: saved.length });
  clearCacheForSheets(['Results']);
  return { saved: saved.length };
}

function actionAdminCreateResult(p, ctx) { return actionAdminSaveResults({ eventId: p.data && p.data.Event_ID || p.eventId, rows: [p.data || {}] }, ctx); }
function actionAdminUpdateResult(p, ctx) {
  const r = Db.byId('Results', str(p.id));
  if (!r) fail('NOT_FOUND', 'Result not found.');
  return actionAdminSaveResults({ eventId: r.Event_ID, rows: [Object.assign({}, r, p.data || {}, { Result_ID: r.Result_ID })] }, ctx);
}

function actionAdminDeleteResult(p, ctx) {
  requireAdmin(ctx);
  const r = Db.byId('Results', str(p.id));
  if (!r) fail('NOT_FOUND', 'Result not found.');
  const before = Object.assign({}, r);
  Db.remove('Results', r.Result_ID);
  writeAuditLog(ctx, 'DELETE_RESULT', 'Result', before.Result_ID, before, null);
  clearCacheForSheets(['Results']);
  return { deleted: true };
}

/** Publishes (or unpublishes) results; notifies students and creates medal achievements. */
function actionAdminPublishResults(p, ctx) {
  requireAdmin(ctx);
  const ev = Db.byId('Events', str(p.eventId));
  if (!ev) fail('NOT_FOUND', 'Event not found.');
  const publish = !toBool(p.unpublish);
  const rows = Db.where('Results', function (r) { return r.Event_ID === ev.Event_ID && (!p.categoryId || r.Category_ID === str(p.categoryId)); });
  const cats = indexBy(Db.all('Event_Categories'), 'Category_ID');
  const autoAch = toBool(getSettingValue('AUTO_ACHIEVEMENTS', 'TRUE'));
  const existingAch = {};
  Db.where('Achievements', function (a) { return a.Event_ID === ev.Event_ID; }).forEach(function (a) { if (a.Result_ID) existingAch[a.Result_ID] = true; });
  const achInserts = [];
  rows.forEach(function (r) {
    Db.update('Results', r.Result_ID, { Published: publish ? 'TRUE' : 'FALSE' });
    if (!publish) return;
    const c = cats[r.Category_ID] || {};
    const pos = toNumber(r.Position, 0);
    const status = upper(r.Result_Status || 'FINISHED');
    notifyStudent(r.Student_ID, 'Results published', ev.Event_Name + (c.Category_Name ? ' — ' + c.Category_Name : '') + ': ' +
      (status === 'FINISHED' ? (pos ? ordinal(pos) + ' place' : 'Finished') + (r.Race_Time ? ' (' + r.Race_Time + ')' : '') : status),
      'RESULT', r.Result_ID, 'RESULT:' + r.Result_ID);
    if (autoAch && status === 'FINISHED' && pos >= 1 && pos <= 3 && !existingAch[r.Result_ID]) {
      achInserts.push({ Student_ID: r.Student_ID, Event_ID: ev.Event_ID, Result_ID: r.Result_ID, Achievement_Type: 'MEDAL',
        Title: ['Gold', 'Silver', 'Bronze'][pos - 1] + ' Medal — ' + (c.Category_Name || ev.Event_Name), Description: ev.Event_Name,
        Position: pos, Date: toDateKey(ev.End_Date) || todayKey(), Status: 'ACTIVE' });
    }
  });
  if (achInserts.length) withLock(function () { achInserts.forEach(function (a) { a.Achievement_ID = generateID('Achievements'); }); Db.insertMany('Achievements', achInserts); });
  const anyPublished = Db.where('Results', function (r) { return r.Event_ID === ev.Event_ID && toBool(r.Published); }).length > 0;
  Db.update('Events', ev.Event_ID, { Results_Published: anyPublished ? 'TRUE' : 'FALSE' });
  writeAuditLog(ctx, publish ? 'PUBLISH_RESULTS' : 'UNPUBLISH_RESULTS', 'Event', ev.Event_ID, null, { results: rows.length, category: str(p.categoryId) });
  clearCacheForSheets(['Results', 'Events']);
  return { updated: rows.length, achievementsCreated: achInserts.length };
}

/* ------------------------------------------------------------------ */
/* Memberships                                                         */
/* ------------------------------------------------------------------ */

function actionAdminGetMemberships(p, ctx) {
  requireAdmin(ctx);
  const students = indexBy(Db.all('Students'), 'Student_ID');
  const plans = indexBy(Db.all('Membership_Plans'), 'Plan_ID');
  const payments = indexBy(Db.all('Payments'), 'Payment_ID');
  let rows = Db.all('Memberships').map(function (m) {
    const s = students[m.Student_ID] || {}, pl = plans[m.Plan_ID] || {}, pay = payments[m.Payment_ID] || {};
    return Object.assign({}, m, { Student_Name: s.Full_Name || '', Student_Email: s.Email || '', Plan_Name: pl.Plan_Name || '', Plan_Type: pl.Plan_Type || '',
      Fee: toNumber(pl.Fee), Payment_Status: pay.Payment_Status || '', Photo_URL: driveImageUrl(s.Photo_URL, 200) });
  });
  if (p.status) rows = rows.filter(function (m) { return upper(m.Status) === upper(p.status); });
  if (p.planId) rows = rows.filter(function (m) { return m.Plan_ID === str(p.planId); });
  if (p.studentId) rows = rows.filter(function (m) { return m.Student_ID === str(p.studentId); });
  if (p.q) rows = rows.filter(function (m) { return textMatch(m, ['Membership_Number', 'Membership_ID', 'Student_Name', 'Student_ID', 'Student_Email'], p.q); });
  rows = sortBy(rows, 'Created_At', 'desc');
  return paginate(rows, p.page, p.pageSize || getSettingValue('ADMIN_PAGE_SIZE', 25));
}

function actionAdminApproveMembership(p, ctx) {
  requireAdmin(ctx);
  const m = Db.byId('Memberships', str(p.id));
  if (!m) fail('NOT_FOUND', 'Membership not found.');
  if (upper(m.Status) === 'ACTIVE') fail('NOT_ALLOWED', 'Membership is already active.');
  const pay = m.Payment_ID ? Db.byId('Payments', m.Payment_ID) : null;
  if (pay && upper(pay.Payment_Status) !== 'SUCCESS') {
    if (!toBool(p.markPaid) && !toBool(p.force)) fail('PAYMENT_REQUIRED', 'Payment is not complete. Mark it as paid or approve with override.');
    if (toBool(p.markPaid)) markPaymentSuccess(pay.Payment_ID, { transactionId: str(p.transactionId) || 'OFFLINE', gatewayResponseId: 'manual:' + ctx.user.User_ID }, Object.assign({}, ctx));
  }
  const fresh = Db.byId('Memberships', m.Membership_ID);
  const updated = upper(fresh.Status) === 'ACTIVE' ? fresh : activateMembership(fresh, ctx, ctx.user.User_ID);
  return Object.assign({}, updated);
}

function actionAdminRejectMembership(p, ctx) {
  requireAdmin(ctx);
  const m = Db.byId('Memberships', str(p.id));
  if (!m) fail('NOT_FOUND', 'Membership not found.');
  const before = Object.assign({}, m);
  const updated = Db.update('Memberships', m.Membership_ID, { Status: 'CANCELLED', Remarks: 'Rejected: ' + str(p.reason) });
  if (m.Payment_ID) {
    const pay = Db.byId('Payments', m.Payment_ID);
    if (pay && upper(pay.Payment_Status) === 'PENDING') Db.update('Payments', pay.Payment_ID, { Payment_Status: 'CANCELLED' });
  }
  notifyStudent(m.Student_ID, 'Membership application update', 'Your membership application was not approved.' + (str(p.reason) ? ' Reason: ' + str(p.reason) : ''),
    'MEMBERSHIP', m.Membership_ID);
  writeAuditLog(ctx, 'REJECT_MEMBERSHIP', 'Membership', m.Membership_ID, before, updated);
  clearCacheForSheets(['Memberships']);
  return Object.assign({}, updated);
}

function actionAdminSetMembershipStatus(p, ctx) {
  requireAdmin(ctx);
  const m = Db.byId('Memberships', str(p.id));
  if (!m) fail('NOT_FOUND', 'Membership not found.');
  const status = upper(p.status);
  if (['ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED'].indexOf(status) === -1) fail('VALIDATION_ERROR', 'Invalid status.');
  if (status === 'ACTIVE' && !m.Membership_Number) fail('NOT_ALLOWED', 'Approve the membership first.');
  const before = Object.assign({}, m);
  const updated = Db.update('Memberships', m.Membership_ID, { Status: status, Remarks: str(p.reason) || m.Remarks });
  notifyStudent(m.Student_ID, 'Membership ' + status.toLowerCase(), 'Your membership ' + (m.Membership_Number || '') + ' is now ' + status.toLowerCase() + '.',
    'MEMBERSHIP', m.Membership_ID);
  writeAuditLog(ctx, status === 'SUSPENDED' ? 'SUSPEND_MEMBERSHIP' : 'SET_MEMBERSHIP_STATUS', 'Membership', m.Membership_ID, before, updated);
  clearCacheForSheets(['Memberships']);
  return Object.assign({}, updated);
}

/** Extends validity from the later of today or the current expiry. */
function actionAdminRenewMembership(p, ctx) {
  requireAdmin(ctx);
  const m = Db.byId('Memberships', str(p.id));
  if (!m) fail('NOT_FOUND', 'Membership not found.');
  if (!m.Membership_Number) fail('NOT_ALLOWED', 'Approve the membership first.');
  const plan = Db.byId('Membership_Plans', m.Plan_ID) || {};
  const months = Math.max(1, toNumber(p.months, toNumber(plan.Duration_Months, 12)));
  const today = todayKey();
  const from = toDateKey(m.Expiry_Date) && toDateKey(m.Expiry_Date) >= today ? addDays(toDateKey(m.Expiry_Date), 1) : today;
  if (toBool(p.recordPayment)) {
    const pay = createPaymentRecord({ type: 'MEMBERSHIP_RENEWAL', amount: str(p.amount) === '' ? plan.Fee : p.amount, userId: (Db.byId('Students', m.Student_ID) || {}).User_ID,
      studentId: m.Student_ID, remarks: 'Renewal ' + m.Membership_Number });
    if (upper(pay.Payment_Status) === 'PENDING') markPaymentSuccess(pay.Payment_ID, { transactionId: str(p.transactionId) || 'OFFLINE', gatewayResponseId: 'manual:' + ctx.user.User_ID }, ctx);
  }
  const before = Object.assign({}, m);
  const updated = Db.update('Memberships', m.Membership_ID, { Expiry_Date: addDays(addMonths(from, months), -1), Status: 'ACTIVE', Remarks: 'Renewed ' + today });
  notifyStudent(m.Student_ID, 'Membership renewed', 'Your membership ' + m.Membership_Number + ' is valid until ' + formatDisplayDate(toDateKey(updated.Expiry_Date)) + '.',
    'MEMBERSHIP', m.Membership_ID);
  writeAuditLog(ctx, 'RENEW_MEMBERSHIP', 'Membership', m.Membership_ID, before, updated);
  clearCacheForSheets(['Memberships']);
  return Object.assign({}, updated);
}

/** Admin creates a membership for a student (e.g. paid at the office). */
function actionAdminCreateMembership(p, ctx) {
  requireAdmin(ctx);
  const student = Db.byId('Students', str(p.studentId));
  if (!student) fail('VALIDATION_ERROR', 'Unknown student.');
  const plan = Db.byId('Membership_Plans', str(p.planId));
  if (!plan) fail('VALIDATION_ERROR', 'Unknown plan.');
  const m = withLock(function () {
    Db.refresh('Memberships');
    const open = Db.where('Memberships', function (x) { return x.Student_ID === student.Student_ID && ['PENDING', 'ACTIVE'].indexOf(upper(x.Status)) !== -1; });
    if (open.length && !toBool(p.force)) fail('DUPLICATE_MEMBERSHIP', 'Student already has a ' + upper(open[0].Status).toLowerCase() + ' membership.');
    const rec = Db.insert('Memberships', { Membership_ID: generateID('Memberships'), Student_ID: student.Student_ID, Plan_ID: plan.Plan_ID, Status: 'PENDING',
      Remarks: 'Created by admin' });
    const pay = createPaymentRecord({ type: 'MEMBERSHIP', amount: plan.Fee, userId: student.User_ID, studentId: student.Student_ID, membershipId: rec.Membership_ID,
      remarks: plan.Plan_Name });
    Db.update('Memberships', rec.Membership_ID, { Payment_ID: pay.Payment_ID });
    return rec;
  });
  writeAuditLog(ctx, 'CREATE_MEMBERSHIP', 'Membership', m.Membership_ID, null, { Student_ID: student.Student_ID, Plan_ID: plan.Plan_ID });
  if (toBool(p.activate)) return actionAdminApproveMembership({ id: m.Membership_ID, markPaid: p.markPaid, force: true, transactionId: p.transactionId }, ctx);
  return Object.assign({}, Db.byId('Memberships', m.Membership_ID));
}

/* ------------------------------------------------------------------ */
/* Students                                                            */
/* ------------------------------------------------------------------ */

function actionAdminGetStudents(p, ctx) {
  requireAdmin(ctx);
  const memberships = {};
  Db.all('Memberships').forEach(function (m) { if (upper(m.Status) === 'ACTIVE') memberships[m.Student_ID] = m.Membership_Number; });
  let rows = Db.all('Students').map(function (s) {
    return Object.assign({}, s, { Age: ageOn(toDateKey(s.DOB), todayKey()), Membership_Number: memberships[s.Student_ID] || '', Photo_Thumb: driveImageUrl(s.Photo_URL, 120) });
  });
  if (p.status) rows = rows.filter(function (s) { return upper(s.Status) === upper(p.status); });
  if (p.gender) rows = rows.filter(function (s) { return upper(s.Gender) === upper(p.gender); });
  if (p.city) rows = rows.filter(function (s) { return str(s.City).toLowerCase() === str(p.city).toLowerCase(); });
  if (p.academy) rows = rows.filter(function (s) { return str(s.Academy_Name).toLowerCase().indexOf(str(p.academy).toLowerCase()) !== -1; });
  if (p.membership === 'ACTIVE') rows = rows.filter(function (s) { return !!s.Membership_Number; });
  if (p.membership === 'NONE') rows = rows.filter(function (s) { return !s.Membership_Number; });
  if (p.q) rows = rows.filter(function (s) { return textMatch(s, ['Full_Name', 'Student_ID', 'Parent_Mobile', 'Email', 'Academy_Name', 'Membership_Number'], p.q); });
  rows = sortBy(rows, p.sort || 'Created_At', p.dir || 'desc');
  const page = paginate(rows, p.page, p.pageSize || getSettingValue('ADMIN_PAGE_SIZE', 25));
  page.facets = { cities: uniqueSorted(Db.all('Students').map(function (s) { return s.City; })) };
  return page;
}

function actionAdminGetStudent(p, ctx) {
  requireAdmin(ctx);
  const s = Db.byId('Students', str(p.id));
  if (!s) fail('NOT_FOUND', 'Student not found.');
  const user = s.User_ID ? Db.byId('Users', s.User_ID) : null;
  return {
    student: Object.assign(serializeStudentPrivate(s), { adminNotes: s.Admin_Notes, driveFolderUrl: s.Drive_Folder_ID ? 'https://drive.google.com/drive/folders/' + s.Drive_Folder_ID : '' }),
    raw: Object.assign({}, s),
    account: user ? { userId: user.User_ID, email: user.Email, status: user.Status, lastLogin: user.Last_Login, provider: user.Auth_Provider } : null,
    memberships: studentMembershipList(s.Student_ID),
    registrations: studentRegistrationList(s.Student_ID),
    results: studentResultList(s.Student_ID, false),
    certificates: studentCertificateList(s.Student_ID),
    achievements: studentAchievementList(s.Student_ID),
    documents: Db.where('Student_Documents', function (d) { return d.Student_ID === s.Student_ID; }).map(function (d) {
      return Object.assign(serializeDocument(d), { driveUrl: 'https://drive.google.com/file/d/' + d.Drive_File_ID + '/view' });
    }),
    payments: Db.where('Payments', function (x) { return x.Student_ID === s.Student_ID; }).map(serializePayment),
  };
}

function actionAdminCreateStudent(p, ctx) {
  requireAdmin(ctx);
  const data = p.data || {};
  if (data.email || data.Email) {
    const email = str(data.email || data.Email).toLowerCase();
    if (Db.where('Students', function (s) { return str(s.Email).toLowerCase() === email; }).length) fail('DUPLICATE', 'A student with this email already exists.');
  }
  const s = withLock(function () { return createStudentRecord(data, { byAdmin: true }); });
  writeAuditLog(ctx, 'CREATE_STUDENT', 'Student', s.Student_ID, null, s);
  clearCacheForSheets(['Students']);
  return actionAdminGetStudent({ id: s.Student_ID }, ctx);
}

function actionAdminUpdateStudent(p, ctx) {
  requireAdmin(ctx);
  const s = Db.byId('Students', str(p.id));
  if (!s) fail('NOT_FOUND', 'Student not found.');
  const before = Object.assign({}, s);
  const f = studentFieldsFromPayload(p.data || {});
  delete f.Student_ID; delete f.User_ID; delete f.Drive_Folder_ID; delete f.Photo_File_ID;
  if (f.Status !== undefined) f.Status = upper(f.Status);
  validateStudentFields(f, false);
  if (f.Email !== undefined) f.Email = str(f.Email).toLowerCase();
  if (f.First_Name !== undefined || f.Last_Name !== undefined) {
    f.Full_Name = (str(f.First_Name !== undefined ? f.First_Name : s.First_Name) + ' ' + str(f.Last_Name !== undefined ? f.Last_Name : s.Last_Name)).trim();
  }
  const updated = Db.update('Students', s.Student_ID, f, { expectedUpdatedAt: p.updatedAt });
  writeAuditLog(ctx, 'UPDATE_STUDENT', 'Student', s.Student_ID, before, updated);
  clearCacheForSheets(['Students']);
  return actionAdminGetStudent({ id: s.Student_ID }, ctx);
}

/** Approve (ACTIVE), suspend (SUSPENDED) or deactivate (INACTIVE) a student. */
function actionAdminUpdateStudentStatus(p, ctx) {
  requireAdmin(ctx);
  const s = Db.byId('Students', str(p.id));
  if (!s) fail('NOT_FOUND', 'Student not found.');
  const status = upper(p.status);
  if (['PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE'].indexOf(status) === -1) fail('VALIDATION_ERROR', 'Invalid status.');
  const before = Object.assign({}, s);
  const updated = Db.update('Students', s.Student_ID, { Status: status, Admin_Notes: str(p.reason) ? (str(s.Admin_Notes) + '\n' + todayKey() + ': ' + str(p.reason)).trim() : s.Admin_Notes });
  if (status === 'SUSPENDED' && s.User_ID) revokeUserSessions(s.User_ID);
  if (status === 'ACTIVE' && upper(before.Status) === 'PENDING') notifyStudent(s.Student_ID, 'Account approved', 'Your athlete account has been approved.', 'ACCOUNT', s.Student_ID);
  writeAuditLog(ctx, status === 'ACTIVE' ? 'APPROVE_STUDENT' : status === 'SUSPENDED' ? 'SUSPEND_STUDENT' : 'UPDATE_STUDENT_STATUS', 'Student', s.Student_ID, before, updated);
  clearCacheForSheets(['Students']);
  return Object.assign({}, updated);
}

/** Minimal student lookup for pickers (id, name, academy). */
function actionAdminSearchStudents(p, ctx) {
  requireAdmin(ctx);
  const q = str(p.q);
  if (q.length < 2) return [];
  return Db.where('Students', function (s) { return textMatch(s, ['Full_Name', 'Student_ID', 'Email', 'Parent_Mobile'], q); }).slice(0, 20).map(function (s) {
    return { id: s.Student_ID, name: s.Full_Name, academy: s.Academy_Name, city: s.City, gender: s.Gender, dob: toDateKey(s.DOB) };
  });
}

/* ------------------------------------------------------------------ */
/* Payments                                                            */
/* ------------------------------------------------------------------ */

function filteredPayments(p) {
  const students = indexBy(Db.all('Students'), 'Student_ID');
  let rows = Db.all('Payments').map(function (x) { return Object.assign({}, x, { Student_Name: (students[x.Student_ID] || {}).Full_Name || '' }); });
  if (p.status) rows = rows.filter(function (x) { return upper(x.Payment_Status) === upper(p.status); });
  if (p.type) rows = rows.filter(function (x) { return upper(x.Payment_Type) === upper(p.type); });
  if (p.eventId) rows = rows.filter(function (x) { return x.Event_ID === str(p.eventId); });
  const from = toDateKey(p.from), to = toDateKey(p.to);
  if (from) rows = rows.filter(function (x) { return str(x.Created_At).slice(0, 10) >= from; });
  if (to) rows = rows.filter(function (x) { return str(x.Created_At).slice(0, 10) <= to; });
  if (p.q) rows = rows.filter(function (x) { return textMatch(x, ['Payment_ID', 'Transaction_ID', 'Student_Name', 'Student_ID', 'Gateway_Order_ID'], p.q); });
  return sortBy(rows, 'Created_At', 'desc');
}

function actionAdminGetPayments(p, ctx) {
  requireAdmin(ctx);
  const rows = filteredPayments(p);
  const page = paginate(rows, p.page, p.pageSize || getSettingValue('ADMIN_PAGE_SIZE', 25));
  const sum = function (st) { return rows.filter(function (x) { return upper(x.Payment_Status) === st; }).reduce(function (a, x) { return a + toNumber(x.Amount); }, 0); };
  page.summary = { success: sum('SUCCESS'), pending: sum('PENDING'), refunded: sum('REFUNDED'), count: rows.length };
  return page;
}
