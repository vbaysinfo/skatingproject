/**
 * Student.gs — student records and every authenticated student action.
 * All reads are scoped to ctx.student.Student_ID (never to IDs sent by the client).
 */

const STUDENT_EDITABLE = ['First_Name', 'Last_Name', 'DOB', 'Gender', 'Parent_Name', 'Parent_Mobile', 'School', 'Class', 'Address',
  'City', 'State', 'Pincode', 'Academy_Name', 'Experience_Level', 'Emergency_Contact_Name', 'Emergency_Contact_Phone'];

/** Maps camelCase form payloads to sheet columns. */
function studentFieldsFromPayload(p) {
  const map = {
    firstName: 'First_Name', lastName: 'Last_Name', dob: 'DOB', gender: 'Gender', parentName: 'Parent_Name', parentMobile: 'Parent_Mobile',
    email: 'Email', school: 'School', className: 'Class', address: 'Address', city: 'City', state: 'State', pincode: 'Pincode',
    academy: 'Academy_Name', academyId: 'Academy_ID', experienceLevel: 'Experience_Level', emergencyContactName: 'Emergency_Contact_Name',
    emergencyContactPhone: 'Emergency_Contact_Phone', status: 'Status', adminNotes: 'Admin_Notes',
  };
  const out = {};
  Object.keys(p || {}).forEach(function (k) {
    if (map[k]) out[map[k]] = p[k];
    else if (SCHEMA.Students.indexOf(k) !== -1) out[k] = p[k];
  });
  if (out.DOB !== undefined) out.DOB = toDateKey(out.DOB);
  if (out.Gender !== undefined) out.Gender = normalizeGender(out.Gender);
  Object.keys(out).forEach(function (k) { if (typeof out[k] === 'string') out[k] = out[k].trim(); });
  return out;
}

function validateStudentFields(f, isCreate) {
  const rules = {
    First_Name: (isCreate ? 'required|' : '') + 'max:80', Last_Name: 'max:80', DOB: (isCreate ? 'required|' : '') + 'date',
    Gender: (isCreate ? 'required|' : '') + 'in:MALE,FEMALE,OTHER', Parent_Mobile: 'mobile', Email: 'email',
    Emergency_Contact_Phone: 'mobile', Pincode: 'max:10', Address: 'max:500',
  };
  if (isCreate) { rules.Parent_Name = 'required|max:120'; rules.Parent_Mobile = 'required|mobile'; rules.City = 'required|max:80'; rules.State = 'required|max:80'; }
  validate(f, rules);
  if (f.DOB) {
    const age = ageOn(f.DOB, todayKey());
    if (age === null || age < 2 || age > 100) fail('VALIDATION_ERROR', 'Please enter a valid date of birth.');
  }
}

/** Creates a student row + Drive folders. Used by registration and admin. */
function createStudentRecord(p, opts) {
  opts = opts || {};
  const f = studentFieldsFromPayload(p);
  validateStudentFields(f, true);
  const age = ageOn(f.DOB, todayKey());
  if (!opts.byAdmin) {
    if (!toBool(p.acceptTerms)) fail('VALIDATION_ERROR', 'Please accept the association terms and conditions.');
    if (age < 18 && !str(p.guardianConsentName)) fail('VALIDATION_ERROR', 'Parent/guardian consent is required for athletes under 18.');
  }
  const id = generateID('Students');
  const status = opts.byAdmin ? (upper(f.Status) || 'ACTIVE') : (toBool(getSettingValue('STUDENT_AUTO_APPROVE', 'TRUE')) ? 'ACTIVE' : 'PENDING');
  const rec = Object.assign({}, f, {
    Student_ID: id, User_ID: opts.userId || '', Full_Name: (str(f.First_Name) + ' ' + str(f.Last_Name)).trim(),
    Email: str(f.Email).toLowerCase(), Status: status,
    Terms_Accepted_At: toBool(p.acceptTerms) ? nowIso() : '',
    Guardian_Consent_Name: str(p.guardianConsentName), Guardian_Consent_At: str(p.guardianConsentName) ? nowIso() : '',
  });
  let folder = null;
  try { folder = ensureStudentFolders(id); } catch (e) { console.warn('Student folder: ' + e); }
  if (folder) rec.Drive_Folder_ID = folder.getId();
  const saved = Db.insert('Students', rec);
  if (p.photo && p.photo.base64) {
    try { setStudentPhoto(saved, p.photo); } catch (e) { console.warn('Photo upload failed: ' + e); }
  }
  return saved;
}

function setStudentPhoto(student, file) {
  ensureStudentFolders(student.Student_ID);
  const up = saveUpload(file, 'STUDENTS/' + student.Student_ID + '/Photo', {
    allowedTypes: IMAGE_TYPES, public: true, maxBytes: 5 * 1024 * 1024, prefix: 'photo', replaceFileId: student.Photo_File_ID,
  });
  return Db.update('Students', student.Student_ID, { Photo_URL: up.url, Photo_File_ID: up.fileId });
}

/** Full profile for the owner/admin (private fields included, Drive IDs excluded). */
function serializeStudentPrivate(s) {
  return {
    id: s.Student_ID, userId: s.User_ID, firstName: s.First_Name, lastName: s.Last_Name, fullName: s.Full_Name, dob: toDateKey(s.DOB),
    age: ageOn(toDateKey(s.DOB), todayKey()), gender: s.Gender, parentName: s.Parent_Name, parentMobile: s.Parent_Mobile, email: s.Email,
    school: s.School, className: s.Class, address: s.Address, city: s.City, state: s.State, pincode: s.Pincode, academy: s.Academy_Name,
    academyId: s.Academy_ID, experienceLevel: s.Experience_Level, photoUrl: driveImageUrl(s.Photo_URL, 400), status: s.Status,
    emergencyContactName: s.Emergency_Contact_Name, emergencyContactPhone: s.Emergency_Contact_Phone,
    termsAcceptedAt: s.Terms_Accepted_At, guardianConsentName: s.Guardian_Consent_Name, guardianConsentAt: s.Guardian_Consent_At,
    createdAt: s.Created_At, updatedAt: s.Updated_At,
  };
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

function actionGetStudentProfile(p, ctx) {
  return serializeStudentPrivate(requireStudent(ctx));
}

function actionUpdateStudentProfile(p, ctx) {
  const student = requireStudent(ctx);
  const f = studentFieldsFromPayload(p);
  const patch = {};
  STUDENT_EDITABLE.forEach(function (k) { if (f[k] !== undefined) patch[k] = f[k]; });
  validateStudentFields(patch, false);
  if (patch.First_Name !== undefined || patch.Last_Name !== undefined) {
    const fn = patch.First_Name !== undefined ? patch.First_Name : student.First_Name;
    const ln = patch.Last_Name !== undefined ? patch.Last_Name : student.Last_Name;
    if (!str(fn)) fail('VALIDATION_ERROR', 'First name is required.');
    patch.Full_Name = (str(fn) + ' ' + str(ln)).trim();
  }
  let updated = Db.update('Students', student.Student_ID, patch, { expectedUpdatedAt: p.updatedAt });
  if (p.photo && p.photo.base64) updated = setStudentPhoto(updated, p.photo);
  writeAuditLog(ctx, 'UPDATE_PROFILE', 'Student', student.Student_ID, student, updated);
  clearCacheForSheets(['Students']);
  return serializeStudentPrivate(updated);
}

/* ------------------------------------------------------------------ */
/* Dashboard + lists                                                   */
/* ------------------------------------------------------------------ */

function studentMembershipList(studentId) {
  const plans = indexBy(Db.all('Membership_Plans'), 'Plan_ID');
  return Db.where('Memberships', function (m) { return m.Student_ID === studentId; }).map(function (m) {
    return serializeMembership(m, plans[m.Plan_ID]);
  }).sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
}

function studentResultList(studentId, publishedOnly) {
  const events = indexBy(Db.all('Events'), 'Event_ID');
  const cats = indexBy(Db.all('Event_Categories'), 'Category_ID');
  return Db.where('Results', function (r) { return r.Student_ID === studentId && (!publishedOnly || toBool(r.Published)); }).map(function (r) {
    const ev = events[r.Event_ID] || {}, c = cats[r.Category_ID] || {};
    return {
      id: r.Result_ID, eventId: r.Event_ID, eventName: ev.Event_Name || '', eventSlug: ev.Slug || '', eventDate: toDateKey(ev.Start_Date),
      categoryId: r.Category_ID, categoryName: c.Category_Name || '', raceType: c.Race_Type || '', distance: c.Distance || '',
      bib: r.Bib_Number, heat: r.Heat, lane: r.Lane, time: r.Race_Time, position: toNumber(r.Position, 0) || null,
      points: toNumber(r.Points, 0), status: upper(r.Result_Status) || 'FINISHED',
    };
  }).sort(function (a, b) { return String(b.eventDate).localeCompare(String(a.eventDate)); });
}

function studentCertificateList(studentId) {
  const events = indexBy(Db.all('Events'), 'Event_ID');
  const certs = indexBy(Db.all('Certifications'), 'Certification_ID');
  return Db.where('Student_Certifications', function (c) { return c.Student_ID === studentId && upper(c.Status) !== 'DRAFT'; }).map(function (c) {
    return serializeCertificate(c, events[c.Event_ID], certs[c.Certification_ID]);
  }).sort(function (a, b) { return String(b.issueDate).localeCompare(String(a.issueDate)); });
}

function studentAchievementList(studentId) {
  const events = indexBy(Db.all('Events'), 'Event_ID');
  return Db.where('Achievements', function (a) { return a.Student_ID === studentId && upper(a.Status || 'ACTIVE') === 'ACTIVE'; }).map(function (a) {
    return {
      id: a.Achievement_ID, type: upper(a.Achievement_Type), title: a.Title, description: a.Description, position: a.Position,
      date: toDateKey(a.Date), imageUrl: driveImageUrl(a.Image_URL, 600), eventId: a.Event_ID,
      eventName: (events[a.Event_ID] || {}).Event_Name || '',
    };
  }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
}

function studentRegistrationList(studentId) {
  const events = indexBy(Db.all('Events'), 'Event_ID');
  const cats = indexBy(Db.all('Event_Categories'), 'Category_ID');
  const results = {};
  Db.where('Results', function (r) { return r.Student_ID === studentId && toBool(r.Published); }).forEach(function (r) {
    results[r.Event_ID + '|' + r.Category_ID] = { time: r.Race_Time, position: toNumber(r.Position, 0) || null, status: upper(r.Result_Status), points: toNumber(r.Points, 0) };
  });
  return Db.where('Event_Registrations', function (r) { return r.Student_ID === studentId; }).map(function (r) {
    return serializeRegistration(r, events[r.Event_ID], cats[r.Category_ID], null, results[r.Event_ID + '|' + r.Category_ID] || null);
  }).sort(function (a, b) { return String(b.eventStart).localeCompare(String(a.eventStart)); });
}

function actionGetStudentDashboard(p, ctx) {
  const student = requireStudent(ctx);
  const sid = student.Student_ID;
  const memberships = studentMembershipList(sid);
  const regs = studentRegistrationList(sid);
  const results = studentResultList(sid, true);
  const certs = studentCertificateList(sid);
  const achievements = studentAchievementList(sid);
  const current = memberships.filter(function (m) { return m.status === 'ACTIVE'; })[0] || memberships[0] || null;
  const upcomingRegs = regs.filter(function (r) { return (r.lifecycle === 'UPCOMING' || r.lifecycle === 'ONGOING') && r.status !== 'CANCELLED'; });
  const medals = { gold: 0, silver: 0, bronze: 0 };
  results.forEach(function (r) {
    if (r.status !== 'FINISHED') return;
    if (r.position === 1) medals.gold++; else if (r.position === 2) medals.silver++; else if (r.position === 3) medals.bronze++;
  });
  const bests = {};
  results.forEach(function (r) {
    if (r.status !== 'FINISHED' || !r.time) return;
    const key = [r.raceType, r.distance].filter(Boolean).join(' ') || r.categoryName;
    const secs = raceTimeSeconds(r.time);
    if (secs !== null && (!bests[key] || secs < bests[key].seconds)) bests[key] = { race: key, time: r.time, seconds: secs, eventName: r.eventName };
  });
  const openEvents = queryPublicEvents({ tab: 'CURRENT', pageSize: 6 }).items;
  const activity = [];
  regs.slice(0, 10).forEach(function (r) { activity.push({ type: 'REGISTRATION', title: 'Registered for ' + r.eventName, date: r.registrationDate }); });
  results.slice(0, 10).forEach(function (r) { activity.push({ type: 'RESULT', title: 'Result published: ' + r.eventName + (r.position ? ' — #' + r.position : ''), date: r.eventDate }); });
  certs.slice(0, 10).forEach(function (c) { activity.push({ type: 'CERTIFICATE', title: 'Certificate issued: ' + c.title, date: c.issueDate }); });
  achievements.slice(0, 10).forEach(function (a) { activity.push({ type: 'ACHIEVEMENT', title: a.title, date: a.date }); });
  activity.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  const unread = Db.where('Notifications', function (n) { return n.User_ID === ctx.user.User_ID && upper(n.Read_Status) !== 'READ'; }).length;
  return {
    student: serializeStudentPrivate(student),
    membership: current,
    stats: {
      upcomingEvents: upcomingRegs.length, registeredEvents: regs.filter(function (r) { return r.status !== 'CANCELLED'; }).length,
      certificates: certs.filter(function (c) { return c.status === 'ISSUED'; }).length, achievements: achievements.length,
      medals: medals, unreadNotifications: unread,
    },
    personalBests: Object.keys(bests).map(function (k) { return bests[k]; }).slice(0, 6),
    upcomingRegistrations: upcomingRegs.slice(0, 5),
    openEvents: openEvents,
    recentActivity: activity.slice(0, 10),
  };
}

function raceTimeSeconds(t) {
  const s = str(t);
  if (!s) return null;
  const parts = s.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  return parts.reduce(function (acc, v) { return acc * 60 + v; }, 0);
}

function actionGetStudentMembership(p, ctx) {
  const student = requireStudent(ctx);
  return { memberships: studentMembershipList(student.Student_ID), plans: publicPlans(), student: serializeStudentPrivate(student) };
}

function actionGetStudentEvents(p, ctx) {
  const student = requireStudent(ctx);
  const regs = studentRegistrationList(student.Student_ID);
  const registeredIds = {};
  regs.forEach(function (r) { if (r.status !== 'CANCELLED') registeredIds[r.eventId] = true; });
  const upcoming = queryPublicEvents({ tab: 'CURRENT', pageSize: 50 }).items.map(function (e) {
    return Object.assign({}, e, { isRegistered: !!registeredIds[e.id] });
  });
  return {
    upcoming: upcoming,
    registered: regs.filter(function (r) { return r.lifecycle !== 'PAST' && r.status !== 'CANCELLED'; }),
    past: regs.filter(function (r) { return r.lifecycle === 'PAST'; }),
  };
}

function actionGetStudentRegistrations(p, ctx) {
  const student = requireStudent(ctx);
  const regs = studentRegistrationList(student.Student_ID);
  if (p.registrationId) {
    const r = regs.filter(function (x) { return x.id === str(p.registrationId); })[0];
    if (!r) fail('NOT_FOUND', 'Registration not found.');
    r.payment = serializePayment(r.paymentId ? Db.byId('Payments', r.paymentId) : null);
    r.student = { name: student.Full_Name, id: student.Student_ID, email: student.Email };
    return r;
  }
  const programs = indexBy(Db.all('Programs'), 'Program_ID');
  const programRegs = Db.where('Program_Registrations', function (r) { return r.Student_ID === student.Student_ID; }).map(function (r) {
    const pr = programs[r.Program_ID] || {};
    return { id: r.Program_Registration_ID, programId: r.Program_ID, programName: pr.Program_Name || '', programSlug: pr.Slug || '',
      status: r.Status, paymentId: r.Payment_ID, date: toDateKey(r.Registration_Date) };
  });
  return { events: regs, programs: programRegs };
}

function actionGetStudentResults(p, ctx) { return studentResultList(requireStudent(ctx).Student_ID, true); }
function actionGetStudentCertificates(p, ctx) { return studentCertificateList(requireStudent(ctx).Student_ID); }
function actionGetStudentAchievements(p, ctx) { return studentAchievementList(requireStudent(ctx).Student_ID); }

function actionGetStudentPayments(p, ctx) {
  const student = requireStudent(ctx);
  return Db.where('Payments', function (x) { return x.Student_ID === student.Student_ID; }).map(serializePayment)
    .sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

function actionGetNotifications(p, ctx) {
  const user = requireUser(ctx);
  const list = Db.where('Notifications', function (n) { return n.User_ID === user.User_ID; }).map(function (n) {
    return { id: n.Notification_ID, title: n.Title, message: n.Message, type: n.Type, relatedId: n.Related_ID,
      read: upper(n.Read_Status) === 'READ', createdAt: n.Created_At };
  }).sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
  return paginate(list, p.page, p.pageSize || 30);
}

function actionMarkNotificationRead(p, ctx) {
  const user = requireUser(ctx);
  const ids = p.all ? Db.where('Notifications', function (n) { return n.User_ID === user.User_ID && upper(n.Read_Status) !== 'READ'; })
    .map(function (n) { return n.Notification_ID; }) : [str(p.notificationId)];
  ids.forEach(function (id) {
    const n = Db.byId('Notifications', id);
    if (n && n.User_ID === user.User_ID) Db.update('Notifications', id, { Read_Status: 'READ' });
  });
  return { updated: ids.length };
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

const DOCUMENT_KINDS = ['BIRTH_CERTIFICATE', 'STUDENT_ID', 'PHOTO', 'MEDICAL_CONSENT', 'ADDRESS_PROOF', 'OTHER'];

function saveStudentDocument(student, file, docType, uploadedBy) {
  ensureStudentFolders(student.Student_ID);
  const type = DOCUMENT_KINDS.indexOf(upper(docType)) !== -1 ? upper(docType) : 'OTHER';
  const up = saveUpload(file, 'STUDENTS/' + student.Student_ID + '/Documents', { allowedTypes: DOCUMENT_TYPES, prefix: type });
  return Db.insert('Student_Documents', {
    Document_ID: generateID('Student_Documents'), Student_ID: student.Student_ID, Document_Type: type, File_Name: up.name,
    Mime_Type: file.mimeType, Drive_File_ID: up.fileId, Status: 'SUBMITTED', Uploaded_By: uploadedBy, Created_At: nowIso(),
  });
}

function serializeDocument(d) {
  return { id: d.Document_ID, type: d.Document_Type, fileName: d.File_Name, mimeType: d.Mime_Type, status: d.Status, createdAt: d.Created_At };
}

function actionGetMyDocuments(p, ctx) {
  const student = requireStudent(ctx);
  return Db.where('Student_Documents', function (d) { return d.Student_ID === student.Student_ID && upper(d.Status) !== 'DELETED'; }).map(serializeDocument);
}

function actionUploadMyDocument(p, ctx) {
  const student = requireStudent(ctx);
  rateLimit('upload:' + student.Student_ID, 30, 3600);
  return serializeDocument(saveStudentDocument(student, p.file, p.documentType, ctx.user.User_ID));
}

/** Streams a private document to its owner or an admin as base64. */
function actionDownloadDocument(p, ctx) {
  requireUser(ctx);
  const d = Db.byId('Student_Documents', str(p.documentId));
  if (!d) fail('NOT_FOUND', 'Document not found.');
  const isOwner = ctx.student && ctx.student.Student_ID === d.Student_ID;
  if (!isOwner && ctx.user.Role !== 'ADMIN') fail('FORBIDDEN', 'You do not have access to this document.');
  const blob = DriveApp.getFileById(d.Drive_File_ID).getBlob();
  return { fileName: d.File_Name, mimeType: blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) };
}

/* ------------------------------------------------------------------ */
/* Membership application                                              */
/* ------------------------------------------------------------------ */

function serializeMembership(m, plan) {
  plan = plan || {};
  const verifyUrl = m.Membership_Number ? (siteUrl() + '/verify/member/' + m.Membership_Number) : '';
  return {
    id: m.Membership_ID, membershipNumber: m.Membership_Number, planId: m.Plan_ID, planName: plan.Plan_Name || '',
    planType: plan.Plan_Type || '', startDate: toDateKey(m.Start_Date), expiryDate: toDateKey(m.Expiry_Date), status: upper(m.Status),
    paymentId: m.Payment_ID, cardUrl: m.Card_URL, verifyUrl: m.QR_Code || verifyUrl, approvedDate: toDateKey(m.Approved_Date),
    remarks: m.Remarks, createdAt: m.Created_At, fee: toNumber(plan.Fee, 0),
  };
}

function actionApplyMembership(p, ctx) {
  const student = requireStudent(ctx);
  if (!toBool(p.acceptTerms)) fail('VALIDATION_ERROR', 'Please accept the terms and conditions.');
  const plan = Db.byId('Membership_Plans', str(p.planId));
  if (!plan || upper(plan.Status) !== 'ACTIVE') fail('NOT_FOUND', 'This membership plan is not available.');
  const result = withLock(function () {
    Db.refresh('Memberships');
    const open = Db.where('Memberships', function (m) {
      return m.Student_ID === student.Student_ID && ['PENDING', 'ACTIVE', 'SUSPENDED'].indexOf(upper(m.Status)) !== -1;
    });
    const today = todayKey();
    const blocking = open.filter(function (m) {
      if (upper(m.Status) !== 'ACTIVE') return true;
      // An active membership in its final 30 days may be renewed.
      return !m.Expiry_Date || daysBetween(today, toDateKey(m.Expiry_Date)) > 30;
    });
    if (blocking.length) fail('DUPLICATE_MEMBERSHIP', 'You already have a ' + upper(blocking[0].Status).toLowerCase() + ' membership.');
    const m = Db.insert('Memberships', {
      Membership_ID: generateID('Memberships'), Student_ID: student.Student_ID, Plan_ID: plan.Plan_ID, Membership_Number: '',
      Start_Date: '', Expiry_Date: '', Payment_ID: '', Status: 'PENDING', Remarks: 'Application submitted',
    });
    const pay = createPaymentRecord({ type: 'MEMBERSHIP', amount: plan.Fee, userId: ctx.user.User_ID, studentId: student.Student_ID,
      membershipId: m.Membership_ID, remarks: plan.Plan_Name });
    Db.update('Memberships', m.Membership_ID, { Payment_ID: pay.Payment_ID });
    return { m: m, pay: pay };
  });
  (p.documents || []).slice(0, 5).forEach(function (doc) {
    if (doc && doc.file && doc.file.base64) saveStudentDocument(student, doc.file, doc.type, ctx.user.User_ID);
  });
  if (upper(result.pay.Payment_Status) === 'SUCCESS' && toBool(getSettingValue('MEMBERSHIP_AUTO_APPROVE', 'FALSE'))) {
    activateMembership(Db.byId('Memberships', result.m.Membership_ID), ctx, 'AUTO');
  }
  writeAuditLog(ctx, 'CREATE_MEMBERSHIP', 'Membership', result.m.Membership_ID, null, { Plan_ID: plan.Plan_ID });
  return {
    membership: serializeMembership(Db.byId('Memberships', result.m.Membership_ID), plan),
    payment: serializePayment(Db.byId('Payments', result.pay.Payment_ID)),
    nextStep: upper(result.pay.Payment_Status) === 'SUCCESS' ? 'AWAITING_APPROVAL' : 'PAYMENT',
  };
}

/** Assigns membership number, validity and QR verification URL. */
function activateMembership(m, ctx, approvedBy) {
  const plan = Db.byId('Membership_Plans', m.Plan_ID) || {};
  const today = todayKey();
  const months = Math.max(1, toNumber(plan.Duration_Months, 12));
  const number = m.Membership_Number || generateID('MembershipNumber');
  const verify = siteUrl() + '/verify/member/' + number;
  const updated = Db.update('Memberships', m.Membership_ID, {
    Membership_Number: number, Start_Date: today, Expiry_Date: addDays(addMonths(today, months), -1), Status: 'ACTIVE',
    QR_Code: verify, Card_URL: siteUrl() + '/dashboard/membership', Approved_By: approvedBy || (ctx && ctx.user ? ctx.user.User_ID : 'SYSTEM'),
    Approved_Date: today, Remarks: 'Approved',
  });
  notifyStudent(m.Student_ID, 'Membership approved', 'Your ' + (plan.Plan_Name || '') + ' membership is active. Membership number: ' + number,
    'MEMBERSHIP', m.Membership_ID);
  writeAuditLog(ctx, 'APPROVE_MEMBERSHIP', 'Membership', m.Membership_ID, m, updated);
  clearCacheForSheets(['Memberships']);
  return updated;
}

/* ------------------------------------------------------------------ */
/* Program registration                                                */
/* ------------------------------------------------------------------ */

function actionRegisterForProgram(p, ctx) {
  const student = requireStudent(ctx);
  const prog = Db.byId('Programs', str(p.programId));
  if (!prog || upper(prog.Status) !== 'PUBLISHED') fail('NOT_FOUND', 'Program not found.');
  if (upper(prog.Registration_Status || 'OPEN') !== 'OPEN') fail('REGISTRATION_CLOSED', 'Registration for this program is closed.');
  const res = withLock(function () {
    Db.refresh('Program_Registrations');
    const dup = Db.where('Program_Registrations', function (r) {
      return r.Program_ID === prog.Program_ID && r.Student_ID === student.Student_ID && upper(r.Status) !== 'CANCELLED';
    })[0];
    if (dup) fail('DUPLICATE_REGISTRATION', 'You are already registered for this program.');
    const fee = toNumber(prog.Fee, 0);
    const reg = Db.insert('Program_Registrations', {
      Program_Registration_ID: generateID('Program_Registrations'), Program_ID: prog.Program_ID, Student_ID: student.Student_ID,
      Registration_Date: todayKey(), Payment_ID: '', Status: fee > 0 ? 'PENDING_PAYMENT' : 'CONFIRMED',
    });
    const pay = createPaymentRecord({ type: 'PROGRAM', amount: fee, userId: ctx.user.User_ID, studentId: student.Student_ID,
      programId: prog.Program_ID, programRegistrationId: reg.Program_Registration_ID, remarks: prog.Program_Name });
    Db.update('Program_Registrations', reg.Program_Registration_ID, { Payment_ID: pay.Payment_ID });
    return { reg: reg, pay: pay };
  });
  if (upper(res.pay.Payment_Status) === 'SUCCESS') {
    notifyUser(ctx.user.User_ID, 'Program registration confirmed', 'You are registered for ' + prog.Program_Name + '.', 'PROGRAM', res.reg.Program_Registration_ID);
  }
  return {
    registration: { id: res.reg.Program_Registration_ID, programId: prog.Program_ID, programName: prog.Program_Name, status: res.reg.Status },
    payment: serializePayment(res.pay),
    nextStep: upper(res.pay.Payment_Status) === 'SUCCESS' ? 'CONFIRMED' : 'PAYMENT',
  };
}
