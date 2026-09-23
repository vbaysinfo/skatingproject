/**
 * Public.gs — public (unauthenticated) API actions. Only published records
 * and safe fields are returned: no phone numbers, emails, addresses,
 * documents, payment details or Drive IDs.
 */

function publicSettings() {
  return cached('settings', 'public', function () {
    const map = getSettingsMap();
    const out = {};
    PUBLIC_SETTING_KEYS.forEach(function (k) { out[k] = map[k] === undefined ? '' : map[k]; });
    ['SITE_LOGO', 'HERO_IMAGE', 'ABOUT_IMAGE'].forEach(function (k) { out[k] = driveImageUrl(out[k], k === 'SITE_LOGO' ? 400 : 2000); });
    out.PAYMENT_GATEWAY = paymentGateway();
    out.GOOGLE_CLIENT_ID = prop(PROP.GOOGLE_CLIENT_ID);
    out.APP_VERSION = APP_VERSION;
    return out;
  });
}

function actionGetSettings() { return publicSettings(); }

/** Statistics are always calculated, never entered manually. */
function computeHomeStats() {
  return cached('home', 'stats', function () {
    const today = todayKey();
    const events = Db.where('Events', function (e) { return upper(e.Status) === 'PUBLISHED'; });
    return {
      totalStudents: Db.where('Students', function (s) { return upper(s.Status) === 'ACTIVE'; }).length,
      activeMembers: Db.where('Memberships', function (m) {
        return upper(m.Status) === 'ACTIVE' && (!m.Expiry_Date || toDateKey(m.Expiry_Date) >= today);
      }).length,
      totalEvents: events.length,
      completedEvents: events.filter(function (e) { return getEventLifecycleStatus(e, today) === 'PAST'; }).length,
      programs: Db.where('Programs', function (p) { return upper(p.Status) === 'PUBLISHED'; }).length,
      certificates: Db.where('Student_Certifications', function (c) { return upper(c.Status) === 'ISSUED'; }).length,
    };
  });
}

/** One batched request for the whole homepage. */
function actionGetHome() {
  const s = publicSettings();
  return {
    settings: s,
    hero: { title: s.HERO_TITLE, subtitle: s.HERO_SUBTITLE, image: s.HERO_IMAGE, video: s.HERO_VIDEO },
    about: { intro: s.ABOUT_INTRO, vision: s.VISION, mission: s.MISSION, image: s.ABOUT_IMAGE },
    stats: computeHomeStats(),
    upcomingEvents: queryPublicEvents({ tab: 'CURRENT', pageSize: 6 }).items.filter(function (e) { return e.lifecycle !== 'CANCELLED'; }),
    programs: publicPrograms().slice().sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); }).slice(0, 6),
    gallery: publicGalleryItems().slice().sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); }).slice(0, 8),
    videos: publicVideos().filter(function (v) { return v.featured; }).slice(0, 3),
    announcements: publicAnnouncements().slice(0, 4),
    sponsors: publicSponsors().filter(function (x) { return x.showOnHome; }),
    plans: publicPlans().slice(0, 3),
  };
}

function actionGetAbout() {
  const s = publicSettings();
  return {
    intro: s.ABOUT_INTRO, full: s.ABOUT_FULL, vision: s.VISION, mission: s.MISSION, image: s.ABOUT_IMAGE, stats: computeHomeStats(),
    sponsors: publicSponsors(),
  };
}

function actionGetPage(p) {
  const s = publicSettings();
  const key = upper(p.page);
  if (key === 'PRIVACY') return { title: 'Privacy Policy', content: s.PRIVACY_POLICY };
  if (key === 'TERMS') return { title: 'Terms & Conditions', content: s.TERMS_CONDITIONS };
  fail('NOT_FOUND', 'Page not found.');
}

/* ------------------------------------------------------------------ */
/* Programs + certifications                                           */
/* ------------------------------------------------------------------ */

function serializeProgram(p, detail) {
  const o = {
    id: p.Program_ID, name: p.Program_Name, type: upper(p.Program_Type) || 'OTHER', slug: p.Slug || slugify(p.Program_Name),
    shortDescription: p.Short_Description, imageUrl: driveImageUrl(p.Image_URL, 1200), duration: p.Duration, eligibility: p.Eligibility,
    fee: toNumber(p.Fee, 0), certification: p.Certification, location: p.Location,
    registrationStatus: upper(p.Registration_Status) || 'OPEN', featured: toBool(p.Featured), displayOrder: toNumber(p.Display_Order, 999),
  };
  if (detail) { o.fullDescription = p.Full_Description; o.schedule = p.Schedule; }
  return o;
}

function publicPrograms() {
  return cached('programs', 'list', function () {
    return Db.where('Programs', function (p) { return upper(p.Status) === 'PUBLISHED'; }).map(function (p) { return serializeProgram(p, false); })
      .sort(function (a, b) { return a.displayOrder - b.displayOrder || String(a.name).localeCompare(String(b.name)); });
  });
}

function actionGetPrograms(p) {
  let list = publicPrograms();
  const type = upper(p.type);
  if (type && type !== 'ALL') list = list.filter(function (x) { return x.type === type; });
  if (p.q) { const q = str(p.q).toLowerCase(); list = list.filter(function (x) { return (x.name + ' ' + x.shortDescription).toLowerCase().indexOf(q) !== -1; }); }
  return { items: list, certifications: publicCertifications() };
}

function actionGetProgram(p) {
  const key = str(p.slug || p.id);
  const detail = cached('programs', 'detail:' + key, function () {
    const row = Db.where('Programs', function (x) {
      return upper(x.Status) === 'PUBLISHED' && (x.Program_ID === key || (x.Slug || slugify(x.Program_Name)) === key);
    })[0];
    return row ? serializeProgram(row, true) : null;
  });
  if (!detail) throw new ApiError('NOT_FOUND', 'Program not found.', 404);
  detail.gallery = publicGalleryItems().filter(function (g) { return g.programId === detail.id; }).slice(0, 8);
  detail.related = publicPrograms().filter(function (x) { return x.id !== detail.id && x.type === detail.type; }).slice(0, 3);
  return detail;
}

function publicCertifications() {
  return cached('programs', 'certifications', function () {
    return Db.where('Certifications', function (c) { return upper(c.Status) === 'ACTIVE'; }).map(function (c) {
      return { id: c.Certification_ID, name: c.Certification_Name, type: upper(c.Certification_Type), level: c.Level,
        eligibility: c.Eligibility, duration: c.Duration, assessment: c.Assessment, fee: toNumber(c.Fee, 0),
        certificateType: c.Certificate_Type, description: c.Description, displayOrder: toNumber(c.Display_Order, 999) };
    }).sort(function (a, b) { return a.displayOrder - b.displayOrder; });
  });
}

function actionGetCertifications() { return publicCertifications(); }

/* ------------------------------------------------------------------ */
/* Gallery + videos                                                    */
/* ------------------------------------------------------------------ */

function publicGalleryItems() {
  return cached('gallery', 'all', function () {
    return Db.where('Gallery', function (g) { return upper(g.Status) === 'PUBLISHED' && (g.Image_URL || g.Drive_File_ID); }).map(function (g) {
      const src = g.Image_URL || g.Drive_File_ID;
      return { id: g.Gallery_ID, title: g.Title, category: upper(g.Category) || 'OTHER', description: g.Description,
        thumbUrl: driveImageUrl(src, 640), imageUrl: driveImageUrl(src, 2000), eventId: g.Event_ID, programId: g.Program_ID,
        featured: toBool(g.Featured), displayOrder: toNumber(g.Display_Order, 999), createdAt: g.Created_At };
    }).sort(function (a, b) { return a.displayOrder - b.displayOrder || String(b.createdAt).localeCompare(String(a.createdAt)); });
  });
}

function actionGetGallery(p) {
  let list = publicGalleryItems();
  const cat = upper(p.category);
  if (cat && cat !== 'ALL') list = list.filter(function (g) { return g.category === cat; });
  if (p.eventId) list = list.filter(function (g) { return g.eventId === str(p.eventId); });
  if (p.q) { const q = str(p.q).toLowerCase(); list = list.filter(function (g) { return (g.title + ' ' + g.description).toLowerCase().indexOf(q) !== -1; }); }
  const page = paginate(list, p.page, p.pageSize || getSettingValue('GALLERY_PAGE_SIZE', 20));
  page.categories = GALLERY_CATEGORIES;
  return page;
}

function videoEmbed(url) {
  const s = str(url);
  let m = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (m) return { provider: 'YOUTUBE', embedUrl: 'https://www.youtube-nocookie.com/embed/' + m[1], thumb: 'https://i.ytimg.com/vi/' + m[1] + '/hqdefault.jpg' };
  const id = extractDriveId(s);
  if (id) return { provider: 'DRIVE', embedUrl: 'https://drive.google.com/file/d/' + id + '/preview', thumb: 'https://lh3.googleusercontent.com/d/' + id + '=w640' };
  return { provider: 'LINK', embedUrl: s, thumb: '' };
}

function publicVideos() {
  return cached('videos', 'all', function () {
    return Db.where('Videos', function (v) { return upper(v.Status) === 'PUBLISHED' && v.Video_URL; }).map(function (v) {
      const e = videoEmbed(v.Video_URL);
      return { id: v.Video_ID, title: v.Title, category: upper(v.Category) || 'HIGHLIGHTS', description: v.Description,
        provider: e.provider, embedUrl: e.embedUrl, thumbnailUrl: driveImageUrl(v.Thumbnail_URL, 640) || e.thumb, eventId: v.Event_ID,
        featured: toBool(v.Featured), displayOrder: toNumber(v.Display_Order, 999) };
    }).sort(function (a, b) { return a.displayOrder - b.displayOrder; });
  });
}

function actionGetVideos(p) {
  let list = publicVideos();
  const cat = upper(p.category);
  if (cat && cat !== 'ALL') list = list.filter(function (v) { return v.category === cat; });
  return { items: list, categories: VIDEO_CATEGORIES };
}

/* ------------------------------------------------------------------ */
/* Membership plans, announcements, sponsors                           */
/* ------------------------------------------------------------------ */

function publicPlans() {
  return cached('plans', 'all', function () {
    return Db.where('Membership_Plans', function (p) { return upper(p.Status) === 'ACTIVE'; }).map(function (p) {
      return { id: p.Plan_ID, name: p.Plan_Name, type: upper(p.Plan_Type), description: p.Description,
        durationMonths: toNumber(p.Duration_Months, 12), fee: toNumber(p.Fee, 0), benefits: splitList(String(p.Benefits).replace(/,/g, '\n')),
        eligibility: p.Eligibility, featured: toBool(p.Featured), displayOrder: toNumber(p.Display_Order, 999) };
    }).sort(function (a, b) { return a.displayOrder - b.displayOrder || a.fee - b.fee; });
  });
}

function actionGetMembershipPlans() { return publicPlans(); }

const PRIORITY_RANK = { URGENT: 0, HIGH: 1, NORMAL: 2, MEDIUM: 2, LOW: 3 };

/** Active announcements: published, started, not expired (expiry hides automatically). */
function publicAnnouncements() {
  const all = cached('announcements', 'all', function () {
    return Db.where('Announcements', function (a) { return ['PUBLISHED', 'ACTIVE'].indexOf(upper(a.Status)) !== -1; }).map(function (a) {
      return { id: a.Announcement_ID, title: a.Title, description: a.Description, imageUrl: driveImageUrl(a.Image_URL, 1000),
        publishDate: toDateKey(a.Publish_Date), expiryDate: toDateKey(a.Expiry_Date), priority: upper(a.Priority) || 'NORMAL',
        displayOrder: toNumber(a.Display_Order, 999), linkUrl: a.Link_URL };
    });
  });
  const today = todayKey();
  return all.filter(function (a) { return (!a.publishDate || a.publishDate <= today) && (!a.expiryDate || a.expiryDate >= today); })
    .sort(function (a, b) {
      return (PRIORITY_RANK[a.priority] === undefined ? 2 : PRIORITY_RANK[a.priority]) - (PRIORITY_RANK[b.priority] === undefined ? 2 : PRIORITY_RANK[b.priority]) ||
        a.displayOrder - b.displayOrder || String(b.publishDate).localeCompare(String(a.publishDate));
    });
}

function actionGetAnnouncements() { return publicAnnouncements(); }

function publicSponsors() {
  return cached('sponsors', 'all', function () {
    return Db.where('Sponsors', function (s) { return upper(s.Status) === 'ACTIVE'; }).map(function (s) {
      return { id: s.Sponsor_ID, name: s.Sponsor_Name, logoUrl: driveImageUrl(s.Logo_URL, 400), websiteUrl: s.Website_URL,
        description: s.Description, tier: s.Tier, displayOrder: toNumber(s.Display_Order, 999),
        showOnHome: str(s.Show_On_Home) === '' ? true : toBool(s.Show_On_Home), eventIds: splitList(s.Event_IDs) };
    }).sort(function (a, b) { return a.displayOrder - b.displayOrder; });
  });
}

function actionGetSponsors() { return publicSponsors(); }

function sponsorsForEvent(eventId, sponsorIds) {
  const ids = splitList(sponsorIds);
  return publicSponsors().filter(function (s) { return ids.indexOf(s.id) !== -1 || s.eventIds.indexOf(eventId) !== -1; });
}

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */

function actionSubmitContact(p, ctx) {
  if (str(p.website)) return { submitted: true }; // honeypot: silently drop bots
  const limit = toNumber(getSettingValue('CONTACT_RATE_LIMIT', 5), 5);
  rateLimit('contact:' + ctx.clientKey, limit, 3600);
  const data = { Name: str(p.name), Mobile: str(p.mobile), Email: str(p.email).toLowerCase(), Subject: str(p.subject), Message: str(p.message) };
  validate(data, { Name: 'required|max:120', Mobile: 'mobile', Email: 'required|email|max:200', Subject: 'required|max:200', Message: 'required|max:5000' });
  if (/(https?:\/\/.*){4,}/i.test(data.Message)) fail('VALIDATION_ERROR', 'Please remove links from your message.');
  const rec = Db.insert('Contact_Inquiries', Object.assign(data, { Inquiry_ID: generateID('Contact_Inquiries'), Date: todayKey(), Status: 'NEW' }));
  return { submitted: true, reference: rec.Inquiry_ID };
}

/* ------------------------------------------------------------------ */
/* Verification (QR targets)                                           */
/* ------------------------------------------------------------------ */

function actionVerifyMembership(p, ctx) {
  rateLimit('verify:' + ctx.clientKey, 60, 60);
  const id = upper(p.id);
  const m = Db.findOne('Memberships', 'Membership_Number', id);
  if (!m) return { found: false };
  const s = Db.byId('Students', m.Student_ID) || {};
  const plan = Db.byId('Membership_Plans', m.Plan_ID) || {};
  let status = upper(m.Status);
  const expiry = toDateKey(m.Expiry_Date);
  if (status === 'ACTIVE' && expiry && expiry < todayKey()) status = 'EXPIRED';
  return { found: true, name: s.Full_Name || '', membershipType: plan.Plan_Name || plan.Plan_Type || '', memberId: m.Membership_Number,
    validFrom: toDateKey(m.Start_Date), validUntil: expiry, status: status, valid: status === 'ACTIVE' };
}

function actionVerifyCertificate(p, ctx) {
  rateLimit('verify:' + ctx.clientKey, 60, 60);
  const id = upper(p.id);
  const c = Db.findOne('Student_Certifications', 'Certificate_Number', id) || (id.length === 8 ? Db.findOne('Student_Certifications', 'Verification_Code', id) : null);
  if (!c || upper(c.Status) === 'DRAFT') return { found: false };
  const s = Db.byId('Students', c.Student_ID) || {};
  const ev = c.Event_ID ? Db.byId('Events', c.Event_ID) || {} : {};
  const cert = c.Certification_ID ? Db.byId('Certifications', c.Certification_ID) || {} : {};
  let status = upper(c.Status) === 'REVOKED' ? 'REVOKED' : 'VALID';
  const expiry = toDateKey(c.Expiry_Date);
  if (status === 'VALID' && expiry && expiry < todayKey()) status = 'EXPIRED';
  return { found: true, certificateNumber: c.Certificate_Number, studentName: s.Full_Name || '', event: ev.Event_Name || '',
    certification: cert.Certification_Name || '', achievement: certificateAchievement(c), certificateType: c.Certificate_Type,
    issueDate: toDateKey(c.Issue_Date), expiryDate: expiry, status: status, valid: status === 'VALID' };
}

/* ------------------------------------------------------------------ */
/* Rankings                                                            */
/* ------------------------------------------------------------------ */

function actionGetRankings(p) {
  const key = ['y', p.year, 'c', p.category, 'a', p.ageGroup, 'g', p.gender, 'l', p.city, 'q', p.q].join(':');
  const out = cached('rankings', key, function () {
    const events = indexBy(Db.where('Events', function (e) { return upper(e.Status) === 'PUBLISHED'; }), 'Event_ID');
    const cats = indexBy(Db.all('Event_Categories'), 'Category_ID');
    const students = indexBy(Db.all('Students'), 'Student_ID');
    const facets = { years: {}, categories: {}, ageGroups: {}, genders: {}, cities: {} };
    const rows = Db.where('Results', function (r) { return toBool(r.Published) && events[r.Event_ID]; });
    const agg = {};
    rows.forEach(function (r) {
      const ev = events[r.Event_ID], c = cats[r.Category_ID] || {}, s = students[r.Student_ID] || {};
      const year = toDateKey(ev.Start_Date).slice(0, 4);
      const catName = str(c.Race_Type || c.Category_Name);
      const gender = normalizeGender(c.Gender || s.Gender);
      facets.years[year] = true; if (catName) facets.categories[catName] = true; if (c.Age_Group) facets.ageGroups[c.Age_Group] = true;
      if (gender) facets.genders[gender] = true; if (s.City) facets.cities[s.City] = true;
      if (p.year && year !== str(p.year)) return;
      if (p.category && catName !== str(p.category)) return;
      if (p.ageGroup && str(c.Age_Group) !== str(p.ageGroup)) return;
      if (p.gender && gender !== upper(p.gender)) return;
      if (p.city && str(s.City).toLowerCase() !== str(p.city).toLowerCase()) return;
      const k = r.Student_ID;
      if (!agg[k]) agg[k] = { studentId: k, studentName: s.Full_Name || 'Athlete', academy: s.Academy_Name || '', city: s.City || '',
        category: p.category || '', points: 0, events: {}, gold: 0, silver: 0, bronze: 0, bestPosition: null };
      const a = agg[k];
      a.points += toNumber(r.Points, 0);
      a.events[r.Event_ID] = true;
      const pos = toNumber(r.Position, 0);
      if (upper(r.Result_Status || 'FINISHED') === 'FINISHED' && pos) {
        if (pos === 1) a.gold++; else if (pos === 2) a.silver++; else if (pos === 3) a.bronze++;
        if (a.bestPosition === null || pos < a.bestPosition) a.bestPosition = pos;
      }
    });
    let list = Object.keys(agg).map(function (k) { const a = agg[k]; a.events = Object.keys(a.events).length; delete a.studentId; return a; });
    list.sort(function (a, b) { return b.points - a.points || b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || String(a.studentName).localeCompare(String(b.studentName)); });
    let rank = 0, prev = null;
    list.forEach(function (a, i) { if (prev === null || a.points !== prev) { rank = i + 1; prev = a.points; } a.position = rank; });
    const f = function (o) { return Object.keys(o).sort(); };
    return { items: list.slice(0, 500), facets: { years: f(facets.years).reverse(), categories: f(facets.categories), ageGroups: f(facets.ageGroups),
      genders: f(facets.genders), cities: f(facets.cities) } };
  });
  let items = out.items;
  if (p.q) { const q = str(p.q).toLowerCase(); items = items.filter(function (x) { return (x.studentName + ' ' + x.academy).toLowerCase().indexOf(q) !== -1; }); }
  const page = paginate(items, p.page, p.pageSize || 50);
  page.facets = out.facets;
  return page;
}
