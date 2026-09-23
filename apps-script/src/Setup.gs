/**
 * Setup.gs — one-time system initialisation (setup wizard), sheet/header
 * creation, triggers and removable demo data.
 *
 * Run setupSystem() once from the Apps Script editor, or use the website's
 * /setup wizard (protected by the SETUP_TOKEN script property).
 */

/**
 * Editor entry point. Before running, set Script Properties:
 *   GOOGLE_DRIVE_ROOT_FOLDER_ID (required), SITE_URL, ADMIN_EMAIL, ADMIN_PASSWORD (temporary),
 *   ASSOCIATION_NAME (optional), CREATE_SAMPLE_DATA=TRUE (optional).
 */
function setupSystem() {
  const props = PropertiesService.getScriptProperties();
  const result = runSetup({
    driveRootFolderId: props.getProperty(PROP.DRIVE_ROOT_FOLDER_ID),
    associationName: props.getProperty('ASSOCIATION_NAME'),
    adminEmail: props.getProperty('ADMIN_EMAIL'),
    adminPassword: props.getProperty('ADMIN_PASSWORD'),
    siteUrl: props.getProperty(PROP.SITE_URL),
    sampleData: toBool(props.getProperty('CREATE_SAMPLE_DATA')),
  });
  props.deleteProperty('ADMIN_PASSWORD'); // never leave a plain-text password behind
  result.steps.forEach(function (s) { console.log((s.ok ? '✔ ' : '✖ ') + s.step + (s.detail ? ' — ' + s.detail : '')); });
  console.log(result.ready ? 'SYSTEM READY' : 'SETUP INCOMPLETE');
  return result;
}

function isInitialized() { return prop(PROP.INITIALIZED) === 'TRUE'; }

function actionSetupStatus() {
  return { initialized: isInitialized(), version: APP_VERSION, hasSpreadsheet: !!prop(PROP.SPREADSHEET_ID), hasDriveRoot: !!prop(PROP.DRIVE_ROOT_FOLDER_ID) };
}

/** Web wizard: requires the SETUP_TOKEN script property. Re-running is allowed (idempotent). */
function actionRunSetup(p) {
  const token = prop(PROP.SETUP_TOKEN);
  if (!token || !safeEqual(token, str(p.setupToken))) fail('FORBIDDEN', 'Invalid setup token.');
  if (isInitialized() && !toBool(p.rerun)) fail('ALREADY_INITIALIZED', 'The system is already set up.');
  return runSetup(p);
}

function runSetup(o) {
  const steps = [];
  const step = function (name, fn) {
    try { const d = fn(); steps.push({ step: name, ok: true, detail: d || '' }); return true; }
    catch (e) { steps.push({ step: name, ok: false, detail: String(e && e.message ? e.message : e) }); return false; }
  };
  const props = PropertiesService.getScriptProperties();
  let rootId = str(o.driveRootFolderId) || prop(PROP.DRIVE_ROOT_FOLDER_ID);
  rootId = extractDriveId(rootId) || rootId;

  step('Connect Google account', function () { return Session.getEffectiveUser().getEmail() || 'Authorised'; });
  const okRoot = step('Select Google Drive root folder', function () {
    if (!rootId) throw new Error('Provide the Drive root folder ID.');
    const f = DriveApp.getFolderById(rootId);
    props.setProperty(PROP.DRIVE_ROOT_FOLDER_ID, rootId);
    return f.getName();
  });
  if (!okRoot) return { ready: false, steps: steps };
  step('Create Google Spreadsheet', function () {
    let id = prop(PROP.SPREADSHEET_ID);
    if (id) { Db.setSpreadsheet(SpreadsheetApp.openById(id)); return 'Using existing spreadsheet ' + id; }
    const ss = SpreadsheetApp.create(SPREADSHEET_NAME);
    try { DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(rootId)); } catch (e) { /* stays in My Drive */ }
    props.setProperty(PROP.SPREADSHEET_ID, ss.getId());
    Db.setSpreadsheet(ss);
    return ss.getUrl();
  });
  step('Create all required sheets', function () { return createSheets() + ' sheets'; });
  step('Create headers', function () { createHeaders(); return 'Headers verified'; });
  step('Create default settings', function () { return seedDefaults(o) ; });
  step('Create Google Drive folders', function () { const idx = createDriveFolders(rootId); return Object.keys(idx).length + ' folders'; });
  step('Save IDs', function () {
    if (o.siteUrl) props.setProperty(PROP.SITE_URL, str(o.siteUrl).replace(/\/+$/, ''));
    if (!prop(PROP.API_PROXY_SECRET)) props.setProperty(PROP.API_PROXY_SECRET, randomToken());
    return 'Spreadsheet, Drive and API settings saved';
  });
  step('Create first admin', function () {
    const admins = Db.where('Users', function (u) { return u.Role === 'ADMIN'; });
    if (admins.length) return 'Admin already exists (' + admins[0].Email + ')';
    if (!o.adminEmail) throw new Error('Provide the first admin email.');
    const u = createAdminUser(o.adminEmail, o.adminPassword, o.adminName || 'Administrator');
    return u.Email + (o.adminPassword ? '' : ' (Google sign-in)');
  });
  step('Configure association details', function () {
    const s = {};
    if (o.associationName) s.SITE_NAME = str(o.associationName);
    if (o.email) s.SITE_EMAIL = str(o.email);
    if (o.phone) s.SITE_PHONE = str(o.phone);
    if (o.timezone) s.TIMEZONE = str(o.timezone);
    if (Object.keys(s).length) actionAdminUpdateSettings({ settings: s }, { user: { Role: 'ADMIN', User_ID: 'SETUP' } });
    return Object.keys(s).length ? Object.keys(s).join(', ') : 'Defaults kept';
  });
  if (toBool(o.sampleData)) step('Create sample data', function () { return createSampleData(); });
  step('Install automation triggers', function () { return installTriggers(); });
  step('Publish website', function () { props.setProperty(PROP.INITIALIZED, 'TRUE'); clearCache(); return 'Caches cleared'; });
  const ready = steps.every(function (s) { return s.ok; });
  return { ready: ready, status: ready ? 'SYSTEM READY' : 'SETUP INCOMPLETE', steps: steps, apiProxySecretSet: !!prop(PROP.API_PROXY_SECRET),
    spreadsheetUrl: prop(PROP.SPREADSHEET_ID) ? 'https://docs.google.com/spreadsheets/d/' + prop(PROP.SPREADSHEET_ID) : '' };
}

/** Creates every sheet in SCHEMA that does not exist yet. */
function createSheets() {
  const ss = Db.spreadsheet();
  let created = 0;
  Object.keys(SCHEMA).forEach(function (name) {
    if (!ss.getSheetByName(name)) { ss.insertSheet(name); created++; }
  });
  const def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);
  return created;
}

/** Writes headers (appending any new columns), freezes and formats them as text. */
function createHeaders() {
  const ss = Db.spreadsheet();
  Object.keys(SCHEMA).forEach(function (name) {
    const sh = ss.getSheetByName(name);
    const want = SCHEMA[name];
    const lastCol = sh.getLastColumn();
    const have = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
    const missing = want.filter(function (h) { return have.indexOf(h) === -1; });
    if (!have.length || (have.length === 1 && !have[0])) {
      sh.getRange(1, 1, 1, want.length).setValues([want]);
    } else if (missing.length) {
      sh.getRange(1, have.length + 1, 1, missing.length).setValues([missing]);
    }
    const cols = Math.max(sh.getLastColumn(), want.length);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, cols).setFontWeight('bold').setBackground('#0b3d91').setFontColor('#ffffff');
    if (sh.getMaxRows() > 1) sh.getRange(2, 1, sh.getMaxRows() - 1, cols).setNumberFormat('@');
  });
  Db.refresh();
}

/** Spec aliases. */
function createDriveFoldersFromProps() { return createDriveFolders(prop(PROP.DRIVE_ROOT_FOLDER_ID)); }

function seedDefaults() {
  const existing = {};
  Db.all('Settings').forEach(function (r) { existing[r.Setting_Key] = true; });
  const rows = DEFAULT_SETTINGS.filter(function (s) { return !existing[s[0]]; }).map(function (s) {
    return { Setting_ID: logId('SET'), Setting_Key: s[0], Setting_Value: s[1], Setting_Type: s[2], Description: s[3], Status: 'ACTIVE' };
  });
  Db.insertMany('Settings', rows);
  let rules = 0;
  if (!Db.all('Ranking_Settings').length) {
    const pts = [[1, 10], [2, 8], [3, 6], [4, 5], [5, 4], [6, 3], [7, 2], [8, 1]];
    withLock(function () {
      Db.insertMany('Ranking_Settings', pts.map(function (x) { return { Rule_ID: generateID('Ranking_Settings'), Position: x[0], Points: x[1], Category: '', Year: '', Status: 'ACTIVE' }; }));
    });
    rules = pts.length;
  }
  resetSettingsMemo();
  return rows.length + ' settings, ' + rules + ' ranking rules';
}

/* ------------------------------------------------------------------ */
/* Triggers                                                            */
/* ------------------------------------------------------------------ */

const TRIGGER_HANDLERS = ['dailyMaintenance', 'hourlyMaintenance', 'onSheetEdit'];

function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (TRIGGER_HANDLERS.indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dailyMaintenance').timeBased().everyDays(1).atHour(6).inTimezone(getTimezone()).create();
  ScriptApp.newTrigger('hourlyMaintenance').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('onSheetEdit').forSpreadsheet(Db.spreadsheet()).onEdit().create();
  return TRIGGER_HANDLERS.join(', ');
}

function listTriggerNames() {
  try { return ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); }); } catch (e) { return []; }
}

/* ------------------------------------------------------------------ */
/* Sample data (clearly marked and removable)                          */
/* ------------------------------------------------------------------ */

function sampleIds() { return parseJsonSafe(prop('SAMPLE_IDS'), {}); }

function rememberSample(sheet, id) {
  const ids = sampleIds();
  (ids[sheet] = ids[sheet] || []).push(id);
  PropertiesService.getScriptProperties().setProperty('SAMPLE_IDS', JSON.stringify(ids));
}

function insertSample(sheet, rec) {
  rec[PRIMARY_KEY[sheet]] = rec[PRIMARY_KEY[sheet]] || generateID(sheet);
  Db.insert(sheet, rec);
  rememberSample(sheet, rec[PRIMARY_KEY[sheet]]);
  return rec;
}

function createSampleData() {
  const t = todayKey();
  const y = t.slice(0, 4);
  const img = function (n) { return '/images/sample/gallery-' + n + '.svg'; };
  const ev = function (o) {
    const rec = Object.assign({ Event_Type: 'STATE', Status: 'PUBLISHED', Featured: 'FALSE', Registration_Override: 'AUTO', Is_Sample: 'TRUE',
      Organizer: 'Skating Association', Contact: 'events@example.org' }, o);
    rec.Event_ID = generateID('Events');
    rec.Event_Code = rec.Event_ID.replace('EVT-', 'E');
    rec.Slug = uniqueSlug('Events', rec.Event_Name);
    return insertSample('Events', rec);
  };
  const up1 = ev({ Event_Name: '1st Uttar Pradesh Speed Skating Championship ' + y, Event_Type: 'STATE', Start_Date: addDays(t, 20), End_Date: addDays(t, 21),
    Registration_Start: addDays(t, -10), Registration_Deadline: addDays(t, 15), Venue: 'KD Singh Babu Stadium', City: 'Lucknow', State: 'Uttar Pradesh',
    Entry_Fee: 1299, Maximum_Participants: 400, Featured: 'TRUE',
    Description: 'The first state-level speed skating championship for Uttar Pradesh, open to registered athletes from all districts. Rink and road races across all age groups.',
    Rules_Text: 'Helmets and protective gear are mandatory.\nAthletes must report 60 minutes before their race.\nAge is calculated on the first day of the event.',
    Schedule: addDays(t, 20) + ' | 07:00 | Reporting & kit check\n' + addDays(t, 20) + ' | 08:30 | Rink races (Under 8 – Under 12)\n' + addDays(t, 21) + ' | 08:00 | Road races & prize distribution' });
  const up2 = ev({ Event_Name: '16th Tamil Nadu Speed Skating Championship ' + y, Event_Type: 'STATE', Start_Date: addDays(t, 36), End_Date: addDays(t, 39),
    Registration_Deadline: addDays(t, 30), Venue: 'Sportify Sports Arena', City: 'Chennai', State: 'Tamil Nadu', Entry_Fee: 1399, Maximum_Participants: 600, Featured: 'TRUE',
    Description: 'Four days of rink and road racing featuring the best skaters in the state. Top finishers qualify for the national championship.' });
  const up3 = ev({ Event_Name: 'Greater Bangalore Speed Skating Championship ' + y, Event_Type: 'OPEN', Start_Date: addDays(t, 31), End_Date: addDays(t, 32),
    Registration_Deadline: addDays(t, 27), Venue: 'Kanteerava Indoor Rink', City: 'Bengaluru', State: 'Karnataka', Entry_Fee: 1499, Maximum_Participants: 300,
    Description: 'An open championship welcoming academies and clubs from across the region.' });
  const ongoing = ev({ Event_Name: 'District Skating Development Camp', Event_Type: 'TRAINING', Start_Date: addDays(t, -1), End_Date: addDays(t, 2),
    Venue: 'City Skating Rink', City: 'Chennai', State: 'Tamil Nadu', Entry_Fee: 0, Maximum_Participants: 80,
    Description: 'A four-day development camp focused on technique, starts and cornering.' });
  const past = ev({ Event_Name: 'Summer Open Speed Skating Meet ' + y, Event_Type: 'OPEN', Start_Date: addDays(t, -40), End_Date: addDays(t, -39),
    Venue: 'Nehru Stadium Rink', City: 'Coimbatore', State: 'Tamil Nadu', Entry_Fee: 999, Maximum_Participants: 200, Results_Published: 'TRUE',
    Description: 'Season opener with rink races for all age groups.' });

  const cats = {};
  [up1, up2, up3, past].forEach(function (e) {
    cats[e.Event_ID] = [];
    [['Under 10', 'MALE', '300M Rink'], ['Under 10', 'FEMALE', '300M Rink'], ['Under 14', 'MALE', '500M Rink'], ['Under 14', 'FEMALE', '500M Rink'],
      ['Senior', 'MALE', '1000M Road'], ['Senior', 'FEMALE', '1000M Road']].forEach(function (c) {
      cats[e.Event_ID].push(insertSample('Event_Categories', { Category_ID: generateID('Event_Categories'), Event_ID: e.Event_ID,
        Category_Name: c[0] + ' • ' + (c[1] === 'MALE' ? 'Boys' : 'Girls') + ' • ' + c[2], Age_Group: c[0], Gender: c[1], Race_Type: c[2],
        Distance: c[2].split('M')[0] + 'm', Entry_Fee: '', Maximum_Participants: '', Status: 'ACTIVE' }));
    });
  });

  [['Learn to Skate', 'SKATING_TRAINING', '8 weeks', 'Ages 5+', 3500, 'Foundation skills: balance, stride, stopping and safe falling.'],
    ['Competition Squad', 'COMPETITION_TRAINING', '6 months', 'Intermediate skaters', 9000, 'Race craft, starts, cornering and conditioning for competitive skaters.'],
    ['Coach Level 1 Certification', 'COACH_DEVELOPMENT', '5 days', 'Age 18+, skating experience', 6000, 'Become a certified entry-level skating coach.'],
    ['Officials & Judges Course', 'OFFICIAL_JUDGE_PROGRAM', '3 days', 'Age 18+', 3000, 'Timing, judging and race rules for technical officials.']].forEach(function (p, i) {
    insertSample('Programs', { Program_ID: generateID('Programs'), Program_Name: p[0], Program_Type: p[1], Slug: uniqueSlug('Programs', p[0]), Short_Description: p[5],
      Full_Description: p[5] + '\n\nSessions are delivered by certified coaches at affiliated rinks. Equipment guidance is provided on enrolment.',
      Image_URL: img((i % 6) + 1), Duration: p[2], Eligibility: p[3], Fee: p[4], Certification: i >= 2 ? 'Yes' : 'Participation certificate',
      Location: 'Affiliated rinks', Registration_Status: 'OPEN', Featured: i < 2 ? 'TRUE' : 'FALSE', Display_Order: i + 1, Status: 'PUBLISHED' });
  });

  [['Skill Level 1 — Basic', 'STUDENT_SKILL', 'Level 1', 'All ages', 500], ['Coach Level 1', 'COACH', 'Level 1', 'Age 18+', 6000],
    ['Technical Official', 'OFFICIAL_JUDGE', 'Level 1', 'Age 18+', 3000]].forEach(function (c, i) {
    insertSample('Certifications', { Certification_ID: generateID('Certifications'), Certification_Name: c[0], Certification_Type: c[1], Level: c[2], Eligibility: c[3],
      Duration: i === 0 ? '1 day assessment' : '5 days', Assessment: 'Practical + written', Fee: c[4], Certificate_Type: 'Digital certificate', Status: 'ACTIVE', Display_Order: i + 1 });
  });

  [['Student Membership', 'STUDENT', 1200, 'Association Membership\nCompetition Registration\nDigital ID\nCertificates\nEvent Participation\nMember Benefits', 'Students up to 18 years', 'TRUE'],
    ['Athlete Membership', 'ATHLETE', 2000, 'Everything in Student\nRanking eligibility\nNational selection pathway', 'Competitive athletes', 'FALSE'],
    ['Coach Membership', 'COACH', 2500, 'Coach listing\nCoach development workshops\nDigital ID', 'Certified coaches', 'FALSE'],
    ['Academy Affiliation', 'ACADEMY', 10000, 'Affiliation certificate\nHost sanctioned events\nBulk athlete registration', 'Registered academies', 'FALSE']].forEach(function (p, i) {
    insertSample('Membership_Plans', { Plan_ID: generateID('Membership_Plans'), Plan_Name: p[0], Plan_Type: p[1], Description: 'Annual ' + p[0].toLowerCase() + '.',
      Duration_Months: 12, Fee: p[2], Benefits: p[3], Eligibility: p[4], Featured: p[5], Status: 'ACTIVE', Display_Order: i + 1 });
  });

  insertSample('Announcements', { Announcement_ID: generateID('Announcements'), Title: 'Registrations open for the state championship',
    Description: 'Entries are now open. Early registration is recommended as categories fill quickly.', Publish_Date: t, Expiry_Date: addDays(t, 20),
    Priority: 'HIGH', Status: 'PUBLISHED', Display_Order: 1, Link_URL: '/events/' + up1.Slug });
  insertSample('Announcements', { Announcement_ID: generateID('Announcements'), Title: 'Coach certification — new batch',
    Description: 'The next Coach Level 1 batch starts next month. Limited seats.', Publish_Date: t, Expiry_Date: addDays(t, 45), Priority: 'NORMAL', Status: 'PUBLISHED', Display_Order: 2 });

  ['Rinkside Sports', 'Velocity Wheels', 'City Sports Council'].forEach(function (n, i) {
    insertSample('Sponsors', { Sponsor_ID: generateID('Sponsors'), Sponsor_Name: n, Logo_URL: '', Website_URL: '', Description: 'Sample sponsor', Display_Order: i + 1,
      Status: 'ACTIVE', Tier: i === 0 ? 'Title Partner' : 'Partner', Show_On_Home: 'TRUE' });
  });

  [['Race start — Under 14', 'EVENTS'], ['Training session', 'TRAINING'], ['Podium moment', 'AWARDS'], ['Relay handover', 'CHAMPIONSHIPS'],
    ['Young skaters', 'STUDENTS'], ['Coaches clinic', 'COACHES']].forEach(function (g, i) {
    insertSample('Gallery', { Gallery_ID: generateID('Gallery'), Title: g[0], Category: g[1], Description: 'Sample image', Image_URL: img(i + 1),
      Event_ID: i === 0 || i === 2 ? past.Event_ID : '', Display_Order: i + 1, Featured: i < 4 ? 'TRUE' : 'FALSE', Status: 'PUBLISHED' });
  });

  // Sample athletes with published results for the past event (demo rankings).
  const names = [['Aarav', 'Kumar', 'MALE', 2013], ['Diya', 'Sharma', 'FEMALE', 2013], ['Kabir', 'Iyer', 'MALE', 2012], ['Meera', 'Nair', 'FEMALE', 2012]];
  const studs = names.map(function (n) {
    return insertSample('Students', { Student_ID: generateID('Students'), First_Name: n[0], Last_Name: n[1], Full_Name: n[0] + ' ' + n[1], DOB: n[3] + '-05-10',
      Gender: n[2], Parent_Name: 'Parent of ' + n[0], Parent_Mobile: '+910000000000', Email: n[0].toLowerCase() + '.sample@example.org', City: 'Chennai',
      State: 'Tamil Nadu', Academy_Name: 'Sample Skating Academy', Experience_Level: 'Intermediate', Status: 'ACTIVE' });
  });
  const pastCats = cats[past.Event_ID];
  const rules = Db.all('Ranking_Settings');
  studs.forEach(function (s, i) {
    const cat = pastCats.filter(function (c) { return c.Age_Group === 'Under 14' && c.Gender === s.Gender; })[0];
    const reg = insertSample('Event_Registrations', { Registration_ID: generateID('Event_Registrations'), Event_ID: past.Event_ID, Student_ID: s.Student_ID,
      Category_ID: cat.Category_ID, Bib_Number: String(101 + i), Registration_Date: addDays(t, -50), Payment_Status: 'PAID', Registration_Status: 'CONFIRMED', Amount: 999 });
    Db.update('Event_Registrations', reg.Registration_ID, { Registration_Number: reg.Registration_ID });
    const pos = i < 2 ? 1 : 2;
    insertSample('Results', { Result_ID: generateID('Results'), Event_ID: past.Event_ID, Category_ID: cat.Category_ID, Student_ID: s.Student_ID,
      Bib_Number: String(101 + i), Heat: 'Final', Lane: String(i + 1), Race_Time: pos === 1 ? '0:52.41' : '0:54.10', Position: pos,
      Points: pointsFor(pos, cat.Category_Name, cat.Race_Type, y, rules), Result_Status: 'FINISHED', Published: 'TRUE' });
  });
  clearCache();
  return '5 events, 4 programs, 4 plans, 6 gallery items, 4 sample athletes';
}

/** Removes every record created by createSampleData(). */
function deleteSampleData() {
  const ids = sampleIds();
  let removed = 0;
  Object.keys(ids).forEach(function (sheet) {
    const pk = PRIMARY_KEY[sheet];
    const set = {};
    ids[sheet].forEach(function (id) { set[id] = true; });
    const t = Db.table(sheet);
    // Delete from the bottom up so row numbers stay valid.
    t.rows.filter(function (r) { return set[r[pk]]; }).map(function (r) { return r._row; }).sort(function (a, b) { return b - a; })
      .forEach(function (row) { t.sheet.deleteRow(row); removed++; });
    Db.refresh(sheet);
  });
  PropertiesService.getScriptProperties().deleteProperty('SAMPLE_IDS');
  clearCache();
  return { removed: removed };
}

function actionAdminDeleteSampleData(p, ctx) {
  requireAdmin(ctx);
  const r = deleteSampleData();
  writeAuditLog(ctx, 'DELETE_SAMPLE_DATA', 'System', '', null, r);
  return r;
}

function actionAdminCreateSampleData(p, ctx) {
  requireAdmin(ctx);
  const r = createSampleData();
  writeAuditLog(ctx, 'CREATE_SAMPLE_DATA', 'System', '', null, { result: r });
  return { created: r };
}
