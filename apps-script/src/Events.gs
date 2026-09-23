/**
 * Events.gs — event lifecycle automation, registration counts, public event
 * queries, public results and student event registration.
 *
 * UPCOMING / ONGOING / PAST are never stored: they are calculated on every
 * request from Start_Date / End_Date in the association timezone, so events
 * move from Upcoming to Past without any admin action.
 */

/** UPCOMING | ONGOING | PAST | CANCELLED */
function getEventLifecycleStatus(ev, today) {
  today = today || todayKey();
  if (upper(ev.Status) === 'CANCELLED') return 'CANCELLED';
  const start = toDateKey(ev.Start_Date);
  const end = toDateKey(ev.End_Date) || start;
  if (!start) return 'UPCOMING';
  if (today < start) return 'UPCOMING';
  if (today <= end) return 'ONGOING';
  return 'PAST';
}

/** Spec alias. */
function calculateEventStatus(ev) { return getEventLifecycleStatus(ev); }

function isActiveRegistration(r) {
  return upper(r.Registration_Status) !== 'CANCELLED';
}

/** Registration counts by event and category (cancelled registrations excluded). */
function registrationCounts() {
  const byEvent = {}, byCategory = {};
  Db.all('Event_Registrations').forEach(function (r) {
    if (!isActiveRegistration(r)) return;
    byEvent[r.Event_ID] = (byEvent[r.Event_ID] || 0) + 1;
    if (r.Category_ID) byCategory[r.Category_ID] = (byCategory[r.Category_ID] || 0) + 1;
  });
  return { byEvent: byEvent, byCategory: byCategory };
}

/** COUNT(Event_Registrations where Event_ID = eventId), excluding cancelled. */
function calculateRegistrationCount(eventId) {
  return Db.where('Event_Registrations', function (r) { return r.Event_ID === eventId && isActiveRegistration(r); }).length;
}

/**
 * OPEN | NOT_OPEN | CLOSED | FULL | CANCELLED — whether registration is
 * currently possible. Admin overrides: Registration_Override (OPEN/CLOSED)
 * and Capacity_Override (TRUE lets registrations exceed the maximum).
 */
function getRegistrationState(ev, count, lifecycle, nowLocal) {
  nowLocal = nowLocal || nowLocalKey();
  lifecycle = lifecycle || getEventLifecycleStatus(ev);
  if (lifecycle === 'CANCELLED') return 'CANCELLED';
  if (upper(ev.Status) !== 'PUBLISHED') return 'CLOSED';
  const override = upper(ev.Registration_Override);
  if (override === 'CLOSED') return 'CLOSED';
  if (override !== 'OPEN') {
    if (lifecycle === 'PAST') return 'CLOSED';
    const regStart = toDateTimeKey(ev.Registration_Start, false);
    if (regStart && nowLocal < regStart) return 'NOT_OPEN';
    const deadline = toDateTimeKey(ev.Registration_Deadline, true) || toDateTimeKey(ev.Start_Date, true);
    if (deadline && nowLocal > deadline) return 'CLOSED';
  }
  const max = toNumber(ev.Maximum_Participants, 0);
  if (max > 0 && count >= max && !toBool(ev.Capacity_Override)) return 'FULL';
  return 'OPEN';
}

function categoryRegistrationState(cat, count, eventState) {
  if (eventState !== 'OPEN') return eventState;
  if (upper(cat.Status || 'ACTIVE') !== 'ACTIVE') return 'CLOSED';
  const max = toNumber(cat.Maximum_Participants, 0);
  if (max > 0 && count >= max) return 'FULL';
  return 'OPEN';
}

/* ------------------------------------------------------------------ */
/* Cached public event data                                            */
/* ------------------------------------------------------------------ */

const PRIVATE_EVENT_FIELDS = ['Poster_File_ID', 'Drive_Folder_ID', 'Rules_File_ID', 'Is_Sample', 'Created_At',
  'Registration_Override', 'Capacity_Override', 'Allow_Duplicate_Registration'];

/** Batch-reads events + counts once and caches them (lifecycle is computed per request). */
function publicEventData() {
  return cached('events', 'data', function () {
    const counts = registrationCounts();
    const gallery = {}, certs = {};
    Db.all('Gallery').forEach(function (g) {
      if (g.Event_ID && upper(g.Status) === 'PUBLISHED') gallery[g.Event_ID] = (gallery[g.Event_ID] || 0) + 1;
    });
    Db.all('Student_Certifications').forEach(function (c) {
      if (c.Event_ID && upper(c.Status) === 'ISSUED') certs[c.Event_ID] = (certs[c.Event_ID] || 0) + 1;
    });
    const results = {};
    Db.all('Results').forEach(function (r) { if (toBool(r.Published)) results[r.Event_ID] = true; });
    const events = Db.where('Events', function (e) {
      const s = upper(e.Status);
      return s === 'PUBLISHED' || s === 'CANCELLED';
    }).map(function (e) {
      const o = {};
      Object.keys(e).forEach(function (k) { o[k] = e[k]; });
      o._count = counts.byEvent[e.Event_ID] || 0;
      o._gallery = gallery[e.Event_ID] || 0;
      o._certs = certs[e.Event_ID] || 0;
      o._results = !!results[e.Event_ID] || toBool(e.Results_Published);
      o._regOverride = upper(e.Registration_Override);
      o._capOverride = toBool(e.Capacity_Override);
      return o;
    });
    const cats = Db.where('Event_Categories', function (c) { return upper(c.Status || 'ACTIVE') !== 'ARCHIVED'; }).map(function (c) {
      return {
        Category_ID: c.Category_ID, Event_ID: c.Event_ID, Category_Name: c.Category_Name, Age_Group: c.Age_Group, Gender: c.Gender,
        Race_Type: c.Race_Type, Distance: c.Distance, Entry_Fee: c.Entry_Fee, Maximum_Participants: c.Maximum_Participants,
        Status: c.Status || 'ACTIVE', _count: counts.byCategory[c.Category_ID] || 0,
      };
    });
    return { events: events, categories: cats };
  });
}

function eventEntryFee(ev, cats) {
  if (str(ev.Entry_Fee) !== '') return toNumber(ev.Entry_Fee, 0);
  const fees = (cats || []).map(function (c) { return str(c.Entry_Fee) === '' ? null : toNumber(c.Entry_Fee, 0); })
    .filter(function (f) { return f !== null; });
  return fees.length ? Math.min.apply(null, fees) : 0;
}

function serializeEventPublic(ev, opts) {
  opts = opts || {};
  const today = opts.today || todayKey();
  const lifecycle = getEventLifecycleStatus(ev, today);
  const raw = Object.assign({}, ev, { Registration_Override: ev._regOverride, Capacity_Override: ev._capOverride ? 'TRUE' : '' });
  const state = getRegistrationState(raw, ev._count || 0, lifecycle, opts.nowLocal);
  const start = toDateKey(ev.Start_Date), end = toDateKey(ev.End_Date) || start;
  const cats = opts.categories || [];
  const out = {
    id: ev.Event_ID,
    code: ev.Event_Code,
    name: ev.Event_Name,
    slug: ev.Slug || slugify(ev.Event_Name),
    type: upper(ev.Event_Type) || 'OTHER',
    posterUrl: driveImageUrl(ev.Poster_URL, 1200),
    startDate: start,
    endDate: end,
    registrationStart: toDateTimeKey(ev.Registration_Start, false),
    registrationDeadline: toDateTimeKey(ev.Registration_Deadline, true),
    venue: ev.Venue,
    city: ev.City,
    state: ev.State,
    entryFee: eventEntryFee(ev, cats),
    currency: getSettingValue('DEFAULT_CURRENCY', 'INR'),
    maxParticipants: toNumber(ev.Maximum_Participants, 0),
    registrationCount: ev._count || 0,
    lifecycle: lifecycle,
    registrationState: state,
    daysUntilStart: start ? daysBetween(today, start) : null,
    featured: toBool(ev.Featured),
    resultsPublished: !!ev._results,
    galleryCount: ev._gallery || 0,
    certificatesAvailable: (ev._certs || 0) > 0,
    organizer: ev.Organizer,
    excerpt: str(ev.Description).slice(0, 220),
  };
  if (opts.detail) {
    out.description = ev.Description;
    out.contact = ev.Contact;
    out.rulesUrl = ev.Rules_URL;
    out.rulesText = ev.Rules_Text;
    out.schedule = parseSchedule(ev.Schedule);
    out.mapUrl = ev.Map_URL;
    out.updatedAt = ev.Updated_At;
    out.categories = cats.filter(function (c) { return upper(c.Status) !== 'INACTIVE'; }).map(function (c) {
      return {
        id: c.Category_ID, name: c.Category_Name, ageGroup: c.Age_Group, gender: c.Gender, raceType: c.Race_Type, distance: c.Distance,
        entryFee: str(c.Entry_Fee) === '' ? out.entryFee : toNumber(c.Entry_Fee, 0),
        maxParticipants: toNumber(c.Maximum_Participants, 0),
        registrationCount: c._count || 0,
        registrationState: categoryRegistrationState(c, c._count || 0, state),
      };
    });
  }
  return out;
}

/** Schedule may be JSON [{date,time,title}] or lines "2026-10-24 | 08:00 | Opening". */
function parseSchedule(v) {
  const s = str(v);
  if (!s) return [];
  const json = parseJsonSafe(s, null);
  if (Array.isArray(json)) return json;
  return s.split(/\n+/).map(function (line) {
    const parts = line.split('|').map(function (x) { return x.trim(); });
    if (parts.length >= 3) return { date: parts[0], time: parts[1], title: parts.slice(2).join(' | ') };
    if (parts.length === 2) return { date: '', time: parts[0], title: parts[1] };
    return { date: '', time: '', title: parts[0] };
  }).filter(function (x) { return x.title; });
}

/** Filters + tab selection + sorting over the cached public events. */
function queryPublicEvents(p) {
  p = p || {};
  const data = publicEventData();
  const today = todayKey();
  const nowLocal = nowLocalKey();
  const catsByEvent = {};
  data.categories.forEach(function (c) { (catsByEvent[c.Event_ID] = catsByEvent[c.Event_ID] || []).push(c); });
  let list = data.events.map(function (e) {
    return serializeEventPublic(e, { today: today, nowLocal: nowLocal, categories: catsByEvent[e.Event_ID] });
  });
  const tab = upper(p.tab);
  if (tab === 'UPCOMING') {
    list = list.filter(function (e) { return e.lifecycle === 'UPCOMING' || (e.lifecycle === 'CANCELLED' && e.endDate >= today); });
  } else if (tab === 'ONGOING') {
    list = list.filter(function (e) { return e.lifecycle === 'ONGOING'; });
  } else if (tab === 'PAST') {
    list = list.filter(function (e) { return e.lifecycle === 'PAST' || (e.lifecycle === 'CANCELLED' && e.endDate < today); });
  } else if (tab === 'CURRENT') {
    list = list.filter(function (e) { return e.lifecycle === 'UPCOMING' || e.lifecycle === 'ONGOING'; });
  }
  const type = upper(p.type);
  if (type && type !== 'ALL') list = list.filter(function (e) { return e.type === type; });
  if (p.state) list = list.filter(function (e) { return str(e.state).toLowerCase() === str(p.state).toLowerCase(); });
  if (p.city) list = list.filter(function (e) { return str(e.city).toLowerCase() === str(p.city).toLowerCase(); });
  const from = toDateKey(p.from), to = toDateKey(p.to);
  if (from) list = list.filter(function (e) { return e.endDate >= from; });
  if (to) list = list.filter(function (e) { return e.startDate <= to; });
  if (p.q) {
    const q = str(p.q).toLowerCase();
    list = list.filter(function (e) {
      return [e.name, e.code, e.venue, e.city, e.state].join(' ').toLowerCase().indexOf(q) !== -1;
    });
  }
  if (p.month) list = list.filter(function (e) { return e.startDate.slice(0, 7) === str(p.month); });
  if (tab === 'PAST') list.sort(function (a, b) { return a.endDate < b.endDate ? 1 : a.endDate > b.endDate ? -1 : 0; });
  else if (tab === 'ONGOING') list.sort(function (a, b) { return a.endDate < b.endDate ? -1 : a.endDate > b.endDate ? 1 : 0; });
  else list.sort(function (a, b) { return a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0; });
  const facets = {
    states: uniqueSorted(data.events.map(function (e) { return e.State; })),
    cities: uniqueSorted(data.events.map(function (e) { return e.City; })),
  };
  const pageSize = p.pageSize || getSettingValue('EVENTS_PAGE_SIZE', 12);
  const page = paginate(list, p.page, pageSize);
  page.facets = facets;
  return page;
}

function uniqueSorted(values) {
  const seen = {};
  values.forEach(function (v) { if (str(v)) seen[str(v)] = true; });
  return Object.keys(seen).sort();
}

function findPublicEvent(p) {
  const data = publicEventData();
  const key = str(p.slug || p.id);
  if (!key) fail('VALIDATION_ERROR', 'Event not specified.');
  // Event_ID lookup first (reliable), then stored slug, then a trailing ID in the slug.
  let ev = data.events.filter(function (e) { return e.Event_ID === key; })[0] ||
    data.events.filter(function (e) { return (e.Slug || slugify(e.Event_Name)) === key; })[0];
  if (!ev) {
    const m = key.match(/(EVT-\d{4}-\d{6})$/i);
    if (m) ev = data.events.filter(function (e) { return e.Event_ID === m[1].toUpperCase(); })[0];
  }
  if (!ev) throw new ApiError('NOT_FOUND', 'Event not found.', 404);
  const cats = data.categories.filter(function (c) { return c.Event_ID === ev.Event_ID; });
  return { raw: ev, event: serializeEventPublic(ev, { detail: true, categories: cats }) };
}

/* ------------------------------------------------------------------ */
/* Public actions                                                      */
/* ------------------------------------------------------------------ */

function actionGetUpcomingEvents(p) { return queryPublicEvents(Object.assign({}, p, { tab: 'UPCOMING' })); }
function actionGetOngoingEvents(p) { return queryPublicEvents(Object.assign({}, p, { tab: 'ONGOING' })); }
function actionGetPastEvents(p) { return queryPublicEvents(Object.assign({}, p, { tab: 'PAST' })); }
function actionGetPublicEvents(p) { return queryPublicEvents(p); }

function actionGetEvent(p) {
  const found = findPublicEvent(p);
  const ev = found.event;
  ev.sponsors = sponsorsForEvent(found.raw.Event_ID, found.raw.Sponsor_IDs);
  ev.gallery = publicGalleryItems().filter(function (g) { return g.eventId === ev.id; }).slice(0, 8);
  return ev;
}

function actionGetEventCategories(p) {
  return findPublicEvent(p).event.categories;
}

/** Published results for an event, grouped by category. */
function actionGetEventResults(p) {
  const found = findPublicEvent(p);
  const eventId = found.raw.Event_ID;
  const groups = cached('results', 'event:' + eventId, function () {
    const students = indexBy(Db.all('Students'), 'Student_ID');
    const cats = indexBy(Db.where('Event_Categories', function (c) { return c.Event_ID === eventId; }), 'Category_ID');
    const byCat = {};
    Db.where('Results', function (r) { return r.Event_ID === eventId && toBool(r.Published); }).forEach(function (r) {
      const s = students[r.Student_ID] || {};
      const c = cats[r.Category_ID] || {};
      const key = r.Category_ID || 'GENERAL';
      if (!byCat[key]) {
        byCat[key] = { categoryId: r.Category_ID, categoryName: c.Category_Name || 'General', ageGroup: c.Age_Group || '',
          gender: c.Gender || '', raceType: c.Race_Type || '', distance: c.Distance || '', results: [] };
      }
      byCat[key].results.push({
        studentName: s.Full_Name || 'Athlete', academy: s.Academy_Name || '', city: s.City || '', bib: r.Bib_Number, heat: r.Heat,
        lane: r.Lane, time: r.Race_Time, position: toNumber(r.Position, 0) || null, points: toNumber(r.Points, 0),
        status: upper(r.Result_Status) || 'FINISHED',
      });
    });
    return Object.keys(byCat).map(function (k) {
      const g = byCat[k];
      g.results.sort(function (a, b) {
        if (a.status !== 'FINISHED' && b.status === 'FINISHED') return 1;
        if (b.status !== 'FINISHED' && a.status === 'FINISHED') return -1;
        return (a.position || 9999) - (b.position || 9999);
      });
      return g;
    }).sort(function (a, b) { return String(a.categoryName).localeCompare(String(b.categoryName)); });
  });
  return { event: found.event, categories: groups };
}

/* ------------------------------------------------------------------ */
/* Eligibility                                                         */
/* ------------------------------------------------------------------ */

/** Parses "Under 10", "U-12", "10-12", "Above 16", "16+", "Senior", "Open". */
function parseAgeGroup(text) {
  const s = str(text).toLowerCase();
  if (!s || /senior|open|all/.test(s)) return null;
  let m = s.match(/(?:under|u)[\s\-]*(\d{1,2})/);
  if (m) return { max: +m[1] - 1 };
  m = s.match(/(\d{1,2})\s*(?:-|to)\s*(\d{1,2})/);
  if (m) return { min: +m[1], max: +m[2] };
  m = s.match(/(?:above|over)\s*(\d{1,2})/) || s.match(/(\d{1,2})\s*\+/);
  if (m) return { min: +m[1] };
  return null;
}

function normalizeGender(g) {
  const s = upper(g);
  if (/^(M|MALE|BOY|BOYS|MEN)$/.test(s)) return 'MALE';
  if (/^(F|FEMALE|GIRL|GIRLS|WOMEN)$/.test(s)) return 'FEMALE';
  return s;
}

function checkCategoryEligibility(cat, student, eventStart) {
  const g = normalizeGender(cat.Gender);
  if ((g === 'MALE' || g === 'FEMALE') && normalizeGender(student.Gender) !== g) {
    fail('NOT_ELIGIBLE', 'This category is for ' + (g === 'MALE' ? 'male' : 'female') + ' athletes only.');
  }
  const range = parseAgeGroup(cat.Age_Group);
  if (range) {
    const age = ageOn(toDateKey(student.DOB), eventStart || todayKey());
    if (age === null) fail('NOT_ELIGIBLE', 'Please add your date of birth to your profile to register for age-group categories.');
    if ((range.min !== undefined && age < range.min) || (range.max !== undefined && age > range.max)) {
      fail('NOT_ELIGIBLE', 'Your age (' + age + ') is outside the ' + cat.Age_Group + ' age group.');
    }
  }
}

/* ------------------------------------------------------------------ */
/* Student registration                                                */
/* ------------------------------------------------------------------ */

/**
 * Registers the signed-in student for an event category. Runs under the
 * script lock so capacity and duplicate checks are race-free.
 */
function registerEvent(p, ctx) {
  const student = requireStudent(ctx);
  if (!toBool(p.acceptTerms)) fail('VALIDATION_ERROR', 'Please accept the terms and conditions.');
  rateLimit('reg:' + student.Student_ID, 20, 3600);
  const result = withLock(function () {
    Db.refresh('Event_Registrations');
    Db.refresh('Events');
    const ev = Db.byId('Events', str(p.eventId));
    if (!ev || ['PUBLISHED', 'CANCELLED'].indexOf(upper(ev.Status)) === -1) fail('NOT_FOUND', 'Event not found.');
    const cats = Db.where('Event_Categories', function (c) { return c.Event_ID === ev.Event_ID && upper(c.Status || 'ACTIVE') !== 'ARCHIVED'; });
    let cat = null;
    if (cats.length) {
      cat = cats.filter(function (c) { return c.Category_ID === str(p.categoryId); })[0];
      if (!cat) fail('VALIDATION_ERROR', 'Please select a valid category.');
    }
    const active = Db.where('Event_Registrations', function (r) { return r.Event_ID === ev.Event_ID && isActiveRegistration(r); });
    const lifecycle = getEventLifecycleStatus(ev);
    const state = getRegistrationState(ev, active.length, lifecycle);
    if (state === 'FULL') fail('REGISTRATION_FULL', 'Registration is full for this event.');
    if (state === 'NOT_OPEN') fail('REGISTRATION_NOT_OPEN', 'Registration has not opened yet.');
    if (state !== 'OPEN') fail('REGISTRATION_CLOSED', 'Registration is closed for this event.');
    if (cat) {
      const catCount = active.filter(function (r) { return r.Category_ID === cat.Category_ID; }).length;
      const cstate = categoryRegistrationState(cat, catCount, state);
      if (cstate === 'FULL') fail('REGISTRATION_FULL', 'This category is full.');
      if (cstate !== 'OPEN') fail('REGISTRATION_CLOSED', 'This category is closed.');
      checkCategoryEligibility(cat, student, toDateKey(ev.Start_Date));
    }
    if (!toBool(ev.Allow_Duplicate_Registration)) {
      const dup = active.filter(function (r) {
        return r.Student_ID === student.Student_ID && (!cat || r.Category_ID === cat.Category_ID);
      })[0];
      if (dup) fail('DUPLICATE_REGISTRATION', 'You are already registered for this ' + (cat ? 'category' : 'event') + ' (' + dup.Registration_Number + ').');
    }
    const fee = cat && str(cat.Entry_Fee) !== '' ? toNumber(cat.Entry_Fee, 0) : eventEntryFee(ev, cats);
    const regId = generateID('Event_Registrations');
    const reg = Db.insert('Event_Registrations', {
      Registration_ID: regId, Event_ID: ev.Event_ID, Student_ID: student.Student_ID, Category_ID: cat ? cat.Category_ID : '',
      Registration_Number: regId, Bib_Number: '', Registration_Date: todayKey(), Payment_ID: '',
      Payment_Status: fee > 0 ? 'PENDING' : 'NOT_REQUIRED', Registration_Status: fee > 0 ? 'PENDING_PAYMENT' : 'CONFIRMED',
      Amount: fee, Terms_Accepted_At: nowIso(),
    });
    const payment = createPaymentRecord({
      type: 'EVENT_REGISTRATION', amount: fee, userId: ctx.user.User_ID, studentId: student.Student_ID, eventId: ev.Event_ID,
      registrationId: regId, remarks: ev.Event_Name + (cat ? ' — ' + cat.Category_Name : ''),
    });
    Db.update('Event_Registrations', regId, { Payment_ID: payment.Payment_ID });
    return { ev: ev, cat: cat, reg: reg, payment: payment };
  });
  clearCacheForSheets(['Event_Registrations']);
  if (upper(result.reg.Registration_Status) === 'CONFIRMED') {
    notifyUser(ctx.user.User_ID, 'Event registration confirmed', 'You are registered for ' + result.ev.Event_Name +
      '. Registration number: ' + result.reg.Registration_Number, 'EVENT_REGISTRATION', result.reg.Registration_ID);
  }
  return {
    registration: serializeRegistration(result.reg, result.ev, result.cat, result.payment),
    payment: serializePayment(result.payment),
    nextStep: upper(result.payment.Payment_Status) === 'SUCCESS' ? 'CONFIRMED' : 'PAYMENT',
  };
}

function serializeRegistration(r, ev, cat, payment, result) {
  ev = ev || Db.byId('Events', r.Event_ID) || {};
  cat = cat || (r.Category_ID ? Db.byId('Event_Categories', r.Category_ID) : null) || {};
  return {
    id: r.Registration_ID,
    registrationNumber: r.Registration_Number,
    eventId: r.Event_ID,
    eventName: ev.Event_Name || '',
    eventSlug: ev.Slug || '',
    eventStart: toDateKey(ev.Start_Date),
    eventEnd: toDateKey(ev.End_Date),
    venue: ev.Venue || '',
    city: ev.City || '',
    lifecycle: ev.Event_ID ? getEventLifecycleStatus(ev) : '',
    categoryId: r.Category_ID,
    categoryName: cat.Category_Name || '',
    raceType: cat.Race_Type || '',
    distance: cat.Distance || '',
    ageGroup: cat.Age_Group || '',
    bibNumber: r.Bib_Number,
    heat: r.Heat,
    lane: r.Lane,
    amount: toNumber(r.Amount, 0),
    paymentId: r.Payment_ID,
    paymentStatus: r.Payment_Status,
    status: r.Registration_Status,
    registrationDate: toDateKey(r.Registration_Date),
    result: result || null,
  };
}

/** Student may cancel a registration that has not been paid. */
function actionCancelMyRegistration(p, ctx) {
  const student = requireStudent(ctx);
  const reg = Db.byId('Event_Registrations', str(p.registrationId));
  if (!reg || reg.Student_ID !== student.Student_ID) fail('NOT_FOUND', 'Registration not found.');
  if (upper(reg.Payment_Status) === 'SUCCESS' || upper(reg.Payment_Status) === 'PAID') {
    fail('NOT_ALLOWED', 'Paid registrations can only be cancelled by the association office.');
  }
  withLock(function () {
    Db.update('Event_Registrations', reg.Registration_ID, { Registration_Status: 'CANCELLED', Remarks: 'Cancelled by student' });
    if (reg.Payment_ID) {
      const pay = Db.byId('Payments', reg.Payment_ID);
      if (pay && upper(pay.Payment_Status) === 'PENDING') Db.update('Payments', pay.Payment_ID, { Payment_Status: 'CANCELLED' });
    }
  });
  clearCacheForSheets(['Event_Registrations']);
  return { cancelled: true };
}
