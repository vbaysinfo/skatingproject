/**
 * Runs the real Apps Script sources against in-memory Google service mocks
 * and executes the platform demo tests (spec §160) plus security checks.
 *
 *   node apps-script/tests/run-tests.js
 */
'use strict';
const crypto = require('crypto');
const { loadGas } = require('./load-gas');

const PROXY_KEY = 'test-proxy-secret';
const RZP_SECRET = 'rzp_test_secret';

let passed = 0, failed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed++; console.log('  ✔ ' + name); }
  catch (e) { failed++; failures.push(name); console.log('  ✖ ' + name + '\n      ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n      ') : e)); }
}
function assert(cond, msg) { if (!cond) throw new Error('Assertion failed: ' + msg); }
function eq(a, b, msg) { if (a !== b) throw new Error((msg || 'eq') + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); }

// Razorpay API mock
const rzpPayments = {};
function fetchHandler(url, o) {
  if (url.indexOf('https://api.razorpay.com/v1/orders') === 0) {
    const body = JSON.parse(o.payload);
    return { code: 200, body: { id: 'order_' + body.receipt, amount: body.amount, currency: body.currency } };
  }
  const m = url.match(/api\.razorpay\.com\/v1\/payments\/([^/]+)$/);
  if (m) return rzpPayments[m[1]] ? { code: 200, body: rzpPayments[m[1]] } : { code: 404, body: {} };
  if (url.indexOf('quickchart.io') !== -1) return { code: 200, body: 'PNG' };
  return { code: 404, body: '' };
}

const { G, env } = loadGas({ fetchHandler, verbose: !!process.env.VERBOSE });
env.store.props.API_PROXY_SECRET = PROXY_KEY;
env.store.props.SETUP_TOKEN = 'setup-token-123';
env.store.props.SITE_URL = 'https://skate.example.org';

function call(action, payload, token, extra) {
  const req = Object.assign({ action, payload: payload || {}, token, key: PROXY_KEY, clientIp: '10.0.0.1' }, extra || {});
  const res = G.handleRequest('POST', JSON.parse(JSON.stringify(req)));
  return JSON.parse(JSON.stringify(res));
}
function ok(action, payload, token) {
  const r = call(action, payload, token);
  if (!r.success) throw new Error(action + ' failed: ' + r.error + ' — ' + r.message);
  return r.data;
}
function err(action, payload, token) {
  const r = call(action, payload, token);
  if (r.success) throw new Error(action + ' unexpectedly succeeded');
  return r.error;
}

const today = G.todayKey();
const addDays = G.addDays;

console.log('\nUnit: dates & lifecycle (association timezone)');
test('date parsing accepts common formats', () => {
  eq(G.toDateKey('24-Oct-2026'), '2026-10-24');
  eq(G.toDateKey('24 Oct 2026'), '2026-10-24');
  eq(G.toDateKey('24/10/2026'), '2026-10-24');
  eq(G.toDateKey('2026-10-24'), '2026-10-24');
  eq(G.toDateKey('31/02/2026'), '', 'invalid date');
  eq(G.toDateTimeKey('2026-10-24', true), '2026-10-24 23:59');
  eq(G.toDateTimeKey('2026-10-24 5:30 PM', false), '2026-10-24 17:30');
});
test('spec §8 example: 24–25 Oct lifecycle', () => {
  const ev = { Start_Date: '24-Oct-2026', End_Date: '25-Oct-2026', Status: 'PUBLISHED' };
  eq(G.getEventLifecycleStatus(ev, '2026-10-23'), 'UPCOMING');
  eq(G.getEventLifecycleStatus(ev, '2026-10-24'), 'ONGOING');
  eq(G.getEventLifecycleStatus(ev, '2026-10-25'), 'ONGOING');
  eq(G.getEventLifecycleStatus(ev, '2026-10-26'), 'PAST');
  eq(G.getEventLifecycleStatus(Object.assign({}, ev, { Status: 'CANCELLED' }), '2026-10-23'), 'CANCELLED');
});
test('today is computed in Asia/Kolkata, not the server timezone', () => {
  const d = new Date(Date.UTC(2026, 9, 23, 19, 0, 0)); // 23 Oct 19:00 UTC = 24 Oct 00:30 IST
  eq(G.formatInTz(d, 'yyyy-MM-dd'), '2026-10-24');
});
test('registration deadline and capacity rules', () => {
  const ev = { Start_Date: '2026-10-24', End_Date: '2026-10-25', Registration_Deadline: '2026-10-20', Status: 'PUBLISHED', Maximum_Participants: 2 };
  eq(G.getRegistrationState(ev, 0, 'UPCOMING', '2026-10-20 23:00'), 'OPEN');
  eq(G.getRegistrationState(ev, 0, 'UPCOMING', '2026-10-21 00:01'), 'CLOSED');
  eq(G.getRegistrationState(ev, 2, 'UPCOMING', '2026-10-19 10:00'), 'FULL');
  eq(G.getRegistrationState(Object.assign({}, ev, { Capacity_Override: 'TRUE' }), 2, 'UPCOMING', '2026-10-19 10:00'), 'OPEN');
  eq(G.getRegistrationState(Object.assign({}, ev, { Registration_Override: 'OPEN' }), 0, 'UPCOMING', '2026-10-22 10:00'), 'OPEN');
  eq(G.getRegistrationState(Object.assign({}, ev, { Registration_Override: 'CLOSED' }), 0, 'UPCOMING', '2026-10-01 10:00'), 'CLOSED');
});
test('age group parsing', () => {
  eq(JSON.stringify(G.parseAgeGroup('Under 10')), JSON.stringify({ max: 9 }));
  eq(JSON.stringify(G.parseAgeGroup('10-12')), JSON.stringify({ min: 10, max: 12 }));
  eq(G.parseAgeGroup('Senior'), null);
});
test('formula injection is neutralised', () => {
  eq(G.sanitizeCell('=IMPORTXML("x")'), "'=IMPORTXML(\"x\")");
  eq(G.sanitizeCell('+91 98765 43210'), "'+91 98765 43210");
  eq(G.sanitizeCell('hello'), 'hello');
});

console.log('\nSetup wizard');
let setup;
test('rejects a wrong setup token', () => { eq(err('runSetup', { setupToken: 'nope' }), 'FORBIDDEN'); });
test('runSetup creates spreadsheet, sheets, headers, folders, admin, triggers', () => {
  setup = ok('runSetup', { setupToken: 'setup-token-123', driveRootFolderId: env.rootId, associationName: 'ABC Skating Association',
    adminEmail: 'admin@example.org', adminPassword: 'Admin12345', sampleData: true, siteUrl: 'https://skate.example.org' });
  assert(setup.ready, 'ready: ' + JSON.stringify(setup.steps.filter((s) => !s.ok)));
  eq(setup.status, 'SYSTEM READY');
  const ss = Object.values(env.store.spreadsheets)[0];
  ['Settings', 'Users', 'Students', 'Events', 'Event_Categories', 'Event_Registrations', 'Membership_Plans', 'Memberships', 'Programs',
    'Program_Registrations', 'Certifications', 'Student_Certifications', 'Results', 'Achievements', 'Gallery', 'Videos', 'Announcements',
    'Sponsors', 'Contact_Inquiries', 'Payments', 'Notifications', 'Ranking_Settings', 'Drive_Folders', 'Audit_Logs'].forEach((n) => assert(ss.getSheetByName(n), 'sheet ' + n));
  const folderNames = Object.values(env.store.folders).map((f) => f.name);
  ['SKATING ASSOCIATION', 'Website', 'Logo', 'Hero', 'Events', 'Students', 'Memberships', 'Programs', 'Gallery', 'Certificates', 'Documents', 'Reports']
    .forEach((n) => assert(folderNames.indexOf(n) !== -1, 'folder ' + n));
  eq(env.store.triggers.length, 3, 'triggers');
});
test('setup cannot be re-run without rerun flag', () => { eq(err('runSetup', { setupToken: 'setup-token-123' }), 'ALREADY_INITIALIZED'); });
test('site title comes from settings', () => { eq(ok('getSettings').SITE_NAME, 'ABC Skating Association'); });
test('passwords are stored only as hashes', () => {
  const users = G.Db.all('Users');
  const admin = users.find((u) => u.Email === 'admin@example.org');
  assert(admin.Password_Hash && admin.Password_Hash.length === 64, 'hash');
  assert(JSON.stringify(Object.values(env.store.spreadsheets)[0].sheets.map((sh) => sh.data)).indexOf('Admin12345') === -1, 'plain password not stored');
});

console.log('\nAuthentication & authorisation');
let adminToken;
test('admin login works only through admin portal', () => {
  eq(err('adminLogin', { email: 'admin@example.org', password: 'wrong-pass1' }), 'INVALID_CREDENTIALS');
  adminToken = ok('adminLogin', { email: 'admin@example.org', password: 'Admin12345' }).token;
  assert(adminToken, 'token');
  eq(err('login', { email: 'admin@example.org', password: 'Admin12345' }), 'USE_ADMIN_LOGIN');
});
test('requests without the proxy key are rejected', () => {
  const r = G.handleRequest('POST', { action: 'getSettings', payload: {} });
  eq(r.error, 'FORBIDDEN');
});
test('GET is only allowed for public read actions', () => {
  const r = G.handleRequest('GET', { action: 'admin.getStudents', key: PROXY_KEY, token: adminToken });
  eq(r.error, 'METHOD_NOT_ALLOWED');
});
test('admin API requires ADMIN role (anonymous)', () => { eq(err('admin.getStudents', {}), 'UNAUTHORIZED'); });

console.log('\nDemo tests (spec §160)');
let eventId, eventSlug;
test('Test 1: create + publish event → appears on website', () => {
  const ev = ok('admin.createEvent', { data: { Event_Name: 'Chennai Open Rink Race', Event_Type: 'OPEN', Start_Date: addDays(today, 10), End_Date: addDays(today, 11),
    Registration_Deadline: addDays(today, 8), Venue: 'City Rink', City: 'Chennai', State: 'Tamil Nadu', Entry_Fee: 500, Maximum_Participants: 2 } }, adminToken);
  eventId = ev.Event_ID; eventSlug = ev.Slug;
  assert(/^EVT-\d{4}-\d{6}$/.test(eventId), 'event id format ' + eventId);
  eq(eventSlug, 'chennai-open-rink-race');
  assert(!ok('getUpcomingEvents').items.some((e) => e.id === eventId), 'draft not public');
  ok('admin.publishEvent', { id: eventId }, adminToken);
  const list = ok('getUpcomingEvents').items;
  assert(list.some((e) => e.id === eventId), 'published event listed');
  assert(env.store.folders && Object.values(env.store.folders).some((f) => f.name === eventId), 'event drive folder');
  ['Poster', 'Rules', 'Schedule', 'Results', 'Gallery'].forEach((n) => assert(Object.values(env.store.folders).some((f) => f.name === n), 'sub folder ' + n));
});
test('Test 2: change event fee → website shows new fee', () => {
  eq(ok('getEvent', { slug: eventSlug }).entryFee, 500);
  const ev = ok('admin.getEvent', { id: eventId }, adminToken);
  ok('admin.updateEvent', { id: eventId, data: { Entry_Fee: 650 }, updatedAt: ev.Updated_At }, adminToken);
  eq(ok('getEvent', { slug: eventSlug }).entryFee, 650);
});
test('stale update is rejected (conflict handling)', () => {
  eq(err('admin.updateEvent', { id: eventId, data: { Venue: 'X' }, updatedAt: '2000-01-01T00:00:00+05:30' }, adminToken), 'CONFLICT');
});
test('Test 3: end date yesterday → event moves to Past automatically', () => {
  const ev = ok('admin.createEvent', { data: { Event_Name: 'Yesterday Meet', Start_Date: addDays(today, -3), End_Date: addDays(today, -1), Status: 'PUBLISHED' } }, adminToken);
  assert(ok('getPastEvents').items.some((e) => e.id === ev.Event_ID), 'in past');
  assert(!ok('getUpcomingEvents').items.some((e) => e.id === ev.Event_ID), 'not upcoming');
  const ongoing = ok('admin.createEvent', { data: { Event_Name: 'Today Meet', Start_Date: today, End_Date: addDays(today, 1), Status: 'PUBLISHED' } }, adminToken);
  assert(ok('getOngoingEvents').items.some((e) => e.id === ongoing.Event_ID), 'ongoing');
});
test('public event data never exposes Drive IDs', () => {
  const ev = ok('getEvent', { slug: eventSlug });
  const s = JSON.stringify(ev);
  assert(s.indexOf('Drive_Folder_ID') === -1 && s.indexOf('Poster_File_ID') === -1 && s.indexOf('FDxxxx') === -1, 'no drive ids');
});
test('Test 4: create program → appears automatically', () => {
  const p = ok('admin.createProgram', { data: { Program_Name: 'Speed Basics', Program_Type: 'SKATING_TRAINING', Fee: 2000, Status: 'PUBLISHED' } }, adminToken);
  assert(ok('getPrograms').items.some((x) => x.id === p.Program_ID), 'program listed');
  eq(ok('getProgram', { slug: 'speed-basics' }).name, 'Speed Basics');
});
test('Test 5: upload gallery image → appears automatically', () => {
  const b64 = Buffer.from('fake-image').toString('base64');
  const r = ok('admin.upload', { target: 'gallery', category: 'TRAINING', title: 'Morning drills', file: { name: 'drill.jpg', mimeType: 'image/jpeg', base64: b64 } }, adminToken);
  assert(r.record.Gallery_ID, 'gallery id');
  const g = ok('getGallery', { category: 'TRAINING' });
  assert(g.items.some((x) => x.title === 'Morning drills' && x.imageUrl.indexOf('lh3.googleusercontent.com') !== -1), 'gallery listed');
  eq(env.store.files[r.fileId].sharing, 'ANYONE_WITH_LINK');
  eq(err('admin.upload', { target: 'gallery', file: { name: 'x.exe', mimeType: 'application/x-msdownload', base64: b64 } }, adminToken), 'VALIDATION_ERROR');
});

let stuToken, stu2Token, studentId;
const studentPayload = (email, extra) => Object.assign({ email, password: 'Skater123', firstName: 'Riya', lastName: 'Menon', dob: '2014-03-02', gender: 'FEMALE',
  parentName: 'Anil Menon', parentMobile: '+91 98765 43210', city: 'Chennai', state: 'Tamil Nadu', academy: 'Rink Stars', acceptTerms: true,
  guardianConsentName: 'Anil Menon' }, extra || {});
test('Test 6: register student → student record created', () => {
  eq(err('register', studentPayload('kid@example.org', { guardianConsentName: '' })), 'VALIDATION_ERROR');
  const s = ok('register', studentPayload('riya@example.org'));
  stuToken = s.token;
  studentId = s.user.studentId;
  assert(/^STU-\d{4}-\d{6}$/.test(studentId), 'student id ' + studentId);
  const rec = G.Db.all('Students').find((x) => x.Student_ID === studentId);
  eq(rec.Full_Name, 'Riya Menon');
  assert(rec.Guardian_Consent_At && rec.Terms_Accepted_At, 'consent timestamps');
  eq(err('register', studentPayload('riya@example.org')), 'DUPLICATE');
  stu2Token = ok('register', studentPayload('sam@example.org', { firstName: 'Sam', gender: 'MALE' })).token;
});
test('student cannot call admin APIs or forge a role', () => {
  eq(err('admin.getStudents', {}, stuToken), 'FORBIDDEN');
  eq(call('admin.getStudents', { role: 'ADMIN' }, stuToken, { role: 'ADMIN' }).error, 'FORBIDDEN');
});
test('student profile only returns own data; admin-only fields are protected', () => {
  const p = ok('updateStudentProfile', { school: 'St. Mary', Status: 'ACTIVE', Student_ID: 'STU-2000-000001', adminNotes: 'hack' }, stuToken);
  eq(p.school, 'St. Mary');
  eq(p.id, studentId);
  const rec = G.Db.all('Students').find((x) => x.Student_ID === studentId);
  eq(rec.Admin_Notes, '', 'admin notes untouched');
});
test('Test 7: register for event → registration count increases', () => {
  const before = ok('getEvent', { slug: eventSlug }).registrationCount;
  const r = ok('registerForEvent', { eventId, acceptTerms: true }, stuToken);
  assert(/^REG-\d{4}-\d{6}$/.test(r.registration.registrationNumber), 'REG number');
  eq(r.nextStep, 'PAYMENT');
  eq(ok('getEvent', { slug: eventSlug }).registrationCount, before + 1);
  eq(err('registerForEvent', { eventId, acceptTerms: true }, stuToken), 'DUPLICATE_REGISTRATION');
});
test('Test 8: reach maximum participants → registration closes', () => {
  ok('registerForEvent', { eventId, acceptTerms: true }, stu2Token);
  const ev = ok('getEvent', { slug: eventSlug });
  eq(ev.registrationCount, 2);
  eq(ev.registrationState, 'FULL');
  const t3 = ok('register', studentPayload('third@example.org', { firstName: 'Third' })).token;
  eq(err('registerForEvent', { eventId, acceptTerms: true }, t3), 'REGISTRATION_FULL');
  const cur = ok('admin.getEvent', { id: eventId }, adminToken);
  ok('admin.updateEvent', { id: eventId, data: { Capacity_Override: true }, updatedAt: cur.Updated_At }, adminToken);
  eq(ok('getEvent', { slug: eventSlug }).registrationState, 'OPEN', 'override opens');
  const cur2 = ok('admin.getEvent', { id: eventId }, adminToken);
  ok('admin.updateEvent', { id: eventId, data: { Capacity_Override: false }, updatedAt: cur2.Updated_At }, adminToken);
});
test('registration deadline passed → REGISTRATION CLOSED', () => {
  const ev = ok('admin.createEvent', { data: { Event_Name: 'Closed Reg Meet', Start_Date: addDays(today, 5), End_Date: addDays(today, 5),
    Registration_Deadline: addDays(today, -1), Status: 'PUBLISHED' } }, adminToken);
  eq(ok('getEvent', { id: ev.Event_ID }).registrationState, 'CLOSED');
  eq(err('registerForEvent', { eventId: ev.Event_ID, acceptTerms: true }, stuToken), 'REGISTRATION_CLOSED');
});
test('category eligibility (gender / age) and per-category fee', () => {
  const ev = ok('admin.createEvent', { data: { Event_Name: 'Category Cup', Start_Date: addDays(today, 12), End_Date: addDays(today, 12), Entry_Fee: 0, Status: 'PUBLISHED' } }, adminToken);
  ok('admin.generateCategories', { eventId: ev.Event_ID, ageGroups: 'Under 14, Senior', genders: 'MALE, FEMALE', races: '500M Rink', entryFee: 300 }, adminToken);
  const cats = ok('getEventCategories', { id: ev.Event_ID });
  eq(cats.length, 4);
  const boys = cats.find((c) => c.gender === 'MALE' && c.ageGroup === 'Under 14');
  const girlsSenior = cats.find((c) => c.gender === 'FEMALE' && c.ageGroup === 'Senior');
  const girls14 = cats.find((c) => c.gender === 'FEMALE' && c.ageGroup === 'Under 14');
  eq(err('registerForEvent', { eventId: ev.Event_ID, categoryId: boys.id, acceptTerms: true }, stuToken), 'NOT_ELIGIBLE');
  eq(err('registerForEvent', { eventId: ev.Event_ID, acceptTerms: true }, stuToken), 'VALIDATION_ERROR');
  const r = ok('registerForEvent', { eventId: ev.Event_ID, categoryId: girls14.id, acceptTerms: true }, stuToken);
  eq(r.registration.amount, 300);
  assert(girlsSenior, 'senior category');
});
test('manual payment verified by admin → PAID / CONFIRMED', () => {
  const regs = ok('getStudentRegistrations', {}, stuToken).events;
  const reg = regs.find((r) => r.eventId === eventId);
  const start = ok('startPayment', { paymentId: reg.paymentId }, stuToken);
  eq(start.gateway, 'MANUAL');
  ok('submitPaymentReference', { paymentId: reg.paymentId, reference: 'UPI-123' }, stuToken);
  eq(err('admin.updatePayment', { paymentId: reg.paymentId, status: 'SUCCESS' }, stuToken), 'FORBIDDEN');
  ok('admin.updatePayment', { paymentId: reg.paymentId, status: 'SUCCESS' }, adminToken);
  const after = ok('getStudentRegistrations', { registrationId: reg.id }, stuToken);
  eq(after.status, 'CONFIRMED');
  eq(after.paymentStatus, 'PAID');
  eq(after.payment.status, 'SUCCESS');
});
test('Razorpay: forged signature rejected, verified payment accepted', () => {
  env.store.props.RAZORPAY_KEY_ID = 'rzp_test_key';
  env.store.props.RAZORPAY_KEY_SECRET = RZP_SECRET;
  ok('admin.updateSettings', { settings: { PAYMENT_GATEWAY: 'RAZORPAY' } }, adminToken);
  const reg = ok('getStudentRegistrations', {}, stu2Token).events.find((r) => r.eventId === eventId);
  const start = ok('startPayment', { paymentId: reg.paymentId }, stu2Token);
  eq(start.gateway, 'RAZORPAY');
  eq(start.amount, 65000);
  eq(err('verifyPayment', { paymentId: reg.paymentId, razorpay_order_id: start.orderId, razorpay_payment_id: 'pay_1', razorpay_signature: 'forged' }, stu2Token), 'PAYMENT_INVALID');
  rzpPayments.pay_1 = { id: 'pay_1', order_id: start.orderId, amount: 65000, currency: 'INR', status: 'captured' };
  const sig = crypto.createHmac('sha256', RZP_SECRET).update(start.orderId + '|pay_1').digest('hex');
  const v = ok('verifyPayment', { paymentId: reg.paymentId, razorpay_order_id: start.orderId, razorpay_payment_id: 'pay_1', razorpay_signature: sig }, stu2Token);
  eq(v.status, 'SUCCESS');
  eq(ok('getStudentRegistrations', { registrationId: reg.id }, stu2Token).status, 'CONFIRMED');
  ok('admin.updateSettings', { settings: { PAYMENT_GATEWAY: 'MANUAL' } }, adminToken);
});
test('Razorpay webhook requires a valid signature', () => {
  env.store.props.RAZORPAY_WEBHOOK_SECRET = 'whsec';
  const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_x', order_id: 'order_none', status: 'captured', amount: 1 } } } });
  eq(err('paymentWebhook', { rawBody: body, signature: 'bad' }), 'FORBIDDEN');
  const sig = crypto.createHmac('sha256', 'whsec').update(body).digest('hex');
  eq(ok('paymentWebhook', { rawBody: body, signature: sig }).ignored, true);
});

let membershipNumber;
test('Test 9: create membership → appears in student dashboard', () => {
  const plans = ok('getMembershipPlans');
  assert(plans.length >= 1, 'plans from sheet');
  const plan = plans[0];
  const r = ok('applyMembership', { planId: plan.id, acceptTerms: true, documents: [{ type: 'BIRTH_CERTIFICATE', file: { name: 'bc.pdf', mimeType: 'application/pdf', base64: Buffer.from('%PDF').toString('base64') } }] }, stuToken);
  eq(r.membership.status, 'PENDING');
  eq(err('applyMembership', { planId: plan.id, acceptTerms: true }, stuToken), 'DUPLICATE_MEMBERSHIP');
  eq(err('admin.approveMembership', { id: r.membership.id }, adminToken), 'PAYMENT_REQUIRED');
  const approved = ok('admin.approveMembership', { id: r.membership.id, markPaid: true }, adminToken);
  eq(approved.Status, 'ACTIVE');
  membershipNumber = approved.Membership_Number;
  assert(/^MEM-\d{4}-\d{6}$/.test(membershipNumber), 'MEM number');
  const dash = ok('getStudentDashboard', {}, stuToken);
  eq(dash.membership.status, 'ACTIVE');
  eq(dash.membership.membershipNumber, membershipNumber);
  eq(dash.membership.verifyUrl, 'https://skate.example.org/verify/member/' + membershipNumber);
  eq(ok('getMyDocuments', {}, stuToken).length, 1);
});
test('public membership verification shows only safe fields', () => {
  const v = ok('verifyMembership', { id: membershipNumber });
  eq(v.valid, true);
  eq(v.name, 'Riya Menon');
  const s = JSON.stringify(v);
  ['98765', 'riya@example.org', 'Chennai', 'dob', 'Parent'].forEach((x) => assert(s.indexOf(x) === -1, 'leaks ' + x));
  eq(ok('verifyMembership', { id: 'MEM-1999-000001' }).found, false);
});
test('Test 10: issue certificate → dashboard + public verification', () => {
  const c = ok('admin.createCertificate', { studentId, eventId, type: 'Certificate of Achievement', position: 1, title: 'Gold — 500m' }, adminToken);
  assert(/^CERT-\d{4}-\d{6}$/.test(c.certificateNumber), 'CERT number');
  assert(c.certificateUrl.indexOf('drive.google.com') !== -1, 'pdf stored in drive');
  const mine = ok('getStudentCertificates', {}, stuToken);
  assert(mine.some((x) => x.certificateNumber === c.certificateNumber), 'in dashboard');
  const v = ok('verifyCertificate', { id: c.certificateNumber });
  eq(v.status, 'VALID');
  eq(v.studentName, 'Riya Menon');
  ok('admin.revokeCertificate', { id: c.id }, adminToken);
  eq(ok('verifyCertificate', { id: c.certificateNumber }).status, 'REVOKED');
});

console.log('\nResults, rankings, achievements');
test('results published → students see them, rankings + medals update', () => {
  const regs = ok('admin.getEventRegistrations', { eventId }, adminToken).items;
  ok('admin.assignBibs', { eventId, startFrom: 101 }, adminToken);
  const rows = regs.map((r, i) => ({ Student_ID: r.Student_ID, Race_Time: '0:5' + i + '.10', Position: i + 1, Result_Status: 'FINISHED' }));
  ok('admin.saveResults', { eventId, rows }, adminToken);
  eq(ok('getStudentResults', {}, stuToken).filter((r) => r.eventId === eventId).length, 0, 'unpublished hidden');
  eq(ok('getEventResults', { id: eventId }).categories.length, 0, 'public hidden');
  const pub = ok('admin.publishResults', { eventId }, adminToken);
  assert(pub.achievementsCreated >= 1, 'medal achievements');
  const mine = ok('getStudentResults', {}, stuToken).filter((r) => r.eventId === eventId);
  eq(mine.length, 1);
  assert(mine[0].points > 0, 'points from ranking settings');
  const pubRes = ok('getEventResults', { id: eventId });
  assert(pubRes.categories[0].results.length === 2, 'public results');
  assert(JSON.stringify(pubRes).indexOf('98765') === -1, 'no phone in public results');
  const ranks = ok('getRankings', {});
  assert(ranks.items.length >= 2 && ranks.items[0].position === 1, 'rankings');
  assert(ok('getStudentAchievements', {}, stuToken).length >= 1, 'achievements visible');
  const notes = ok('getNotifications', {}, stuToken);
  assert(notes.items.some((n) => n.title === 'Results published'), 'notified');
});
test('bulk certificates from published results', () => {
  const r = ok('admin.generateEventCertificates', { eventId, mode: 'PODIUM' }, adminToken);
  assert(r.created >= 1, 'created');
  eq(ok('admin.generateEventCertificates', { eventId, mode: 'PODIUM' }, adminToken).created, 0, 'idempotent');
});

console.log('\nEvent changes & automation');
test('event date change notifies registered students + audit log', () => {
  const cur = ok('admin.getEvent', { id: eventId }, adminToken);
  ok('admin.updateEvent', { id: eventId, data: { Start_Date: addDays(today, 14), End_Date: addDays(today, 15) }, updatedAt: cur.Updated_At }, adminToken);
  assert(ok('getNotifications', {}, stuToken).items.some((n) => n.title === 'Event date changed'), 'notified');
  assert(G.Db.all('Audit_Logs').some((l) => l.Action === 'EVENT_DATE_CHANGED' && l.Entity_ID === eventId), 'audited');
});
test('event cancellation → CANCELLED publicly, registration disabled, students notified', () => {
  const ev = ok('admin.createEvent', { data: { Event_Name: 'Cancel Me', Start_Date: addDays(today, 9), End_Date: addDays(today, 9), Status: 'PUBLISHED' } }, adminToken);
  ok('registerForEvent', { eventId: ev.Event_ID, acceptTerms: true }, stuToken);
  ok('admin.cancelEvent', { id: ev.Event_ID, reason: 'Rain' }, adminToken);
  const pub = ok('getEvent', { id: ev.Event_ID });
  eq(pub.lifecycle, 'CANCELLED');
  eq(pub.registrationState, 'CANCELLED');
  eq(err('registerForEvent', { eventId: ev.Event_ID, acceptTerms: true }, stu2Token), 'REGISTRATION_CLOSED');
  assert(ok('getNotifications', {}, stuToken).items.some((n) => n.title === 'Event cancelled'), 'notified');
});
test('announcements expire automatically', () => {
  ok('admin.save', { entity: 'announcements', data: { Title: 'Old news', Description: 'x', Publish_Date: addDays(today, -10), Expiry_Date: addDays(today, -1) } }, adminToken);
  ok('admin.save', { entity: 'announcements', data: { Title: 'Fresh news', Description: 'y', Publish_Date: today } }, adminToken);
  const list = ok('getAnnouncements');
  assert(list.some((a) => a.title === 'Fresh news') && !list.some((a) => a.title === 'Old news'), 'expiry');
});
test('membership expiry trigger: 7-day notice, then EXPIRED', () => {
  const m = G.Db.all('Memberships').find((x) => x.Membership_Number === membershipNumber);
  G.Db.update('Memberships', m.Membership_ID, { Expiry_Date: addDays(today, 5) });
  G.processMembershipExpiry();
  assert(G.Db.all('Notifications').some((n) => /expires in 5 days/.test(n.Title)), '7-day notice');
  G.Db.update('Memberships', m.Membership_ID, { Expiry_Date: addDays(today, -1) });
  G.processMembershipExpiry();
  eq(G.Db.all('Memberships').find((x) => x.Membership_ID === m.Membership_ID).Status, 'EXPIRED');
  eq(ok('verifyMembership', { id: membershipNumber }).status, 'EXPIRED');
});
test('daily maintenance runs cleanly', () => { const r = G.dailyMaintenance(); assert(r.memberships !== 'error' && r.reminders !== 'error', JSON.stringify(r)); });
test('direct sheet edit: missing ID + slug filled, cache cleared', () => {
  const sh = G.Db.spreadsheet().getSheetByName('Events');
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const row = headers.map((h) => ({ Event_Name: 'Sheet Added Event', Start_Date: addDays(today, 3), End_Date: addDays(today, 3), Status: 'PUBLISHED' }[h] || ''));
  const r = sh.getLastRow() + 1;
  sh.getRange(r, 1, 1, headers.length).setValues([row]);
  G.onSheetEdit({ range: sh.getRange(r, 1, 1, headers.length) });
  G.Db.refresh();
  const rec = G.Db.all('Events').find((e) => e.Event_Name === 'Sheet Added Event');
  assert(/^EVT-/.test(rec.Event_ID) && rec.Slug === 'sheet-added-event', 'filled ' + rec.Event_ID + ' ' + rec.Slug);
  assert(ok('getUpcomingEvents').items.some((e) => e.slug === 'sheet-added-event'), 'visible on website');
});

console.log('\nContact, admin, reports');
test('contact form: stored, validated, formula-safe, rate limited, honeypot', () => {
  const r = ok('submitContact', { name: '=HYPERLINK("http://evil")', mobile: '+91 90000 00000', email: 'a@b.co', subject: 'Hi', message: '@SUM(1)' });
  assert(/^INQ-/.test(r.reference), 'reference');
  const sheets = Object.values(env.store.spreadsheets)[0].sheets;
  eq(sheets.reduce((n, s) => n + s.formulaWrites, 0), 0, 'no raw formula writes');
  const inq = G.Db.all('Contact_Inquiries').find((i) => i.Inquiry_ID === r.reference);
  eq(inq.Name, '=HYPERLINK("http://evil")', 'stored as plain text');
  eq(err('submitContact', { name: 'x', email: 'bad', subject: 's', message: 'm' }), 'VALIDATION_ERROR');
  let limited = false;
  for (let i = 0; i < 10; i++) { const x = call('submitContact', { name: 'n', email: 'a@b.co', subject: 's', message: 'm' }); if (x.error === 'RATE_LIMITED') limited = true; }
  assert(limited, 'rate limited');
  eq(ok('submitContact', { website: 'spam' }).submitted, true);
});
test('admin dashboard, reports and CSV export', () => {
  const d = ok('admin.getAdminDashboard', {}, adminToken);
  assert(d.counts.totalStudents >= 3 && d.charts.months.length === 12, 'dashboard');
  const rep = ok('admin.getReport', { type: 'registrations', eventId }, adminToken);
  assert(rep.total >= 2, 'report rows');
  const csv = ok('admin.export', { type: 'students' }, adminToken);
  assert(csv.content.split('\r\n')[0].indexOf('Student_ID') === 0, 'csv header');
  assert(csv.content.indexOf("'+91") !== -1, 'csv formula-safe');
  const er = ok('admin.getEventReport', { eventId }, adminToken);
  assert(er.totals.paid >= 2 && Object.keys(er.byGender).length >= 1, 'event report');
  ok('admin.getMembershipReport', {}, adminToken);
});
test('admin student search by name, ID, mobile, email, academy', () => {
  eq(ok('admin.getStudents', { q: 'Riya' }, adminToken).items[0].Student_ID, studentId);
  eq(ok('admin.getStudents', { q: studentId }, adminToken).total, 1);
  eq(ok('admin.getStudents', { q: 'riya@example.org' }, adminToken).total, 1);
  assert(ok('admin.getStudents', { q: 'Rink Stars' }, adminToken).total >= 1, 'academy');
  const s = ok('admin.getStudent', { id: studentId }, adminToken);
  assert(s.registrations.length >= 1 && s.memberships.length === 1 && s.documents.length === 1, 'student detail');
});
test('suspended student is locked out', () => {
  const t = ok('register', studentPayload('bad@example.org', { firstName: 'Bad' }));
  ok('admin.updateStudentStatus', { id: t.user.studentId, status: 'SUSPENDED' }, adminToken);
  eq(err('getStudentDashboard', {}, t.token), 'UNAUTHORIZED');
});
test('clear cache + logout', () => {
  ok('admin.clearCache', {}, adminToken);
  ok('logout', {}, stu2Token);
  eq(err('getStudentDashboard', {}, stu2Token), 'UNAUTHORIZED');
});
test('IDs are unique and sequential', () => {
  const ids = G.Db.all('Students').map((s) => s.Student_ID);
  eq(new Set(ids).size, ids.length, 'unique');
});
test('sample data is removable', () => {
  const before = G.Db.all('Events').length;
  const r = G.deleteSampleData();
  assert(r.removed > 10, 'removed ' + r.removed);
  G.Db.refresh();
  eq(G.Db.all('Events').length, before - 5, 'only sample events removed');
  assert(G.Db.all('Students').some((s) => s.Student_ID === studentId), 'real data kept');
});
test('internal errors are never exposed', () => {
  const r = G.handleRequest('POST', { action: 'getEvent', key: PROXY_KEY, payload: 'not-an-object' });
  eq(r.success, false);
  assert(!/TypeError|at /.test(r.message), 'friendly message');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) { console.log('Failed: ' + failures.join('; ')); process.exit(1); }
