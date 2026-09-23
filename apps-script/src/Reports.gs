/**
 * Reports.gs — admin reports and CSV / Google Sheets (Excel) exports.
 */

const REPORT_COLUMNS = {
  students: ['Student_ID', 'Full_Name', 'Gender', 'DOB', 'Age', 'Parent_Name', 'Parent_Mobile', 'Email', 'School', 'Class', 'City', 'State',
    'Academy_Name', 'Experience_Level', 'Membership_Number', 'Status', 'Created_At'],
  memberships: ['Membership_Number', 'Membership_ID', 'Student_ID', 'Student_Name', 'Plan_Name', 'Plan_Type', 'Start_Date', 'Expiry_Date', 'Status',
    'Payment_Status', 'Fee', 'Created_At'],
  registrations: ['Registration_Number', 'Event_Name', 'Student_ID', 'Student_Name', 'Gender', 'Age', 'Academy', 'Category_Name', 'Age_Group',
    'Race_Type', 'Bib_Number', 'Heat', 'Lane', 'Amount', 'Payment_Status', 'Registration_Status', 'Registration_Date'],
  payments: ['Payment_ID', 'Student_ID', 'Student_Name', 'Payment_Type', 'Amount', 'Currency', 'Gateway', 'Transaction_ID', 'Payment_Status',
    'Payment_Date', 'Event_ID', 'Membership_ID', 'Program_ID', 'Remarks', 'Created_At'],
  results: ['Event_Name', 'Category_Name', 'Student_ID', 'Student_Name', 'Bib_Number', 'Heat', 'Lane', 'Race_Time', 'Position', 'Points',
    'Result_Status', 'Published'],
  certificates: ['Certificate_Number', 'Student_ID', 'Student_Name', 'Event_Name', 'Title', 'Certificate_Type', 'Issue_Date', 'Expiry_Date', 'Status',
    'Verification_Code', 'Certificate_URL'],
  programs: ['Program_Registration_ID', 'Program_Name', 'Student_ID', 'Student_Name', 'Status', 'Registration_Date', 'Payment_ID'],
  inquiries: ['Inquiry_ID', 'Date', 'Name', 'Email', 'Mobile', 'Subject', 'Message', 'Status', 'Admin_Notes'],
  events: ['Event_ID', 'Event_Code', 'Event_Name', 'Event_Type', 'Start_Date', 'End_Date', 'Venue', 'City', 'State', 'Entry_Fee',
    'Maximum_Participants', 'Registrations', 'Lifecycle', 'Status'],
};

function inRange(dateStr, from, to) {
  const d = str(dateStr).slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function buildReportRows(p) {
  const type = str(p.type);
  const from = toDateKey(p.from), to = toDateKey(p.to);
  const students = indexBy(Db.all('Students'), 'Student_ID');
  const events = indexBy(Db.all('Events'), 'Event_ID');
  const cats = indexBy(Db.all('Event_Categories'), 'Category_ID');
  const status = upper(p.status);
  const name = function (id) { return (students[id] || {}).Full_Name || ''; };
  let rows;
  switch (type) {
    case 'students': {
      const mem = {};
      Db.all('Memberships').forEach(function (m) { if (upper(m.Status) === 'ACTIVE') mem[m.Student_ID] = m.Membership_Number; });
      rows = Db.all('Students').filter(function (s) { return (!status || upper(s.Status) === status) && inRange(s.Created_At, from, to); })
        .map(function (s) { return Object.assign({}, s, { Age: ageOn(toDateKey(s.DOB), todayKey()), Membership_Number: mem[s.Student_ID] || '' }); });
      break;
    }
    case 'memberships': {
      const plans = indexBy(Db.all('Membership_Plans'), 'Plan_ID');
      const pays = indexBy(Db.all('Payments'), 'Payment_ID');
      rows = Db.all('Memberships').filter(function (m) { return (!status || upper(m.Status) === status) && inRange(m.Created_At, from, to); })
        .map(function (m) {
          const pl = plans[m.Plan_ID] || {};
          return Object.assign({}, m, { Student_Name: name(m.Student_ID), Plan_Name: pl.Plan_Name || '', Plan_Type: pl.Plan_Type || '', Fee: pl.Fee || '',
            Payment_Status: (pays[m.Payment_ID] || {}).Payment_Status || '' });
        });
      break;
    }
    case 'registrations':
      rows = filteredRegistrations({ eventId: p.eventId, categoryId: p.categoryId, status: status }).filter(function (r) { return inRange(r.Registration_Date || r.Created_At, from, to); })
        .map(function (r) { return Object.assign({}, r, { Event_Name: (events[r.Event_ID] || {}).Event_Name || '' }); });
      break;
    case 'payments':
      rows = filteredPayments({ status: status, eventId: p.eventId, from: from, to: to, type: p.paymentType });
      break;
    case 'results':
      rows = Db.all('Results').filter(function (r) {
        return (!p.eventId || r.Event_ID === str(p.eventId)) && (!p.categoryId || r.Category_ID === str(p.categoryId)) && (!status || upper(r.Result_Status) === status);
      }).map(function (r) {
        return Object.assign({}, r, { Event_Name: (events[r.Event_ID] || {}).Event_Name || '', Category_Name: (cats[r.Category_ID] || {}).Category_Name || '',
          Student_Name: name(r.Student_ID) });
      });
      break;
    case 'certificates':
      rows = Db.all('Student_Certifications').filter(function (c) {
        return (!status || upper(c.Status) === status) && (!p.eventId || c.Event_ID === str(p.eventId)) && inRange(c.Issue_Date, from, to);
      }).map(function (c) { return Object.assign({}, c, { Student_Name: name(c.Student_ID), Event_Name: (events[c.Event_ID] || {}).Event_Name || '' }); });
      break;
    case 'programs': {
      const programs = indexBy(Db.all('Programs'), 'Program_ID');
      rows = Db.all('Program_Registrations').filter(function (r) {
        return (!status || upper(r.Status) === status) && (!p.programId || r.Program_ID === str(p.programId)) && inRange(r.Registration_Date, from, to);
      }).map(function (r) { return Object.assign({}, r, { Program_Name: (programs[r.Program_ID] || {}).Program_Name || '', Student_Name: name(r.Student_ID) }); });
      break;
    }
    case 'inquiries':
      rows = Db.all('Contact_Inquiries').filter(function (i) { return (!status || upper(i.Status) === status) && inRange(i.Date || i.Created_At, from, to); });
      break;
    case 'events': {
      const counts = registrationCounts();
      rows = Db.all('Events').filter(function (e) { return (!status || upper(e.Status) === status) && inRange(e.Start_Date, from, to); })
        .map(function (e) { return Object.assign({}, e, { Registrations: counts.byEvent[e.Event_ID] || 0, Lifecycle: getEventLifecycleStatus(e) }); });
      break;
    }
    default:
      fail('VALIDATION_ERROR', 'Unknown report type.');
  }
  return { columns: REPORT_COLUMNS[type], rows: rows };
}

function actionAdminGetReport(p, ctx) {
  requireAdmin(ctx);
  const r = buildReportRows(p);
  const statusField = { students: 'Status', memberships: 'Status', registrations: 'Registration_Status', payments: 'Payment_Status', results: 'Result_Status',
    certificates: 'Status', programs: 'Status', inquiries: 'Status', events: 'Lifecycle' }[p.type];
  const summary = { total: r.rows.length, byStatus: groupCount(r.rows, function (x) { return upper(x[statusField]); }) };
  if (p.type === 'payments') summary.amount = r.rows.filter(function (x) { return upper(x.Payment_Status) === 'SUCCESS'; }).reduce(function (a, x) { return a + toNumber(x.Amount); }, 0);
  const page = paginate(r.rows.map(function (row) { return pick(row, r.columns); }), p.page, p.pageSize || 50);
  page.columns = r.columns;
  page.summary = summary;
  return page;
}

function csvEscape(v) {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // prevent formula injection when opened in Excel
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/** format: csv (default) or sheet (creates a Google Sheet in /Reports with an .xlsx link). */
function actionAdminExport(p, ctx) {
  requireAdmin(ctx);
  const r = buildReportRows(p);
  const stamp = formatInTz(new Date(), 'yyyyMMdd-HHmm');
  const filename = str(p.type) + '-report-' + stamp;
  writeAuditLog(ctx, 'EXPORT_' + upper(p.type), 'Report', str(p.type), null, { rows: r.rows.length, format: str(p.format) || 'csv' });
  const matrix = [r.columns].concat(r.rows.map(function (row) { return r.columns.map(function (c) { return row[c] === undefined ? '' : row[c]; }); }));
  if (str(p.format) === 'sheet') {
    const ss = SpreadsheetApp.create(filename);
    const sh = ss.getSheets()[0];
    sh.getRange(1, 1, matrix.length, r.columns.length).setNumberFormat('@').setValues(matrix.map(function (row) { return row.map(sanitizeCell); }));
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, r.columns.length).setFontWeight('bold');
    try {
      const file = DriveApp.getFileById(ss.getId());
      if (folderIndex().REPORTS) file.moveTo(DriveApp.getFolderById(folderIndex().REPORTS));
    } catch (e) { /* keep in My Drive */ }
    return { filename: filename, url: ss.getUrl(), xlsxUrl: 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx', rows: r.rows.length };
  }
  const csv = matrix.map(function (row) { return row.map(csvEscape).join(','); }).join('\r\n');
  return { filename: filename + '.csv', mimeType: 'text/csv', content: csv, rows: r.rows.length };
}

function actionAdminExportEventRegistrations(p, ctx) {
  return actionAdminExport(Object.assign({}, p, { type: 'registrations' }), ctx);
}

/** Event report: totals, payment status, category / gender / age-group breakdown and participants. */
function actionAdminGetEventReport(p, ctx) {
  requireAdmin(ctx);
  const ev = Db.byId('Events', str(p.eventId));
  if (!ev) fail('NOT_FOUND', 'Event not found.');
  const rows = filteredRegistrations({ eventId: ev.Event_ID });
  const active = rows.filter(isActiveRegistration);
  const revenue = Db.where('Payments', function (x) { return x.Event_ID === ev.Event_ID && upper(x.Payment_Status) === 'SUCCESS'; })
    .reduce(function (a, x) { return a + toNumber(x.Amount); }, 0);
  return {
    event: { id: ev.Event_ID, name: ev.Event_Name, startDate: toDateKey(ev.Start_Date), endDate: toDateKey(ev.End_Date), lifecycle: getEventLifecycleStatus(ev),
      maxParticipants: toNumber(ev.Maximum_Participants) },
    totals: {
      total: rows.length, active: active.length,
      paid: rows.filter(function (r) { return upper(r.Payment_Status) === 'PAID'; }).length,
      free: rows.filter(function (r) { return upper(r.Payment_Status) === 'NOT_REQUIRED'; }).length,
      pending: rows.filter(function (r) { return upper(r.Registration_Status) === 'PENDING_PAYMENT'; }).length,
      cancelled: rows.filter(function (r) { return upper(r.Registration_Status) === 'CANCELLED'; }).length,
      revenue: revenue,
    },
    byCategory: groupCount(active, function (r) { return r.Category_Name; }),
    byGender: groupCount(active, function (r) { return upper(r.Gender); }),
    byAgeGroup: groupCount(active, function (r) { return r.Age_Group || (r.Age === null ? '' : 'Age ' + r.Age); }),
    byAcademy: groupCount(active, function (r) { return r.Academy; }),
    participants: active.map(function (r) { return pick(r, ['Registration_Number', 'Student_Name', 'Gender', 'Age', 'Category_Name', 'Bib_Number', 'Payment_Status', 'Registration_Status']); }),
  };
}

/** Membership report by status, type, month and year. */
function actionAdminGetMembershipReport(p, ctx) {
  requireAdmin(ctx);
  const plans = indexBy(Db.all('Membership_Plans'), 'Plan_ID');
  const rows = Db.all('Memberships');
  const months = lastNMonths(12);
  const byMonth = {};
  months.forEach(function (m) { byMonth[m] = 0; });
  rows.forEach(function (m) { const k = str(m.Created_At).slice(0, 7); if (byMonth[k] !== undefined) byMonth[k]++; });
  return {
    byStatus: groupCount(rows, function (m) { return upper(m.Status); }),
    byType: groupCount(rows, function (m) { return upper((plans[m.Plan_ID] || {}).Plan_Type); }),
    byPlan: groupCount(rows, function (m) { return (plans[m.Plan_ID] || {}).Plan_Name; }),
    byMonth: byMonth,
    byYear: groupCount(rows, function (m) { return str(m.Created_At).slice(0, 4); }),
    expiringIn30Days: rows.filter(function (m) {
      const e = toDateKey(m.Expiry_Date);
      return upper(m.Status) === 'ACTIVE' && e && daysBetween(todayKey(), e) >= 0 && daysBetween(todayKey(), e) <= 30;
    }).length,
  };
}
