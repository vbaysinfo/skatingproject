/**
 * AdminCore.gs — generic admin CRUD for content entities, uploads,
 * settings, administrators and the admin dashboard.
 *
 * Every function here starts with requireAdmin(ctx): the role is checked on
 * the server for every call, whatever the frontend shows or hides.
 */

/**
 * Content entities managed through the generic CRUD endpoints.
 * editable: columns an admin may set. required: must be non-empty.
 * slug: source column for an auto-generated unique Slug.
 */
const ENTITIES = {
  programs: {
    sheet: 'Programs', search: ['Program_Name', 'Program_Type', 'Location'], slug: 'Program_Name', tags: ['Programs'],
    editable: ['Program_Name', 'Program_Type', 'Slug', 'Short_Description', 'Full_Description', 'Image_URL', 'Duration', 'Eligibility', 'Fee',
      'Certification', 'Location', 'Registration_Status', 'Featured', 'Display_Order', 'Status', 'Schedule'],
    required: ['Program_Name', 'Program_Type'], defaults: { Status: 'DRAFT', Registration_Status: 'OPEN', Display_Order: 100 },
    numbers: ['Fee', 'Display_Order'], statuses: ['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'],
  },
  certifications: {
    sheet: 'Certifications', search: ['Certification_Name', 'Certification_Type', 'Level'], tags: ['Certifications'],
    editable: ['Certification_Name', 'Certification_Type', 'Level', 'Eligibility', 'Duration', 'Assessment', 'Fee', 'Certificate_Type', 'Status',
      'Description', 'Display_Order'],
    required: ['Certification_Name', 'Certification_Type'], defaults: { Status: 'ACTIVE', Display_Order: 100 }, numbers: ['Fee', 'Display_Order'],
    statuses: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
  },
  gallery: {
    sheet: 'Gallery', search: ['Title', 'Category', 'Description'], tags: ['Gallery'], hardDelete: true,
    editable: ['Title', 'Category', 'Description', 'Image_URL', 'Drive_File_ID', 'Event_ID', 'Program_ID', 'Display_Order', 'Featured', 'Status'],
    required: ['Title', 'Category'], defaults: { Status: 'PUBLISHED', Display_Order: 100 }, numbers: ['Display_Order'],
    statuses: ['PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'],
  },
  videos: {
    sheet: 'Videos', search: ['Title', 'Category'], tags: ['Videos'], hardDelete: true,
    editable: ['Title', 'Category', 'Description', 'Video_URL', 'Thumbnail_URL', 'Event_ID', 'Display_Order', 'Featured', 'Status'],
    required: ['Title', 'Video_URL'], defaults: { Status: 'PUBLISHED', Display_Order: 100, Category: 'HIGHLIGHTS' }, numbers: ['Display_Order'],
    statuses: ['PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'],
  },
  announcements: {
    sheet: 'Announcements', search: ['Title', 'Description'], tags: ['Announcements'],
    editable: ['Title', 'Description', 'Image_URL', 'Publish_Date', 'Expiry_Date', 'Priority', 'Display_Order', 'Status', 'Link_URL'],
    required: ['Title', 'Description'], defaults: { Status: 'PUBLISHED', Priority: 'NORMAL', Display_Order: 100 }, numbers: ['Display_Order'],
    dates: ['Publish_Date', 'Expiry_Date'], statuses: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
  },
  sponsors: {
    sheet: 'Sponsors', search: ['Sponsor_Name', 'Tier'], tags: ['Sponsors'],
    editable: ['Sponsor_Name', 'Logo_URL', 'Website_URL', 'Description', 'Display_Order', 'Status', 'Tier', 'Show_On_Home', 'Event_IDs'],
    required: ['Sponsor_Name'], defaults: { Status: 'ACTIVE', Display_Order: 100, Show_On_Home: 'TRUE' }, numbers: ['Display_Order'],
    statuses: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
  },
  membershipPlans: {
    sheet: 'Membership_Plans', search: ['Plan_Name', 'Plan_Type'], tags: ['Membership_Plans'],
    editable: ['Plan_Name', 'Plan_Type', 'Description', 'Duration_Months', 'Fee', 'Benefits', 'Eligibility', 'Featured', 'Status', 'Display_Order'],
    required: ['Plan_Name', 'Plan_Type', 'Duration_Months', 'Fee'], defaults: { Status: 'ACTIVE', Duration_Months: 12, Display_Order: 100 },
    numbers: ['Duration_Months', 'Fee', 'Display_Order'], statuses: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
  },
  rankingRules: {
    sheet: 'Ranking_Settings', search: ['Category', 'Year'], tags: ['Ranking_Settings'], hardDelete: true,
    editable: ['Position', 'Points', 'Category', 'Year', 'Status'], required: ['Position', 'Points'], defaults: { Status: 'ACTIVE' },
    numbers: ['Position', 'Points'], statuses: ['ACTIVE', 'INACTIVE'],
  },
  achievements: {
    sheet: 'Achievements', search: ['Title', 'Achievement_Type', 'Student_ID'], tags: ['Achievements'],
    editable: ['Student_ID', 'Event_ID', 'Achievement_Type', 'Title', 'Description', 'Position', 'Date', 'Image_URL', 'Status'],
    required: ['Student_ID', 'Achievement_Type', 'Title'], defaults: { Status: 'ACTIVE' }, dates: ['Date'],
    statuses: ['ACTIVE', 'HIDDEN', 'ARCHIVED'], notify: true,
  },
  eventCategories: {
    sheet: 'Event_Categories', search: ['Category_Name', 'Age_Group', 'Race_Type'], tags: ['Event_Categories'], hardDeleteIfUnused: true,
    editable: ['Event_ID', 'Category_Name', 'Age_Group', 'Gender', 'Race_Type', 'Distance', 'Entry_Fee', 'Maximum_Participants', 'Status'],
    required: ['Event_ID', 'Category_Name'], defaults: { Status: 'ACTIVE' }, numbers: ['Entry_Fee', 'Maximum_Participants'],
    statuses: ['ACTIVE', 'CLOSED', 'INACTIVE', 'ARCHIVED'],
  },
  inquiries: {
    sheet: 'Contact_Inquiries', search: ['Name', 'Email', 'Mobile', 'Subject', 'Inquiry_ID'], tags: [], noCreate: true,
    editable: ['Status', 'Admin_Notes'], required: [], defaults: {}, statuses: INQUIRY_STATUSES,
  },
  certificates: {
    sheet: 'Student_Certifications', search: ['Certificate_Number', 'Student_ID', 'Title', 'Event_ID'], tags: ['Student_Certifications'],
    noCreate: true, editable: ['Title', 'Certificate_Type', 'Position', 'Issue_Date', 'Expiry_Date'], dates: ['Issue_Date', 'Expiry_Date'],
    required: [], defaults: {}, statuses: ['DRAFT', 'ISSUED', 'REVOKED'],
  },
  auditLogs: { sheet: 'Audit_Logs', search: ['Action', 'Entity_Type', 'Entity_ID', 'User_ID'], readOnly: true, tags: [] },
  errorLogs: { sheet: 'Error_Logs', search: ['Action', 'Code', 'Message'], readOnly: true, tags: [] },
};

function entityConfig(name) {
  const cfg = ENTITIES[str(name)];
  if (!cfg) fail('VALIDATION_ERROR', 'Unknown entity.');
  return cfg;
}

function uniqueSlug(sheet, base, exceptId) {
  const pk = PRIMARY_KEY[sheet];
  const taken = {};
  Db.all(sheet).forEach(function (r) { if (r[pk] !== exceptId && r.Slug) taken[r.Slug] = true; });
  let slug = slugify(base), i = 2;
  while (taken[slug]) slug = slugify(base) + '-' + (i++);
  return slug;
}

function cleanEntityData(cfg, data) {
  const out = {};
  (cfg.editable || []).forEach(function (k) {
    if (data[k] === undefined) return;
    let v = data[k];
    if (typeof v === 'boolean') v = v ? 'TRUE' : 'FALSE';
    if (typeof v === 'string') v = v.trim();
    if ((cfg.numbers || []).indexOf(k) !== -1 && str(v) !== '') {
      if (isNaN(Number(String(v).replace(/,/g, '')))) fail('VALIDATION_ERROR', k.replace(/_/g, ' ') + ' must be a number.');
      if (Number(String(v).replace(/,/g, '')) < 0) fail('VALIDATION_ERROR', k.replace(/_/g, ' ') + ' cannot be negative.');
      v = Number(String(v).replace(/,/g, ''));
    }
    if ((cfg.dates || []).indexOf(k) !== -1 && str(v) !== '') {
      const d = toDateKey(v);
      if (!d) fail('VALIDATION_ERROR', k.replace(/_/g, ' ') + ' must be a valid date.');
      v = d;
    }
    if (k === 'Status' || /_Type$|^Category$|^Priority$|^Registration_Status$/.test(k)) v = upper(v);
    out[k] = v;
  });
  if (out.Status && cfg.statuses && cfg.statuses.indexOf(out.Status) === -1) fail('VALIDATION_ERROR', 'Invalid status.');
  return out;
}

function actionAdminList(p, ctx) {
  requireAdmin(ctx);
  const cfg = entityConfig(p.entity);
  let rows = Db.all(cfg.sheet).slice();
  if (p.status) rows = rows.filter(function (r) { return upper(r.Status) === upper(p.status); });
  else if (!p.includeArchived && Db.headers(cfg.sheet).indexOf('Status') !== -1) rows = rows.filter(function (r) { return upper(r.Status) !== 'ARCHIVED'; });
  Object.keys(p.filters || {}).forEach(function (k) {
    const v = str(p.filters[k]);
    if (v) rows = rows.filter(function (r) { return str(r[k]) === v; });
  });
  if (p.q) rows = rows.filter(function (r) { return textMatch(r, cfg.search || [PRIMARY_KEY[cfg.sheet]], p.q); });
  const sortField = p.sort || (Db.headers(cfg.sheet).indexOf('Created_At') !== -1 ? 'Created_At' : (Db.headers(cfg.sheet).indexOf('Timestamp') !== -1 ? 'Timestamp' : PRIMARY_KEY[cfg.sheet]));
  rows = sortBy(rows, sortField, p.dir || (p.sort ? 'asc' : 'desc'));
  const page = paginate(rows, p.page, p.pageSize || getSettingValue('ADMIN_PAGE_SIZE', 25));
  page.items = page.items.map(function (r) { const o = {}; Object.keys(r).forEach(function (k) { o[k] = r[k]; }); return o; });
  page.primaryKey = PRIMARY_KEY[cfg.sheet];
  return page;
}

function actionAdminGet(p, ctx) {
  requireAdmin(ctx);
  const cfg = entityConfig(p.entity);
  const r = Db.byId(cfg.sheet, str(p.id));
  if (!r) fail('NOT_FOUND', 'Record not found.');
  return Object.assign({}, r);
}

function actionAdminSave(p, ctx) {
  requireAdmin(ctx);
  const cfg = entityConfig(p.entity);
  if (cfg.readOnly) fail('NOT_ALLOWED', 'This data is read-only.');
  const data = cleanEntityData(cfg, p.data || {});
  const pk = PRIMARY_KEY[cfg.sheet];
  let saved, before = null;
  if (p.id) {
    before = Db.byId(cfg.sheet, str(p.id));
    if (!before) fail('NOT_FOUND', 'Record not found.');
    before = Object.assign({}, before);
    (cfg.required || []).forEach(function (k) { if (data[k] !== undefined && str(data[k]) === '') fail('VALIDATION_ERROR', k.replace(/_/g, ' ') + ' is required.'); });
    if (cfg.slug && (data.Slug !== undefined || data[cfg.slug] !== undefined)) {
      data.Slug = uniqueSlug(cfg.sheet, data.Slug || before.Slug || data[cfg.slug] || before[cfg.slug], before[pk]);
    }
    saved = Db.update(cfg.sheet, before[pk], data, { expectedUpdatedAt: p.updatedAt });
    writeAuditLog(ctx, 'UPDATE_' + cfg.sheet.toUpperCase(), cfg.sheet, before[pk], before, saved);
  } else {
    if (cfg.noCreate) fail('NOT_ALLOWED', 'Records of this type cannot be created here.');
    const rec = Object.assign({}, cfg.defaults || {}, data);
    (cfg.required || []).forEach(function (k) { if (str(rec[k]) === '') fail('VALIDATION_ERROR', k.replace(/_/g, ' ') + ' is required.'); });
    if (cfg.slug) rec.Slug = uniqueSlug(cfg.sheet, rec.Slug || rec[cfg.slug]);
    if (rec.Student_ID && !Db.byId('Students', rec.Student_ID)) fail('VALIDATION_ERROR', 'Unknown Student ID.');
    if (rec.Event_ID && cfg.sheet !== 'Gallery' && cfg.sheet !== 'Videos' && !Db.byId('Events', rec.Event_ID)) fail('VALIDATION_ERROR', 'Unknown Event ID.');
    saved = withLock(function () {
      rec[pk] = generateID(cfg.sheet);
      return Db.insert(cfg.sheet, rec);
    });
    if (cfg.sheet === 'Programs') { try { ensureFolder('PROGRAMS/' + saved.Program_ID, saved.Program_ID, 'PROGRAMS', 'PROGRAM'); } catch (e) { /* optional */ } }
    if (cfg.notify && saved.Student_ID) {
      notifyStudent(saved.Student_ID, 'New achievement', saved.Title, 'ACHIEVEMENT', saved[pk]);
    }
    writeAuditLog(ctx, 'CREATE_' + cfg.sheet.toUpperCase(), cfg.sheet, saved[pk], null, saved);
  }
  if (data.Drive_File_ID && cfg.sheet === 'Gallery') {
    publishDriveFile(data.Drive_File_ID);
    if (!saved.Image_URL) saved = Db.update('Gallery', saved.Gallery_ID, { Image_URL: 'https://lh3.googleusercontent.com/d/' + data.Drive_File_ID });
  }
  if (cfg.sheet === 'Gallery' && saved.Image_URL && !saved.Drive_File_ID && extractDriveId(saved.Image_URL)) {
    const id = extractDriveId(saved.Image_URL);
    publishDriveFile(id);
    saved = Db.update('Gallery', saved.Gallery_ID, { Drive_File_ID: id });
  }
  clearCacheForSheets(cfg.tags || []);
  return Object.assign({}, saved);
}

function actionAdminSetStatus(p, ctx) {
  requireAdmin(ctx);
  const cfg = entityConfig(p.entity);
  return actionAdminSave({ entity: p.entity, id: p.id, data: { Status: p.status } }, ctx);
}

/** Archives by default; physically deletes only disposable content. */
function actionAdminDelete(p, ctx) {
  requireAdmin(ctx);
  const cfg = entityConfig(p.entity);
  if (cfg.readOnly) fail('NOT_ALLOWED', 'This data is read-only.');
  const rec = Db.byId(cfg.sheet, str(p.id));
  if (!rec) fail('NOT_FOUND', 'Record not found.');
  const before = Object.assign({}, rec);
  let hard = !!cfg.hardDelete && toBool(p.permanent);
  if (cfg.hardDeleteIfUnused) {
    const used = Db.where('Event_Registrations', function (r) { return r.Category_ID === rec.Category_ID; }).length > 0;
    hard = !used;
  }
  if (hard) {
    if (cfg.sheet === 'Gallery' && toBool(p.deleteFile)) trashDriveFile(rec.Drive_File_ID);
    Db.remove(cfg.sheet, rec[PRIMARY_KEY[cfg.sheet]]);
  } else {
    Db.update(cfg.sheet, rec[PRIMARY_KEY[cfg.sheet]], { Status: 'ARCHIVED' });
  }
  writeAuditLog(ctx, (hard ? 'DELETE_' : 'ARCHIVE_') + cfg.sheet.toUpperCase(), cfg.sheet, before[PRIMARY_KEY[cfg.sheet]], before, null);
  clearCacheForSheets(cfg.tags || []);
  return { deleted: hard, archived: !hard };
}

/** Bulk status change for safe entities (e.g. publish/unpublish many gallery items). */
function actionAdminBulkStatus(p, ctx) {
  requireAdmin(ctx);
  const ids = (p.ids || []).slice(0, 200);
  ids.forEach(function (id) { actionAdminSave({ entity: p.entity, id: id, data: { Status: p.status } }, ctx); });
  return { updated: ids.length };
}

/* ------------------------------------------------------------------ */
/* Uploads                                                             */
/* ------------------------------------------------------------------ */

/**
 * target: image | eventPoster | eventRules | eventSchedule | gallery | programImage |
 * siteLogo | heroImage | aboutImage | sponsorLogo | announcementImage |
 * achievementImage | studentPhoto | studentDocument | websiteDocument
 */
function actionAdminUpload(p, ctx) {
  requireAdmin(ctx);
  const t = str(p.target), id = str(p.id), file = p.file;
  let up, rec;
  switch (t) {
    case 'eventPoster':
    case 'eventRules':
    case 'eventSchedule': {
      rec = Db.byId('Events', id);
      if (!rec) fail('NOT_FOUND', 'Event not found.');
      ensureEventFolders(id);
      const sub = t === 'eventPoster' ? 'Poster' : t === 'eventRules' ? 'Rules' : 'Schedule';
      up = saveUpload(file, 'EVENTS/' + id + '/' + sub, { allowedTypes: t === 'eventPoster' ? IMAGE_TYPES : DOCUMENT_TYPES, public: true,
        replaceFileId: t === 'eventPoster' ? rec.Poster_File_ID : t === 'eventRules' ? rec.Rules_File_ID : '' });
      const patch = t === 'eventPoster' ? { Poster_URL: up.url, Poster_File_ID: up.fileId } :
        t === 'eventRules' ? { Rules_URL: up.viewUrl, Rules_File_ID: up.fileId } : {};
      if (t === 'eventSchedule') patch.Schedule = rec.Schedule ? rec.Schedule : 'Schedule document | ' + up.viewUrl;
      Db.update('Events', id, patch);
      writeAuditLog(ctx, 'UPLOAD_' + sub.toUpperCase(), 'Event', id, null, patch);
      clearCacheForSheets(['Events']);
      break;
    }
    case 'gallery': {
      const category = upper(p.category) || 'OTHER';
      const key = p.eventId ? 'EVENTS/' + str(p.eventId) + '/Gallery' : galleryFolderKey(category);
      if (p.eventId) ensureEventFolders(str(p.eventId));
      up = saveUpload(file, key, { allowedTypes: IMAGE_TYPES, public: true });
      rec = actionAdminSave({ entity: 'gallery', data: { Title: str(p.title) || str(file.name).replace(/\.[^.]+$/, ''), Category: category,
        Description: str(p.description), Image_URL: up.url, Drive_File_ID: up.fileId, Event_ID: str(p.eventId), Program_ID: str(p.programId),
        Status: upper(p.status) || 'PUBLISHED', Featured: toBool(p.featured) ? 'TRUE' : 'FALSE' } }, ctx);
      return { url: up.url, fileId: up.fileId, record: rec };
    }
    case 'programImage':
      rec = Db.byId('Programs', id); if (!rec) fail('NOT_FOUND', 'Program not found.');
      ensureFolder('PROGRAMS/' + id, id, 'PROGRAMS', 'PROGRAM');
      up = saveUpload(file, 'PROGRAMS/' + id, { allowedTypes: IMAGE_TYPES, public: true, replaceFileId: rec.Image_File_ID });
      Db.update('Programs', id, { Image_URL: up.url, Image_File_ID: up.fileId });
      clearCacheForSheets(['Programs']);
      break;
    case 'siteLogo':
    case 'heroImage':
    case 'aboutImage': {
      const folder = t === 'siteLogo' ? 'WEBSITE/Logo' : 'WEBSITE/Hero';
      up = saveUpload(file, folder, { allowedTypes: IMAGE_TYPES, public: true });
      const key = t === 'siteLogo' ? 'SITE_LOGO' : t === 'heroImage' ? 'HERO_IMAGE' : 'ABOUT_IMAGE';
      const s = {}; s[key] = up.url;
      actionAdminUpdateSettings({ settings: s }, ctx);
      break;
    }
    case 'image':
      up = saveUpload(file, 'WEBSITE/Banners', { allowedTypes: IMAGE_TYPES, public: true, prefix: 'image' });
      break;
    case 'websiteDocument':
      up = saveUpload(file, 'WEBSITE/Documents', { allowedTypes: DOCUMENT_TYPES, public: true });
      break;
    case 'sponsorLogo':
      up = saveUpload(file, 'WEBSITE/Banners', { allowedTypes: IMAGE_TYPES.concat(['image/svg+xml']), public: true, prefix: 'sponsor' });
      if (id) { Db.update('Sponsors', id, { Logo_URL: up.url }); clearCacheForSheets(['Sponsors']); }
      break;
    case 'announcementImage':
      up = saveUpload(file, 'WEBSITE/Banners', { allowedTypes: IMAGE_TYPES, public: true, prefix: 'announcement' });
      if (id) { Db.update('Announcements', id, { Image_URL: up.url }); clearCacheForSheets(['Announcements']); }
      break;
    case 'achievementImage':
      up = saveUpload(file, 'GALLERY/AWARDS', { allowedTypes: IMAGE_TYPES, public: true, prefix: 'achievement' });
      if (id) Db.update('Achievements', id, { Image_URL: up.url });
      break;
    case 'studentPhoto':
      rec = Db.byId('Students', id); if (!rec) fail('NOT_FOUND', 'Student not found.');
      rec = setStudentPhoto(rec, file);
      return { url: driveImageUrl(rec.Photo_URL, 400) };
    case 'studentDocument':
      rec = Db.byId('Students', id); if (!rec) fail('NOT_FOUND', 'Student not found.');
      return serializeDocument(saveStudentDocument(rec, file, p.documentType, ctx.user.User_ID));
    default:
      fail('VALIDATION_ERROR', 'Unknown upload target.');
  }
  return { url: up.url, viewUrl: up.viewUrl, fileId: up.fileId };
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

function actionAdminGetSettings(p, ctx) {
  requireAdmin(ctx);
  const rows = Db.all('Settings').map(function (r) { return Object.assign({}, r); });
  const secrets = {};
  WRITABLE_SECRETS.forEach(function (k) { secrets[k] = prop(k) ? (k === PROP.SITE_URL || k === PROP.GOOGLE_CLIENT_ID || k === PROP.RAZORPAY_KEY_ID ? prop(k) : 'SET') : ''; });
  return {
    settings: rows, secrets: secrets,
    system: {
      spreadsheetId: prop(PROP.SPREADSHEET_ID), spreadsheetUrl: Db.spreadsheet().getUrl(), driveRootFolderId: prop(PROP.DRIVE_ROOT_FOLDER_ID),
      driveRootUrl: folderIndex().ROOT ? 'https://drive.google.com/drive/folders/' + folderIndex().ROOT : '',
      appVersion: APP_VERSION, timezone: getTimezone(), triggers: listTriggerNames(),
    },
  };
}

function actionAdminUpdateSettings(p, ctx) {
  requireAdmin(ctx);
  const input = p.settings || {};
  const existing = indexBy(Db.all('Settings'), 'Setting_Key');
  const toInsert = [];
  Object.keys(input).forEach(function (key) {
    if (!/^[A-Z][A-Z0-9_]{1,60}$/.test(key)) fail('VALIDATION_ERROR', 'Invalid setting key ' + key + '.');
    let value = input[key];
    if (typeof value === 'boolean') value = value ? 'TRUE' : 'FALSE';
    value = str(value);
    if (key === 'TIMEZONE') {
      try { Utilities.formatDate(new Date(), value, 'yyyy'); } catch (e) { fail('VALIDATION_ERROR', 'Invalid timezone.'); }
    }
    if (key === 'PAYMENT_GATEWAY' && ['FREE', 'MANUAL', 'RAZORPAY'].indexOf(upper(value)) === -1) fail('VALIDATION_ERROR', 'Invalid payment gateway.');
    const row = existing[key];
    if (row) {
      if (String(row.Setting_Value) !== value) {
        Db.update('Settings', row.Setting_ID, { Setting_Value: value });
        writeAuditLog(ctx, 'UPDATE_SETTING', 'Setting', key, { Setting_Value: row.Setting_Value }, { Setting_Value: value });
      }
    } else {
      const def = DEFAULT_SETTINGS.filter(function (s) { return s[0] === key; })[0];
      toInsert.push({ Setting_ID: logId('SET'), Setting_Key: key, Setting_Value: value, Setting_Type: def ? def[2] : 'TEXT',
        Description: def ? def[3] : '', Status: 'ACTIVE' });
    }
  });
  if (toInsert.length) Db.insertMany('Settings', toInsert);
  clearCacheForSheets(['Settings']);
  return { updated: Object.keys(input).length };
}

/** Writes secrets to Script Properties. Secrets are never returned. */
function actionAdminSetSecret(p, ctx) {
  requireAdmin(ctx);
  const key = str(p.key);
  if (WRITABLE_SECRETS.indexOf(key) === -1) fail('VALIDATION_ERROR', 'This value cannot be changed here.');
  if (str(p.value)) PropertiesService.getScriptProperties().setProperty(key, str(p.value));
  else PropertiesService.getScriptProperties().deleteProperty(key);
  writeAuditLog(ctx, 'UPDATE_SECRET', 'ScriptProperty', key, null, null);
  AppCache.clear(['settings']);
  return { updated: true };
}

function actionAdminClearCache(p, ctx) {
  requireAdmin(ctx);
  writeAuditLog(ctx, 'CLEAR_CACHE', 'System', '', null, null);
  return clearCache();
}

/* ------------------------------------------------------------------ */
/* Administrators                                                      */
/* ------------------------------------------------------------------ */

function actionAdminListAdmins(p, ctx) {
  requireAdmin(ctx);
  return Db.where('Users', function (u) { return u.Role === 'ADMIN'; }).map(function (u) {
    return { userId: u.User_ID, email: u.Email, name: u.Display_Name, status: u.Status, lastLogin: u.Last_Login, provider: u.Auth_Provider };
  });
}

function createAdminUser(email, password, name) {
  email = str(email).toLowerCase();
  if (!isEmail(email)) fail('VALIDATION_ERROR', 'Please enter a valid email address.');
  return withLock(function () {
    Db.refresh('Users');
    const existing = findUserByEmail(email);
    if (existing) {
      if (existing.Role === 'ADMIN') fail('DUPLICATE', 'This administrator already exists.');
      fail('DUPLICATE', 'This email belongs to a student account.');
    }
    const rec = { User_ID: generateID('Users'), Email: email, Role: 'ADMIN', Auth_Provider: password ? 'PASSWORD' : 'GOOGLE',
      Auth_Subject_ID: '', Student_ID: '', Status: 'ACTIVE', Display_Name: str(name) || email };
    if (password) {
      validatePasswordStrength(password);
      const pw = hashPassword(password);
      rec.Password_Hash = pw.hash; rec.Password_Salt = pw.salt; rec.Password_Iterations = pw.iterations;
    }
    return Db.insert('Users', rec);
  });
}

function actionAdminCreateAdmin(p, ctx) {
  requireAdmin(ctx);
  const u = createAdminUser(p.email, p.password, p.name);
  writeAuditLog(ctx, 'CREATE_ADMIN', 'User', u.User_ID, null, { Email: u.Email, Role: 'ADMIN' });
  return { userId: u.User_ID, email: u.Email };
}

function actionAdminSetAdminStatus(p, ctx) {
  requireAdmin(ctx);
  const u = Db.byId('Users', str(p.userId));
  if (!u || u.Role !== 'ADMIN') fail('NOT_FOUND', 'Administrator not found.');
  if (u.User_ID === ctx.user.User_ID) fail('NOT_ALLOWED', 'You cannot change your own access.');
  const status = upper(p.status) === 'ACTIVE' ? 'ACTIVE' : 'DISABLED';
  if (status !== 'ACTIVE') {
    const activeAdmins = Db.where('Users', function (x) { return x.Role === 'ADMIN' && upper(x.Status) === 'ACTIVE'; });
    if (activeAdmins.length <= 1) fail('NOT_ALLOWED', 'At least one active administrator is required.');
    revokeUserSessions(u.User_ID);
  }
  Db.update('Users', u.User_ID, { Status: status });
  writeAuditLog(ctx, 'SET_ADMIN_STATUS', 'User', u.User_ID, { Status: u.Status }, { Status: status });
  return { updated: true };
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

function actionGetAdminDashboard(p, ctx) {
  requireAdmin(ctx);
  const today = todayKey();
  const months = lastNMonths(12);
  const monthIndex = {};
  months.forEach(function (m, i) { monthIndex[m] = i; });
  const series = function () { return months.map(function () { return 0; }); };
  const inc = function (arr, dateStr, by) {
    const k = str(dateStr).slice(0, 7);
    if (monthIndex[k] !== undefined) arr[monthIndex[k]] += by === undefined ? 1 : by;
  };

  const students = Db.all('Students');
  const memberships = Db.all('Memberships');
  const events = Db.where('Events', function (e) { return upper(e.Status) !== 'ARCHIVED'; });
  const regs = Db.all('Event_Registrations');
  const payments = Db.all('Payments');
  const certs = Db.all('Student_Certifications');
  const inquiries = Db.all('Contact_Inquiries');
  const plans = indexBy(Db.all('Membership_Plans'), 'Plan_ID');

  const lifecycle = { UPCOMING: 0, ONGOING: 0, PAST: 0, CANCELLED: 0 };
  events.forEach(function (e) { if (upper(e.Status) !== 'DRAFT') lifecycle[getEventLifecycleStatus(e, today)]++; });

  const regSeries = series(), memSeries = series(), evSeries = series(), revSeries = series(), certSeries = series(), stuSeries = series();
  regs.forEach(function (r) { if (isActiveRegistration(r)) inc(regSeries, r.Registration_Date || r.Created_At); });
  memberships.forEach(function (m) { inc(memSeries, m.Created_At); });
  events.forEach(function (e) { inc(evSeries, toDateKey(e.Start_Date)); });
  certs.forEach(function (c) { if (upper(c.Status) === 'ISSUED') inc(certSeries, toDateKey(c.Issue_Date)); });
  students.forEach(function (s) { inc(stuSeries, s.Created_At); });
  let revenue = 0;
  payments.forEach(function (x) {
    if (upper(x.Payment_Status) === 'SUCCESS') { revenue += toNumber(x.Amount); inc(revSeries, x.Payment_Date || x.Created_At, toNumber(x.Amount)); }
  });

  const ageBuckets = { 'Under 8': 0, '8–10': 0, '11–13': 0, '14–16': 0, '17–18': 0, 'Senior': 0, 'Unknown': 0 };
  students.forEach(function (s) {
    const a = ageOn(toDateKey(s.DOB), today);
    const k = a === null ? 'Unknown' : a < 8 ? 'Under 8' : a <= 10 ? '8–10' : a <= 13 ? '11–13' : a <= 16 ? '14–16' : a <= 18 ? '17–18' : 'Senior';
    ageBuckets[k]++;
  });

  const recentRegs = regs.slice(-8).reverse().map(function (r) {
    const s = Db.byId('Students', r.Student_ID) || {}, e = Db.byId('Events', r.Event_ID) || {};
    return { id: r.Registration_ID, student: s.Full_Name || r.Student_ID, event: e.Event_Name || r.Event_ID, status: r.Registration_Status,
      payment: r.Payment_Status, date: r.Registration_Date };
  });

  return {
    counts: {
      totalStudents: students.length,
      activeStudents: students.filter(function (s) { return upper(s.Status) === 'ACTIVE'; }).length,
      pendingStudents: students.filter(function (s) { return upper(s.Status) === 'PENDING'; }).length,
      activeMembers: memberships.filter(function (m) { return upper(m.Status) === 'ACTIVE'; }).length,
      pendingMemberships: memberships.filter(function (m) { return upper(m.Status) === 'PENDING'; }).length,
      upcomingEvents: lifecycle.UPCOMING, ongoingEvents: lifecycle.ONGOING, pastEvents: lifecycle.PAST, cancelledEvents: lifecycle.CANCELLED,
      draftEvents: events.filter(function (e) { return upper(e.Status) === 'DRAFT'; }).length,
      eventRegistrations: regs.filter(isActiveRegistration).length,
      programs: Db.where('Programs', function (x) { return upper(x.Status) === 'PUBLISHED'; }).length,
      certificates: certs.filter(function (c) { return upper(c.Status) === 'ISSUED'; }).length,
      revenue: revenue,
      pendingPayments: payments.filter(function (x) { return upper(x.Payment_Status) === 'PENDING'; }).length,
      galleryItems: Db.where('Gallery', function (g) { return upper(g.Status) === 'PUBLISHED'; }).length,
      contactInquiries: inquiries.length,
      newInquiries: inquiries.filter(function (i) { return upper(i.Status) === 'NEW'; }).length,
    },
    charts: {
      months: months,
      registrations: regSeries, memberships: memSeries, events: evSeries, revenue: revSeries, certificates: certSeries, students: stuSeries,
      studentsByAge: ageBuckets,
      studentsByGender: groupCount(students, function (s) { return upper(s.Gender); }),
      eventsByType: groupCount(events, function (e) { return upper(e.Event_Type); }),
      membershipsByType: groupCount(memberships, function (m) { return upper((plans[m.Plan_ID] || {}).Plan_Type); }),
    },
    recentRegistrations: recentRegs,
    currency: getSettingValue('DEFAULT_CURRENCY', 'INR'),
  };
}
