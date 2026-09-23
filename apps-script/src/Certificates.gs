/**
 * Certificates.gs — certificate records, PDF generation, QR codes and
 * automatic certificates from published results.
 */

function ordinal(n) {
  n = toNumber(n, 0);
  if (!n) return '';
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function certificateAchievement(c) {
  if (str(c.Title)) return c.Title;
  if (toNumber(c.Position, 0)) return ordinal(c.Position) + ' Place';
  return str(c.Certificate_Type) || 'Participation';
}

function serializeCertificate(c, ev, certification) {
  ev = ev || {};
  certification = certification || {};
  return {
    id: c.Student_Certification_ID, certificateNumber: c.Certificate_Number, studentId: c.Student_ID, eventId: c.Event_ID,
    eventName: ev.Event_Name || '', certificationId: c.Certification_ID, certificationName: certification.Certification_Name || '',
    type: c.Certificate_Type || certification.Certificate_Type || '', position: toNumber(c.Position, 0) || null,
    title: certificateAchievement(c), issueDate: toDateKey(c.Issue_Date), expiryDate: toDateKey(c.Expiry_Date),
    certificateUrl: c.Certificate_URL, verificationCode: c.Verification_Code, status: upper(c.Status),
    verifyUrl: siteUrl() + '/verify/certificate/' + c.Certificate_Number,
  };
}

/** Returns a PNG data URI QR code for `text` (used inside PDFs). The website renders its own QR codes. */
function generateQRCode(text) {
  const base = getSettingValue('QR_API_URL', 'https://quickchart.io/qr?size=240&margin=1&text=');
  try {
    const res = UrlFetchApp.fetch(base + encodeURIComponent(text), { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return '';
    return 'data:image/png;base64,' + Utilities.base64Encode(res.getBlob().getBytes());
  } catch (e) {
    return '';
  }
}

function escapeHtml(s) {
  return str(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDisplayDate(key) {
  if (!key) return '';
  const p = key.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return +p[2] + ' ' + names[+p[1] - 1] + ' ' + p[0];
}

function certificateHtml(c, student, ev, cat, certification) {
  const site = getSettingsMap();
  const verifyUrl = siteUrl() + '/verify/certificate/' + c.Certificate_Number;
  const qr = generateQRCode(verifyUrl);
  const logo = driveImageUrl(site.SITE_LOGO, 300);
  let body;
  if (ev && ev.Event_ID) {
    const pos = toNumber(c.Position, 0);
    body = (pos ? 'has secured <b>' + ordinal(pos) + ' place</b> in ' : 'has participated in ') +
      (cat && cat.Category_Name ? '<b>' + escapeHtml(cat.Category_Name) + '</b> at ' : '') +
      'the <b>' + escapeHtml(ev.Event_Name) + '</b> held at ' + escapeHtml([ev.Venue, ev.City].filter(Boolean).join(', ')) +
      ' on ' + formatDisplayDate(toDateKey(ev.Start_Date)) + (toDateKey(ev.End_Date) && toDateKey(ev.End_Date) !== toDateKey(ev.Start_Date) ? ' – ' + formatDisplayDate(toDateKey(ev.End_Date)) : '') + '.';
  } else if (certification && certification.Certification_ID) {
    body = 'has successfully completed the requirements of <b>' + escapeHtml(certification.Certification_Name) + '</b>' +
      (certification.Level ? ' (' + escapeHtml(certification.Level) + ')' : '') + '.';
  } else {
    body = 'is awarded <b>' + escapeHtml(certificateAchievement(c)) + '</b>.';
  }
  const heading = str(c.Certificate_Type) || (toNumber(c.Position, 0) ? 'Certificate of Achievement' : 'Certificate');
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    '@page{size:A4 landscape;margin:0}body{margin:0;font-family:Georgia,serif;color:#0f172a}' +
    '.page{width:297mm;height:210mm;box-sizing:border-box;padding:14mm;background:#fff}' +
    '.frame{height:100%;box-sizing:border-box;border:3px solid #0b3d91;outline:1px solid #f97316;outline-offset:-10px;padding:14mm 20mm;text-align:center;position:relative}' +
    '.org{font-family:Arial,sans-serif;letter-spacing:3px;font-size:13px;color:#0b3d91;font-weight:bold;text-transform:uppercase}' +
    'h1{font-size:40px;margin:10px 0 4px;color:#0b3d91;font-weight:normal;letter-spacing:1px}' +
    '.sub{font-family:Arial,sans-serif;font-size:13px;color:#64748b;letter-spacing:2px;text-transform:uppercase}' +
    '.name{font-size:36px;margin:22px 0 8px;border-bottom:1px solid #cbd5e1;display:inline-block;padding:0 30px 6px;font-style:italic}' +
    '.body{font-size:17px;line-height:1.6;max-width:210mm;margin:10px auto}' +
    '.foot{position:absolute;left:20mm;right:20mm;bottom:12mm;font-family:Arial,sans-serif;font-size:11px;color:#475569}' +
    '.foot table{width:100%}.sig{border-top:1px solid #94a3b8;padding-top:4px;width:60mm;text-align:center}' +
    '</style></head><body><div class="page"><div class="frame">' +
    (logo ? '<img src="' + escapeHtml(logo) + '" style="height:60px;margin-bottom:6px">' : '') +
    '<div class="org">' + escapeHtml(site.SITE_NAME) + '</div>' +
    '<h1>' + escapeHtml(heading) + '</h1><div class="sub">This certificate is proudly presented to</div>' +
    '<div class="name">' + escapeHtml(student.Full_Name) + '</div>' +
    '<div class="body">' + (student.Academy_Name ? 'of ' + escapeHtml(student.Academy_Name) + ' ' : '') + body + '</div>' +
    '<div class="foot"><table><tr>' +
    '<td style="text-align:left;vertical-align:bottom">Certificate No: <b>' + escapeHtml(c.Certificate_Number) + '</b><br>' +
    'Issued: ' + formatDisplayDate(toDateKey(c.Issue_Date)) + '<br>Verification code: ' + escapeHtml(c.Verification_Code) + '<br>' +
    'Verify: ' + escapeHtml(verifyUrl) + '</td>' +
    '<td style="text-align:center;vertical-align:bottom">' + (qr ? '<img src="' + qr + '" style="width:80px;height:80px">' : '') + '</td>' +
    '<td style="vertical-align:bottom" align="right"><div class="sig">' + escapeHtml(getSettingValue('CERTIFICATE_SIGNATORY', 'General Secretary')) + '</div></td>' +
    '</tr></table></div></div></div></body></html>';
}

/** Generates the PDF, saves it to /Certificates/{Student_ID}/ and stores its URL. */
function generateCertificate(certId) {
  const c = Db.byId('Student_Certifications', certId);
  if (!c) fail('NOT_FOUND', 'Certificate not found.');
  const student = Db.byId('Students', c.Student_ID);
  if (!student) fail('NOT_FOUND', 'Student not found.');
  const ev = c.Event_ID ? Db.byId('Events', c.Event_ID) : null;
  const result = c.Result_ID ? Db.byId('Results', c.Result_ID) : null;
  const cat = result && result.Category_ID ? Db.byId('Event_Categories', result.Category_ID) : null;
  const certification = c.Certification_ID ? Db.byId('Certifications', c.Certification_ID) : null;
  if (!driveConfigured()) fail('NOT_CONFIGURED', 'Drive storage is not configured.');
  const key = 'CERTIFICATES/' + c.Student_ID;
  ensureFolder(key, c.Student_ID, 'CERTIFICATES', 'CERTIFICATES_STUDENT');
  const pdf = HtmlService.createHtmlOutput(certificateHtml(c, student, ev, cat, certification)).getAs('application/pdf')
    .setName(c.Certificate_Number + '.pdf');
  const file = DriveApp.getFolderById(folderIndex()[key]).createFile(pdf);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  trashDriveFile(c.Certificate_File_ID);
  return Db.update('Student_Certifications', c.Student_Certification_ID, { Certificate_URL: file.getUrl(), Certificate_File_ID: file.getId() });
}

/**
 * Creates a certificate record (number + verification code) and optionally
 * its PDF. o = { studentId, eventId, certificationId, resultId, type, position, title, issueDate, expiryDate, status }
 */
function createCertificateRecord(o, ctx, opts) {
  opts = opts || {};
  const student = Db.byId('Students', str(o.studentId));
  if (!student) fail('VALIDATION_ERROR', 'Please choose a valid student.');
  if (o.eventId && !Db.byId('Events', str(o.eventId))) fail('VALIDATION_ERROR', 'Please choose a valid event.');
  if (o.certificationId && !Db.byId('Certifications', str(o.certificationId))) fail('VALIDATION_ERROR', 'Please choose a valid certification.');
  const rec = withLock(function () {
    if (o.resultId) {
      Db.refresh('Student_Certifications');
      const dup = Db.where('Student_Certifications', function (c) { return c.Result_ID === o.resultId && upper(c.Status) !== 'REVOKED'; })[0];
      if (dup) return dup;
    }
    return Db.insert('Student_Certifications', {
      Student_Certification_ID: generateID('Student_Certifications'), Student_ID: student.Student_ID,
      Certification_ID: str(o.certificationId), Event_ID: str(o.eventId), Result_ID: str(o.resultId),
      Issue_Date: toDateKey(o.issueDate) || todayKey(), Expiry_Date: toDateKey(o.expiryDate),
      Certificate_Number: generateID('CertificateNumber'), Certificate_URL: '', Verification_Code: randomCode(8),
      Status: upper(o.status) === 'DRAFT' ? 'DRAFT' : 'ISSUED', Certificate_Type: str(o.type) || 'Certificate of Achievement',
      Position: str(o.position), Title: str(o.title),
    });
  });
  let saved = rec;
  if (opts.generatePdf !== false && driveConfigured()) {
    try { saved = generateCertificate(rec.Student_Certification_ID); } catch (e) { logError('generateCertificate', e, ctx); }
  }
  if (upper(saved.Status) === 'ISSUED' && !opts.silent) {
    notifyStudent(student.Student_ID, 'Certificate issued', 'Certificate ' + saved.Certificate_Number + ' (' + certificateAchievement(saved) +
      ') is now available in your dashboard.', 'CERTIFICATE', saved.Student_Certification_ID, 'CERT:' + saved.Student_Certification_ID);
  }
  writeAuditLog(ctx, 'CREATE_CERTIFICATE', 'Certificate', saved.Student_Certification_ID, null, { Certificate_Number: saved.Certificate_Number, Student_ID: saved.Student_ID });
  clearCacheForSheets(['Student_Certifications']);
  return saved;
}

function actionAdminCreateCertificate(p, ctx) {
  requireAdmin(ctx);
  const rec = createCertificateRecord(p, ctx, { generatePdf: p.generatePdf !== false });
  return serializeCertificate(rec, Db.byId('Events', rec.Event_ID), Db.byId('Certifications', rec.Certification_ID));
}

function actionAdminRevokeCertificate(p, ctx) {
  requireAdmin(ctx);
  const c = Db.byId('Student_Certifications', str(p.id));
  if (!c) fail('NOT_FOUND', 'Certificate not found.');
  const updated = Db.update('Student_Certifications', c.Student_Certification_ID, { Status: 'REVOKED' });
  writeAuditLog(ctx, 'REVOKE_CERTIFICATE', 'Certificate', c.Student_Certification_ID, c, updated);
  clearCacheForSheets(['Student_Certifications']);
  return serializeCertificate(updated);
}

function actionAdminPublishCertificate(p, ctx) {
  requireAdmin(ctx);
  const c = Db.byId('Student_Certifications', str(p.id));
  if (!c) fail('NOT_FOUND', 'Certificate not found.');
  const updated = Db.update('Student_Certifications', c.Student_Certification_ID, { Status: 'ISSUED' });
  notifyStudent(c.Student_ID, 'Certificate issued', 'Certificate ' + c.Certificate_Number + ' is now available in your dashboard.',
    'CERTIFICATE', c.Student_Certification_ID, 'CERT:' + c.Student_Certification_ID);
  writeAuditLog(ctx, 'PUBLISH_CERTIFICATE', 'Certificate', c.Student_Certification_ID, c, updated);
  clearCacheForSheets(['Student_Certifications']);
  return serializeCertificate(updated);
}

function actionAdminRegenerateCertificate(p, ctx) {
  requireAdmin(ctx);
  return serializeCertificate(generateCertificate(str(p.id)));
}

/**
 * Creates certificates for an event's published results. positions: 'PODIUM'
 * (1–3), 'FINISHERS' or 'ALL'. Processes at most `limit` per call to stay
 * within Apps Script time limits; call again to continue (existing ones are skipped).
 */
function actionAdminGenerateEventCertificates(p, ctx) {
  requireAdmin(ctx);
  const ev = Db.byId('Events', str(p.eventId));
  if (!ev) fail('NOT_FOUND', 'Event not found.');
  const mode = upper(p.mode) || 'PODIUM';
  const limit = Math.min(60, toNumber(p.limit, 40));
  const existing = {};
  Db.where('Student_Certifications', function (c) { return c.Event_ID === ev.Event_ID && upper(c.Status) !== 'REVOKED'; })
    .forEach(function (c) { if (c.Result_ID) existing[c.Result_ID] = true; });
  const cats = indexBy(Db.all('Event_Categories'), 'Category_ID');
  const todo = Db.where('Results', function (r) {
    if (r.Event_ID !== ev.Event_ID || !toBool(r.Published) || existing[r.Result_ID]) return false;
    const pos = toNumber(r.Position, 0), finished = upper(r.Result_Status || 'FINISHED') === 'FINISHED';
    if (mode === 'PODIUM') return finished && pos >= 1 && pos <= 3;
    if (mode === 'FINISHERS') return finished;
    return true;
  });
  let created = 0;
  todo.slice(0, limit).forEach(function (r) {
    const pos = toNumber(r.Position, 0);
    const finishedPodium = upper(r.Result_Status || 'FINISHED') === 'FINISHED' && pos >= 1 && pos <= 3;
    createCertificateRecord({
      studentId: r.Student_ID, eventId: ev.Event_ID, resultId: r.Result_ID,
      type: finishedPodium ? 'Certificate of Achievement' : 'Certificate of Participation',
      position: finishedPodium ? pos : '',
      title: finishedPodium ? ordinal(pos) + ' Place — ' + ((cats[r.Category_ID] || {}).Category_Name || ev.Event_Name) : 'Participation — ' + ev.Event_Name,
      issueDate: todayKey(),
    }, ctx, { generatePdf: p.generatePdf !== false });
    created++;
  });
  return { created: created, remaining: Math.max(0, todo.length - created) };
}
