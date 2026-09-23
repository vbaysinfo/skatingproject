/**
 * Skating Association Platform — Google Apps Script backend (single-file bundle).
 * Generated from apps-script/src by `npm run bundle:gas`. Do not edit here; edit the source files.
 *
 * Paste this whole file into Code.gs in your Apps Script project, and paste
 * appsscript.json (in this folder) into the project manifest. Then follow docs/SETUP.md.
 */

// ===================================================================
// Config.gs
// ===================================================================

/**
 * Config.gs — central configuration and database schema.
 *
 * Secrets and deployment-specific IDs live in Script Properties (never in the
 * spreadsheet). Everything the association edits lives in the Settings sheet.
 */

const APP_VERSION = '1.0.0';

/** Script Property keys (Project Settings → Script properties). */
const PROP = {
  SPREADSHEET_ID: 'GOOGLE_SHEET_ID',
  DRIVE_ROOT_FOLDER_ID: 'GOOGLE_DRIVE_ROOT_FOLDER_ID',
  API_PROXY_SECRET: 'API_PROXY_SECRET',
  SETUP_TOKEN: 'SETUP_TOKEN',
  SITE_URL: 'SITE_URL',
  GOOGLE_CLIENT_ID: 'GOOGLE_CLIENT_ID',
  RAZORPAY_KEY_ID: 'RAZORPAY_KEY_ID',
  RAZORPAY_KEY_SECRET: 'RAZORPAY_KEY_SECRET',
  RAZORPAY_WEBHOOK_SECRET: 'RAZORPAY_WEBHOOK_SECRET',
  INITIALIZED: 'SYSTEM_INITIALIZED',
  CACHE_VERSION: 'CACHE_VERSION',
};

/** Secret properties that may be written by an admin but are never returned. */
const WRITABLE_SECRETS = [
  PROP.RAZORPAY_KEY_ID,
  PROP.RAZORPAY_KEY_SECRET,
  PROP.RAZORPAY_WEBHOOK_SECRET,
  PROP.GOOGLE_CLIENT_ID,
  PROP.SITE_URL,
];

const SPREADSHEET_NAME = 'SKATING_ASSOCIATION_DATABASE';
const DEFAULT_TIMEZONE = 'Asia/Kolkata';
const SESSION_DAYS = 14;

/**
 * Sheet schema. Order of columns = order of headers in the sheet.
 * Columns listed after the columns defined in the specification are
 * extensions required by the platform (consent, overrides, heats…).
 */
const SCHEMA = {
  Settings: ['Setting_ID', 'Setting_Key', 'Setting_Value', 'Setting_Type', 'Description', 'Status', 'Updated_At'],
  Users: ['User_ID', 'Email', 'Role', 'Auth_Provider', 'Auth_Subject_ID', 'Student_ID', 'Status', 'Last_Login', 'Created_At', 'Updated_At',
    'Display_Name', 'Password_Hash', 'Password_Salt', 'Password_Iterations'],
  Sessions: ['Session_ID', 'User_ID', 'Role', 'Expires_At', 'Status', 'Created_At', 'Last_Seen_At'],
  Students: ['Student_ID', 'User_ID', 'First_Name', 'Last_Name', 'Full_Name', 'DOB', 'Gender', 'Parent_Name', 'Parent_Mobile', 'Email',
    'School', 'Class', 'Address', 'City', 'State', 'Pincode', 'Academy_ID', 'Experience_Level', 'Photo_URL', 'Drive_Folder_ID', 'Status',
    'Created_At', 'Updated_At',
    'Academy_Name', 'Emergency_Contact_Name', 'Emergency_Contact_Phone', 'Photo_File_ID', 'Terms_Accepted_At', 'Guardian_Consent_Name',
    'Guardian_Consent_At', 'Admin_Notes'],
  Student_Documents: ['Document_ID', 'Student_ID', 'Document_Type', 'File_Name', 'Mime_Type', 'Drive_File_ID', 'Status', 'Uploaded_By',
    'Created_At'],
  Events: ['Event_ID', 'Event_Code', 'Event_Name', 'Slug', 'Event_Type', 'Poster_URL', 'Poster_File_ID', 'Start_Date', 'End_Date',
    'Registration_Start', 'Registration_Deadline', 'Venue', 'City', 'State', 'Description', 'Rules_URL', 'Entry_Fee', 'Maximum_Participants',
    'Organizer', 'Contact', 'Drive_Folder_ID', 'Featured', 'Status', 'Created_At', 'Updated_At',
    'Rules_File_ID', 'Rules_Text', 'Schedule', 'Registration_Override', 'Capacity_Override', 'Allow_Duplicate_Registration',
    'Results_Published', 'Sponsor_IDs', 'Map_URL', 'Is_Sample'],
  Event_Categories: ['Category_ID', 'Event_ID', 'Category_Name', 'Age_Group', 'Gender', 'Race_Type', 'Distance', 'Entry_Fee',
    'Maximum_Participants', 'Status', 'Created_At', 'Updated_At'],
  Event_Registrations: ['Registration_ID', 'Event_ID', 'Student_ID', 'Category_ID', 'Registration_Number', 'Bib_Number', 'Registration_Date',
    'Payment_ID', 'Payment_Status', 'Registration_Status', 'Created_At', 'Updated_At',
    'Heat', 'Lane', 'Amount', 'Terms_Accepted_At', 'Remarks'],
  Membership_Plans: ['Plan_ID', 'Plan_Name', 'Plan_Type', 'Description', 'Duration_Months', 'Fee', 'Benefits', 'Eligibility', 'Featured',
    'Status', 'Created_At', 'Updated_At', 'Display_Order'],
  Memberships: ['Membership_ID', 'Student_ID', 'Plan_ID', 'Membership_Number', 'Start_Date', 'Expiry_Date', 'Payment_ID', 'Status',
    'Card_URL', 'QR_Code', 'Approved_By', 'Approved_Date', 'Created_At', 'Updated_At', 'Remarks'],
  Programs: ['Program_ID', 'Program_Name', 'Program_Type', 'Slug', 'Short_Description', 'Full_Description', 'Image_URL', 'Duration',
    'Eligibility', 'Fee', 'Certification', 'Location', 'Registration_Status', 'Featured', 'Display_Order', 'Status', 'Created_At',
    'Updated_At', 'Image_File_ID', 'Schedule'],
  Program_Registrations: ['Program_Registration_ID', 'Program_ID', 'Student_ID', 'Registration_Date', 'Payment_ID', 'Status', 'Created_At',
    'Updated_At'],
  Certifications: ['Certification_ID', 'Certification_Name', 'Certification_Type', 'Level', 'Eligibility', 'Duration', 'Assessment', 'Fee',
    'Certificate_Type', 'Status', 'Created_At', 'Updated_At', 'Description', 'Display_Order'],
  Student_Certifications: ['Student_Certification_ID', 'Student_ID', 'Certification_ID', 'Issue_Date', 'Expiry_Date', 'Certificate_Number',
    'Certificate_URL', 'Verification_Code', 'Status', 'Created_At',
    'Event_ID', 'Certificate_Type', 'Position', 'Title', 'Certificate_File_ID', 'Result_ID', 'Updated_At'],
  Results: ['Result_ID', 'Event_ID', 'Category_ID', 'Student_ID', 'Bib_Number', 'Heat', 'Lane', 'Race_Time', 'Position', 'Points',
    'Result_Status', 'Published', 'Created_At', 'Updated_At'],
  Achievements: ['Achievement_ID', 'Student_ID', 'Event_ID', 'Achievement_Type', 'Title', 'Description', 'Position', 'Date', 'Image_URL',
    'Status', 'Created_At', 'Result_ID', 'Updated_At'],
  Gallery: ['Gallery_ID', 'Title', 'Category', 'Description', 'Image_URL', 'Drive_File_ID', 'Event_ID', 'Program_ID', 'Display_Order',
    'Featured', 'Status', 'Created_At', 'Updated_At'],
  Videos: ['Video_ID', 'Title', 'Category', 'Description', 'Video_URL', 'Thumbnail_URL', 'Event_ID', 'Display_Order', 'Featured', 'Status',
    'Created_At', 'Updated_At'],
  Announcements: ['Announcement_ID', 'Title', 'Description', 'Image_URL', 'Publish_Date', 'Expiry_Date', 'Priority', 'Display_Order',
    'Status', 'Created_At', 'Link_URL', 'Updated_At'],
  Sponsors: ['Sponsor_ID', 'Sponsor_Name', 'Logo_URL', 'Website_URL', 'Description', 'Display_Order', 'Status', 'Created_At',
    'Tier', 'Show_On_Home', 'Event_IDs', 'Updated_At'],
  Contact_Inquiries: ['Inquiry_ID', 'Name', 'Mobile', 'Email', 'Subject', 'Message', 'Date', 'Status', 'Admin_Notes', 'Created_At',
    'Updated_At'],
  Payments: ['Payment_ID', 'User_ID', 'Student_ID', 'Event_ID', 'Membership_ID', 'Program_ID', 'Amount', 'Currency', 'Payment_Type',
    'Gateway', 'Transaction_ID', 'Payment_Date', 'Payment_Status', 'Gateway_Response_ID', 'Remarks', 'Created_At', 'Updated_At',
    'Gateway_Order_ID', 'Registration_ID', 'Program_Registration_ID'],
  Notifications: ['Notification_ID', 'User_ID', 'Title', 'Message', 'Type', 'Related_ID', 'Read_Status', 'Created_At', 'Dedupe_Key'],
  Ranking_Settings: ['Rule_ID', 'Position', 'Points', 'Category', 'Year', 'Status', 'Created_At', 'Updated_At'],
  Drive_Folders: ['Folder_ID', 'Folder_Type', 'Google_Drive_ID', 'Parent_Folder_ID', 'Folder_URL', 'Status', 'Created_At', 'Folder_Key'],
  Audit_Logs: ['Log_ID', 'User_ID', 'Role', 'Action', 'Entity_Type', 'Entity_ID', 'Old_Value', 'New_Value', 'Timestamp', 'IP_or_Context'],
  Error_Logs: ['Error_ID', 'Action', 'Code', 'Message', 'Stack', 'User_ID', 'Timestamp'],
};

/** Primary key column for each sheet. */
const PRIMARY_KEY = {
  Settings: 'Setting_ID', Users: 'User_ID', Sessions: 'Session_ID', Students: 'Student_ID', Student_Documents: 'Document_ID',
  Events: 'Event_ID', Event_Categories: 'Category_ID', Event_Registrations: 'Registration_ID', Membership_Plans: 'Plan_ID',
  Memberships: 'Membership_ID', Programs: 'Program_ID', Program_Registrations: 'Program_Registration_ID',
  Certifications: 'Certification_ID', Student_Certifications: 'Student_Certification_ID', Results: 'Result_ID',
  Achievements: 'Achievement_ID', Gallery: 'Gallery_ID', Videos: 'Video_ID', Announcements: 'Announcement_ID', Sponsors: 'Sponsor_ID',
  Contact_Inquiries: 'Inquiry_ID', Payments: 'Payment_ID', Notifications: 'Notification_ID', Ranking_Settings: 'Rule_ID',
  Drive_Folders: 'Folder_ID', Audit_Logs: 'Log_ID', Error_Logs: 'Error_ID',
};

/** ID prefixes. IDs look like PREFIX-2026-000001. */
const ID_PREFIX = {
  Settings: 'SET', Users: 'USR', Sessions: 'SES', Students: 'STU', Student_Documents: 'DOC', Events: 'EVT', Event_Categories: 'CAT',
  Event_Registrations: 'REG', Membership_Plans: 'PLN', Memberships: 'MSP', MembershipNumber: 'MEM', Programs: 'PRG',
  Program_Registrations: 'PGR', Certifications: 'CFN', Student_Certifications: 'SCR', CertificateNumber: 'CERT', Results: 'RES',
  Achievements: 'ACH', Gallery: 'GAL', Videos: 'VID', Announcements: 'ANN', Sponsors: 'SPN', Contact_Inquiries: 'INQ', Payments: 'PAY',
  Notifications: 'NTF', Ranking_Settings: 'RUL', Drive_Folders: 'FLD', Audit_Logs: 'LOG', Error_Logs: 'ERR',
};

/** Cache tags: which public caches must be dropped when a sheet changes. */
const SHEET_CACHE_TAGS = {
  Settings: ['settings', 'home', 'events', 'programs', 'gallery', 'videos', 'plans', 'announcements', 'sponsors', 'rankings'],
  Events: ['events', 'home', 'rankings'],
  Event_Categories: ['events'],
  Event_Registrations: ['events', 'home'],
  Programs: ['programs', 'home'],
  Certifications: ['programs'],
  Gallery: ['gallery', 'home'],
  Videos: ['videos', 'home'],
  Membership_Plans: ['plans', 'home'],
  Memberships: ['home'],
  Announcements: ['announcements', 'home'],
  Sponsors: ['sponsors', 'home', 'events'],
  Results: ['results', 'rankings', 'events'],
  Ranking_Settings: ['rankings'],
  Students: ['home', 'rankings'],
  Student_Certifications: ['home'],
};

/** Settings created on setup (key, default value, type, description). */
const DEFAULT_SETTINGS = [
  ['SITE_NAME', 'Skating Association', 'TEXT', 'Association name shown across the website'],
  ['SITE_SHORT_NAME', 'SKATE', 'TEXT', 'Short name / abbreviation'],
  ['SITE_TAGLINE', 'Official governing body for roller skating', 'TEXT', 'Tagline shown in the footer and metadata'],
  ['SITE_LOGO', '', 'IMAGE', 'Logo image URL'],
  ['SITE_EMAIL', 'info@example.org', 'TEXT', 'Public contact email'],
  ['SITE_PHONE', '+91 00000 00000', 'TEXT', 'Public contact phone'],
  ['SITE_ADDRESS', 'Association Office, City, State', 'LONGTEXT', 'Association address'],
  ['OFFICE_HOURS', 'Mon – Sat, 10:00 AM – 6:00 PM', 'TEXT', 'Office hours'],
  ['HERO_TITLE', 'BUILDING CHAMPIONS.\nCREATING OPPORTUNITIES.\nGROWING THE SPORT.', 'LONGTEXT', 'Homepage hero heading'],
  ['HERO_SUBTITLE', 'Competitions, training and certification for skaters of every age — from first glide to the podium.', 'LONGTEXT', 'Homepage hero subtitle'],
  ['HERO_IMAGE', '/images/hero-rink.svg', 'IMAGE', 'Homepage hero background image'],
  ['HERO_VIDEO', '', 'URL', 'Optional hero background video (MP4 URL)'],
  ['ABOUT_INTRO', 'We are the governing body for roller skating in our region, organising championships, developing coaches and officials, and creating pathways for every skater.', 'LONGTEXT', 'Short about text for the homepage'],
  ['ABOUT_FULL', 'Founded by skaters, coaches and parents, the association promotes speed, artistic and recreational skating through affiliated academies, schools and clubs. We run district, state and open championships, certify coaches and officials, and maintain transparent rankings for athletes.', 'LONGTEXT', 'Full about text'],
  ['ABOUT_IMAGE', '/images/sample/gallery-2.svg', 'IMAGE', 'About section image'],
  ['VISION', 'A skating culture where every child has access to safe, world-class training and fair competition.', 'LONGTEXT', 'Vision statement'],
  ['MISSION', 'To grow the sport through well-run events, qualified coaches and officials, recognised certification and athlete-first governance.', 'LONGTEXT', 'Mission statement'],
  ['FACEBOOK_URL', '', 'URL', 'Facebook page'],
  ['INSTAGRAM_URL', '', 'URL', 'Instagram profile'],
  ['YOUTUBE_URL', '', 'URL', 'YouTube channel'],
  ['WHATSAPP_URL', '', 'URL', 'WhatsApp link (https://wa.me/…)'],
  ['X_URL', '', 'URL', 'X / Twitter profile'],
  ['GOOGLE_MAP_URL', '', 'URL', 'Google Maps embed URL for the contact page'],
  ['DEFAULT_CURRENCY', 'INR', 'TEXT', 'Currency code'],
  ['TIMEZONE', DEFAULT_TIMEZONE, 'TEXT', 'Association timezone used for all date logic'],
  ['PAYMENT_GATEWAY', 'MANUAL', 'TEXT', 'FREE | MANUAL | RAZORPAY'],
  ['PAYMENT_INSTRUCTIONS', 'Pay at the association office or by bank transfer and share the reference number. Your registration is confirmed once the payment is verified.', 'LONGTEXT', 'Shown when gateway is MANUAL'],
  ['MEMBERSHIP_AUTO_APPROVE', 'FALSE', 'BOOLEAN', 'Activate membership automatically after successful payment'],
  ['STUDENT_AUTO_APPROVE', 'TRUE', 'BOOLEAN', 'New student accounts are ACTIVE immediately'],
  ['PENDING_PAYMENT_EXPIRY_HOURS', '72', 'NUMBER', 'Unpaid registrations are released after this many hours (0 = never)'],
  ['REFUND_POLICY', 'Refunds for cancelled events are processed by the association office within 14 working days.', 'LONGTEXT', 'Refund policy text'],
  ['AUTO_ACHIEVEMENTS', 'TRUE', 'BOOLEAN', 'Create medal achievements for positions 1–3 when results are published'],
  ['EMAIL_NOTIFICATIONS', 'FALSE', 'BOOLEAN', 'Also send notifications by email (uses Apps Script quota)'],
  ['CACHE_SECONDS', '300', 'NUMBER', 'Public data cache duration in seconds'],
  ['EVENTS_PAGE_SIZE', '12', 'NUMBER', 'Events per page'],
  ['GALLERY_PAGE_SIZE', '20', 'NUMBER', 'Gallery items per page'],
  ['ADMIN_PAGE_SIZE', '25', 'NUMBER', 'Rows per page in admin tables'],
  ['CONTACT_RATE_LIMIT', '5', 'NUMBER', 'Contact submissions allowed per client per hour'],
  ['QR_API_URL', 'https://quickchart.io/qr?size=240&margin=1&text=', 'URL', 'QR image service used inside PDF certificates'],
  ['CERTIFICATE_SIGNATORY', 'General Secretary', 'TEXT', 'Signatory title on certificates'],
  ['PRIVACY_POLICY', 'We collect only the information needed to manage memberships, events and certification. Student contact details, documents and payment information are never published. Public pages show only names, results and verification status. Contact the association office to access or correct your data.', 'LONGTEXT', 'Privacy policy page content'],
  ['TERMS_CONDITIONS', 'By registering you agree to follow the association rules, the event rules published for each competition, and the instructions of officials. Participants skate at their own risk and must wear approved safety equipment. Parents/guardians consent on behalf of minors.', 'LONGTEXT', 'Terms and conditions page content'],
  ['SHOW_STATISTICS', 'TRUE', 'BOOLEAN', 'Show statistics band on the homepage'],
];

/** Settings that are safe to expose on the public website. */
const PUBLIC_SETTING_KEYS = DEFAULT_SETTINGS.map(function (s) { return s[0]; }).filter(function (k) {
  return ['PENDING_PAYMENT_EXPIRY_HOURS', 'EMAIL_NOTIFICATIONS', 'QR_API_URL', 'CONTACT_RATE_LIMIT', 'STUDENT_AUTO_APPROVE',
    'MEMBERSHIP_AUTO_APPROVE', 'AUTO_ACHIEVEMENTS'].indexOf(k) === -1;
});

const EVENT_TYPES = ['NATIONAL', 'STATE', 'DISTRICT', 'OPEN', 'SCHOOL', 'ACADEMY', 'CHAMPIONSHIP', 'TRAINING', 'OTHER'];
const PROGRAM_TYPES = ['SKATING_TRAINING', 'COMPETITION_TRAINING', 'SCHOOL_PROGRAM', 'ACADEMY_PROGRAM', 'COACH_DEVELOPMENT',
  'OFFICIAL_JUDGE_PROGRAM', 'CERTIFICATION_PROGRAM', 'OTHER'];
const GALLERY_CATEGORIES = ['EVENTS', 'TRAINING', 'CHAMPIONSHIPS', 'AWARDS', 'STUDENTS', 'COACHES', 'ASSOCIATION', 'OTHER'];
const VIDEO_CATEGORIES = ['TRAINING', 'EVENTS', 'CHAMPIONSHIPS', 'HIGHLIGHTS', 'INTERVIEWS'];
const RESULT_STATUSES = ['FINISHED', 'DNS', 'DNF', 'DSQ'];
const MEMBERSHIP_STATUSES = ['PENDING', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'];
const PAYMENT_STATUSES = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED'];
const INQUIRY_STATUSES = ['NEW', 'CONTACTED', 'IN_PROGRESS', 'RESOLVED'];


// ===================================================================
// AdminCore.gs
// ===================================================================

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


// ===================================================================
// AdminOps.gs
// ===================================================================

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
    const c = upper(r.Category);
    if (c && c !== upper(categoryName) && c !== upper(raceType)) return false;
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


// ===================================================================
// Auth.gs
// ===================================================================

/**
 * Auth.gs — authentication, sessions and role authorisation.
 *
 * - Passwords are stored only as PBKDF2-HMAC-SHA256 hashes with a per-user salt.
 * - Google sign-in ID tokens are verified server-side (audience + issuer).
 * - Session tokens are random; only their SHA-256 hash is stored.
 * - The role is always read from the Users sheet, never from the client.
 */

const PASSWORD_ITERATIONS = 3000;

function hashPassword(password) {
  const salt = randomToken().slice(0, 32);
  return { hash: pbkdf2Hex(password, salt, PASSWORD_ITERATIONS), salt: salt, iterations: PASSWORD_ITERATIONS };
}

function verifyPassword(user, password) {
  if (!user.Password_Hash || !user.Password_Salt) return false;
  const it = toNumber(user.Password_Iterations, PASSWORD_ITERATIONS) || PASSWORD_ITERATIONS;
  return safeEqual(pbkdf2Hex(password, user.Password_Salt, it), user.Password_Hash);
}

function validatePasswordStrength(pw) {
  pw = String(pw || '');
  if (pw.length < 8) fail('VALIDATION_ERROR', 'Password must be at least 8 characters.');
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) fail('VALIDATION_ERROR', 'Password must contain letters and numbers.');
}

function findUserByEmail(email) {
  const e = str(email).toLowerCase();
  if (!e) return null;
  const rows = Db.all('Users');
  for (let i = 0; i < rows.length; i++) if (str(rows[i].Email).toLowerCase() === e) return rows[i];
  return null;
}

function publicUser(user, student) {
  return {
    userId: user.User_ID,
    email: user.Email,
    role: user.Role,
    name: student ? student.Full_Name : (user.Display_Name || user.Email),
    studentId: user.Student_ID || '',
    photoUrl: student ? driveImageUrl(student.Photo_URL, 200) : '',
    needsProfile: user.Role === 'STUDENT' && !user.Student_ID,
  };
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

function createSession(user) {
  const token = randomToken() + randomToken().slice(0, 16);
  const expires = new Date(new Date().getTime() + SESSION_DAYS * 86400000).toISOString();
  Db.insert('Sessions', {
    Session_ID: sha256Hex(token),
    User_ID: user.User_ID,
    Role: user.Role,
    Expires_At: expires,
    Status: 'ACTIVE',
    Created_At: nowIso(),
    Last_Seen_At: nowIso(),
  });
  Db.update('Users', user.User_ID, { Last_Login: nowIso() });
  const student = user.Student_ID ? Db.byId('Students', user.Student_ID) : null;
  return { token: token, expiresAt: expires, user: publicUser(user, student) };
}

/**
 * Resolves a session token into { user, student }. Returns null when the
 * token is missing, expired, revoked or the user is no longer active.
 */
function resolveSession(token) {
  if (!token || String(token).length < 40) return null;
  const hash = sha256Hex(String(token));
  const cache = CacheService.getScriptCache();
  let sess = parseJsonSafe(cache.get('sess:' + hash), null);
  if (!sess) {
    const row = Db.findOne('Sessions', 'Session_ID', hash);
    if (!row) return null;
    sess = { User_ID: row.User_ID, Expires_At: row.Expires_At, Status: row.Status };
    cache.put('sess:' + hash, JSON.stringify(sess), 600);
  }
  if (sess.Status !== 'ACTIVE' || new Date(sess.Expires_At).getTime() < new Date().getTime()) return null;
  const user = Db.byId('Users', sess.User_ID);
  if (!user || upper(user.Status) !== 'ACTIVE') return null;
  const student = user.Student_ID ? Db.byId('Students', user.Student_ID) : null;
  return { user: user, student: student, tokenHash: hash };
}

function revokeSession(tokenHash) {
  const row = Db.findOne('Sessions', 'Session_ID', tokenHash);
  if (row) Db.update('Sessions', row.Session_ID, { Status: 'REVOKED' });
  CacheService.getScriptCache().remove('sess:' + tokenHash);
}

function revokeUserSessions(userId) {
  const cache = CacheService.getScriptCache();
  Db.where('Sessions', function (s) { return s.User_ID === userId && s.Status === 'ACTIVE'; }).forEach(function (s) {
    Db.update('Sessions', s.Session_ID, { Status: 'REVOKED' });
    cache.remove('sess:' + s.Session_ID);
  });
}

/* ------------------------------------------------------------------ */
/* Authorisation guards                                                */
/* ------------------------------------------------------------------ */

function requireUser(ctx) {
  if (!ctx.user) throw new ApiError('UNAUTHORIZED', 'Please sign in to continue.', 401);
  return ctx.user;
}

function requireStudent(ctx) {
  requireUser(ctx);
  if (ctx.user.Role !== 'STUDENT') throw new ApiError('FORBIDDEN', 'This area is for student accounts.', 403);
  if (!ctx.student) throw new ApiError('PROFILE_REQUIRED', 'Please complete your athlete profile first.', 403);
  if (upper(ctx.student.Status) === 'SUSPENDED') throw new ApiError('SUSPENDED', 'Your account is suspended. Please contact the association.', 403);
  return ctx.student;
}

function requireAdmin(ctx) {
  requireUser(ctx);
  if (ctx.user.Role !== 'ADMIN') throw new ApiError('FORBIDDEN', 'You do not have permission to do this.', 403);
  return ctx.user;
}

/** Spec alias: checkAuthorization(ctx, 'ADMIN' | 'STUDENT' | 'USER'). */
function checkAuthorization(ctx, level) {
  if (level === 'ADMIN') return requireAdmin(ctx);
  if (level === 'STUDENT') return requireStudent(ctx);
  if (level === 'USER') return requireUser(ctx);
  return true;
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

function actionRegister(p, ctx) {
  rateLimit('register:' + ctx.clientKey, 10, 3600);
  validate(p, { email: 'required|email|max:200', password: 'required' });
  validatePasswordStrength(p.password);
  const email = str(p.email).toLowerCase();
  const result = withLock(function () {
    Db.refresh('Users');
    if (findUserByEmail(email)) fail('DUPLICATE', 'An account with this email already exists. Please sign in.');
    const unlinked = Db.where('Students', function (s) { return str(s.Email).toLowerCase() === email && !s.User_ID; });
    if (unlinked.length) {
      fail('ACCOUNT_EXISTS', 'An athlete record already exists for this email. Please sign in with Google using this email, or contact the association.');
    }
    const pw = hashPassword(p.password);
    const user = Db.insert('Users', {
      User_ID: generateID('Users'), Email: email, Role: 'STUDENT', Auth_Provider: 'PASSWORD', Auth_Subject_ID: '', Student_ID: '',
      Status: 'ACTIVE', Display_Name: str(p.firstName) + ' ' + str(p.lastName),
      Password_Hash: pw.hash, Password_Salt: pw.salt, Password_Iterations: pw.iterations,
    });
    const student = createStudentRecord(Object.assign({}, p, { email: email }), { userId: user.User_ID, byAdmin: false });
    Db.update('Users', user.User_ID, { Student_ID: student.Student_ID });
    return user;
  });
  writeAuditLog({ user: result, context: ctx.context }, 'REGISTER', 'User', result.User_ID, null, { Email: email });
  clearCacheForSheets(['Students']);
  return createSession(result);
}

function passwordLogin(p, ctx, portal) {
  validate(p, { email: 'required|email', password: 'required' });
  const email = str(p.email).toLowerCase();
  rateLimit('login:' + email, 10, 900);
  rateLimit('login-ip:' + ctx.clientKey, 30, 900);
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(user, p.password)) fail('INVALID_CREDENTIALS', 'Incorrect email or password.');
  if (upper(user.Status) !== 'ACTIVE') fail('SUSPENDED', 'This account is not active. Please contact the association.');
  if (portal === 'admin' && user.Role !== 'ADMIN') fail('INVALID_CREDENTIALS', 'Incorrect email or password.');
  if (portal === 'student' && user.Role === 'ADMIN') fail('USE_ADMIN_LOGIN', 'Administrators must sign in through the admin portal.');
  const session = createSession(user);
  if (user.Role === 'ADMIN') writeAuditLog({ user: user, context: ctx.context }, 'ADMIN_LOGIN', 'User', user.User_ID, null, null);
  return session;
}

function actionLogin(p, ctx) { return passwordLogin(p, ctx, 'student'); }
function actionAdminLogin(p, ctx) { return passwordLogin(p, ctx, 'admin'); }

function verifyGoogleIdToken(idToken) {
  const clientId = prop(PROP.GOOGLE_CLIENT_ID);
  if (!clientId) fail('NOT_CONFIGURED', 'Google sign-in is not configured.');
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) fail('INVALID_CREDENTIALS', 'Google sign-in failed. Please try again.');
  const info = JSON.parse(res.getContentText());
  const issOk = info.iss === 'accounts.google.com' || info.iss === 'https://accounts.google.com';
  if (info.aud !== clientId || !issOk || String(info.email_verified) !== 'true' || Number(info.exp) * 1000 < new Date().getTime()) {
    fail('INVALID_CREDENTIALS', 'Google sign-in could not be verified.');
  }
  return { sub: info.sub, email: str(info.email).toLowerCase(), name: info.name || '' };
}

function actionGoogleLogin(p, ctx) {
  rateLimit('glogin-ip:' + ctx.clientKey, 30, 900);
  const g = verifyGoogleIdToken(str(p.credential));
  const portal = p.portal === 'admin' ? 'admin' : 'student';
  const user = withLock(function () {
    Db.refresh('Users');
    let u = Db.findOne('Users', 'Auth_Subject_ID', g.sub) || findUserByEmail(g.email);
    if (u) {
      if (!u.Auth_Subject_ID) u = Db.update('Users', u.User_ID, { Auth_Subject_ID: g.sub, Auth_Provider: u.Auth_Provider || 'GOOGLE' });
      return u;
    }
    if (portal === 'admin') fail('INVALID_CREDENTIALS', 'This Google account is not an administrator.');
    u = Db.insert('Users', {
      User_ID: generateID('Users'), Email: g.email, Role: 'STUDENT', Auth_Provider: 'GOOGLE', Auth_Subject_ID: g.sub,
      Student_ID: '', Status: 'ACTIVE', Display_Name: g.name,
    });
    // Google verifies email ownership, so an admin-created athlete record with the same email is linked.
    const existing = Db.where('Students', function (s) { return str(s.Email).toLowerCase() === g.email && !s.User_ID; })[0];
    if (existing) {
      Db.update('Students', existing.Student_ID, { User_ID: u.User_ID });
      u = Db.update('Users', u.User_ID, { Student_ID: existing.Student_ID });
    }
    return u;
  });
  if (upper(user.Status) !== 'ACTIVE') fail('SUSPENDED', 'This account is not active. Please contact the association.');
  if (portal === 'admin' && user.Role !== 'ADMIN') fail('INVALID_CREDENTIALS', 'This Google account is not an administrator.');
  if (portal === 'student' && user.Role === 'ADMIN') fail('USE_ADMIN_LOGIN', 'Administrators must sign in through the admin portal.');
  return createSession(user);
}

/** For Google accounts that do not have an athlete profile yet. */
function actionCompleteProfile(p, ctx) {
  const user = requireUser(ctx);
  if (user.Role !== 'STUDENT') fail('FORBIDDEN', 'Only student accounts have athlete profiles.');
  if (user.Student_ID) fail('DUPLICATE', 'Your profile is already complete.');
  const student = withLock(function () {
    const s = createStudentRecord(Object.assign({}, p, { email: user.Email }), { userId: user.User_ID, byAdmin: false });
    Db.update('Users', user.User_ID, { Student_ID: s.Student_ID });
    return s;
  });
  clearCacheForSheets(['Students']);
  return publicUser(Db.byId('Users', user.User_ID), student);
}

function actionLogout(p, ctx) {
  if (ctx.tokenHash) revokeSession(ctx.tokenHash);
  return { loggedOut: true };
}

function actionGetMe(p, ctx) {
  requireUser(ctx);
  return publicUser(ctx.user, ctx.student);
}

function actionChangePassword(p, ctx) {
  const user = requireUser(ctx);
  validate(p, { newPassword: 'required' });
  validatePasswordStrength(p.newPassword);
  if (user.Password_Hash && !verifyPassword(user, p.currentPassword)) fail('INVALID_CREDENTIALS', 'Your current password is incorrect.');
  const pw = hashPassword(p.newPassword);
  Db.update('Users', user.User_ID, { Password_Hash: pw.hash, Password_Salt: pw.salt, Password_Iterations: pw.iterations,
    Auth_Provider: user.Auth_Provider === 'GOOGLE' ? 'GOOGLE+PASSWORD' : 'PASSWORD' });
  writeAuditLog(ctx, 'CHANGE_PASSWORD', 'User', user.User_ID, null, null);
  return { changed: true };
}


// ===================================================================
// Certificates.gs
// ===================================================================

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


// ===================================================================
// Code.gs
// ===================================================================

/**
 * Code.gs — Web App entry points (doGet / doPost) and the action router.
 *
 * Request (POST body JSON or GET query):
 *   { action, payload, token, key, clientIp }
 *   key      – API_PROXY_SECRET shared with the website server. When set, every
 *              request without it is rejected, so the API is reachable only
 *              through the website's server (CORS / origin restriction).
 *   token    – session token (never a role; the role is read from Users).
 *   clientIp – forwarded by the trusted website server, used for rate limits.
 *
 * Response: { success: true, data, message } | { success: false, error, message }
 */

function doGet(e) {
  const p = (e && e.parameter) || {};
  const payload = p.payload ? parseJsonSafe(p.payload, {}) : Object.assign({}, p);
  ['action', 'key', 'token', 'clientIp', 'payload'].forEach(function (k) { delete payload[k]; });
  return jsonOutput(handleRequest('GET', { action: p.action, key: p.key, token: p.token, clientIp: p.clientIp, payload: payload }));
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { body = {}; }
  return jsonOutput(handleRequest('POST', body));
}

/** access: public | user | student | admin | setup */
function a(fn, access) { return { fn: fn, access: access || 'public' }; }

function entityAlias(entity, op, extra) {
  return function (p, ctx) {
    const q = Object.assign({}, p, { entity: entity }, extra || {});
    if (op === 'list') return actionAdminList(q, ctx);
    if (op === 'create') return actionAdminSave({ entity: entity, data: p.data || p }, ctx);
    if (op === 'update') return actionAdminSave({ entity: entity, id: p.id, data: p.data, updatedAt: p.updatedAt }, ctx);
    if (op === 'delete') return actionAdminDelete(q, ctx);
    if (op === 'publish') return actionAdminSave({ entity: entity, id: p.id, data: { Status: toBool(p.unpublish) ? 'UNPUBLISHED' : 'PUBLISHED' } }, ctx);
  };
}

const ACTIONS = {
  // ---------------- Public ----------------
  getSettings: a(actionGetSettings),
  getHome: a(actionGetHome),
  getAbout: a(actionGetAbout),
  getPage: a(actionGetPage),
  getUpcomingEvents: a(actionGetUpcomingEvents),
  getOngoingEvents: a(actionGetOngoingEvents),
  getPastEvents: a(actionGetPastEvents),
  getEvents: a(actionGetPublicEvents),
  getEvent: a(actionGetEvent),
  getEventCategories: a(actionGetEventCategories),
  getEventResults: a(actionGetEventResults),
  getPrograms: a(actionGetPrograms),
  getProgram: a(actionGetProgram),
  getCertifications: a(actionGetCertifications),
  getGallery: a(actionGetGallery),
  getVideos: a(actionGetVideos),
  getMembershipPlans: a(actionGetMembershipPlans),
  getAnnouncements: a(actionGetAnnouncements),
  getSponsors: a(actionGetSponsors),
  getRankings: a(actionGetRankings),
  submitContact: a(actionSubmitContact),
  verifyMembership: a(actionVerifyMembership),
  verifyCertificate: a(actionVerifyCertificate),
  setupStatus: a(actionSetupStatus),

  // ---------------- Auth ----------------
  register: a(actionRegister),
  login: a(actionLogin),
  adminLogin: a(actionAdminLogin),
  googleLogin: a(actionGoogleLogin),
  logout: a(actionLogout, 'user'),
  me: a(actionGetMe, 'user'),
  completeProfile: a(actionCompleteProfile, 'user'),
  changePassword: a(actionChangePassword, 'user'),
  getNotifications: a(actionGetNotifications, 'user'),
  markNotificationRead: a(actionMarkNotificationRead, 'user'),
  downloadDocument: a(actionDownloadDocument, 'user'),

  // ---------------- Student ----------------
  getStudentProfile: a(actionGetStudentProfile, 'student'),
  updateStudentProfile: a(actionUpdateStudentProfile, 'student'),
  getStudentDashboard: a(actionGetStudentDashboard, 'student'),
  getStudentMembership: a(actionGetStudentMembership, 'student'),
  getStudentEvents: a(actionGetStudentEvents, 'student'),
  getStudentRegistrations: a(actionGetStudentRegistrations, 'student'),
  registerForEvent: a(registerEvent, 'student'),
  cancelMyRegistration: a(actionCancelMyRegistration, 'student'),
  getStudentResults: a(actionGetStudentResults, 'student'),
  getStudentCertificates: a(actionGetStudentCertificates, 'student'),
  getStudentAchievements: a(actionGetStudentAchievements, 'student'),
  getStudentPayments: a(actionGetStudentPayments, 'student'),
  getMyDocuments: a(actionGetMyDocuments, 'student'),
  uploadMyDocument: a(actionUploadMyDocument, 'student'),
  applyMembership: a(actionApplyMembership, 'student'),
  registerForProgram: a(actionRegisterForProgram, 'student'),
  startPayment: a(actionStartPayment, 'student'),
  verifyPayment: a(actionVerifyPayment, 'student'),
  submitPaymentReference: a(actionSubmitPaymentReference, 'student'),

  // ---------------- System (website server only) ----------------
  paymentWebhook: a(actionPaymentWebhook, 'system'),
  runSetup: a(actionRunSetup, 'system'),

  // ---------------- Admin ----------------
  'admin.getAdminDashboard': a(actionGetAdminDashboard, 'admin'),
  'admin.getStudents': a(actionAdminGetStudents, 'admin'),
  'admin.getStudent': a(actionAdminGetStudent, 'admin'),
  'admin.searchStudents': a(actionAdminSearchStudents, 'admin'),
  'admin.createStudent': a(actionAdminCreateStudent, 'admin'),
  'admin.updateStudent': a(actionAdminUpdateStudent, 'admin'),
  'admin.updateStudentStatus': a(actionAdminUpdateStudentStatus, 'admin'),

  'admin.getEvents': a(actionAdminGetEvents, 'admin'),
  'admin.getEvent': a(actionAdminGetEvent, 'admin'),
  'admin.createEvent': a(actionAdminCreateEvent, 'admin'),
  'admin.updateEvent': a(actionAdminUpdateEvent, 'admin'),
  'admin.publishEvent': a(actionAdminPublishEvent, 'admin'),
  'admin.unpublishEvent': a(actionAdminUnpublishEvent, 'admin'),
  'admin.cancelEvent': a(actionAdminCancelEvent, 'admin'),
  'admin.archiveEvent': a(actionAdminArchiveEvent, 'admin'),
  'admin.generateCategories': a(actionAdminGenerateCategories, 'admin'),
  'admin.getEventReport': a(actionAdminGetEventReport, 'admin'),

  'admin.getEventRegistrations': a(actionAdminGetRegistrations, 'admin'),
  'admin.exportEventRegistrations': a(actionAdminExportEventRegistrations, 'admin'),
  'admin.updateRegistration': a(actionAdminUpdateRegistration, 'admin'),
  'admin.assignBibs': a(actionAdminAssignBibs, 'admin'),
  'admin.createRegistration': a(actionAdminCreateRegistration, 'admin'),

  'admin.getPrograms': a(entityAlias('programs', 'list'), 'admin'),
  'admin.createProgram': a(entityAlias('programs', 'create'), 'admin'),
  'admin.updateProgram': a(entityAlias('programs', 'update'), 'admin'),
  'admin.publishProgram': a(entityAlias('programs', 'publish'), 'admin'),

  'admin.getGallery': a(entityAlias('gallery', 'list'), 'admin'),
  'admin.createGalleryItem': a(entityAlias('gallery', 'create'), 'admin'),
  'admin.updateGalleryItem': a(entityAlias('gallery', 'update'), 'admin'),
  'admin.deleteGalleryItem': a(entityAlias('gallery', 'delete', { permanent: true }), 'admin'),

  'admin.getMembershipPlans': a(entityAlias('membershipPlans', 'list'), 'admin'),
  'admin.createMembershipPlan': a(entityAlias('membershipPlans', 'create'), 'admin'),
  'admin.updateMembershipPlan': a(entityAlias('membershipPlans', 'update'), 'admin'),

  'admin.getMemberships': a(actionAdminGetMemberships, 'admin'),
  'admin.createMembership': a(actionAdminCreateMembership, 'admin'),
  'admin.approveMembership': a(actionAdminApproveMembership, 'admin'),
  'admin.rejectMembership': a(actionAdminRejectMembership, 'admin'),
  'admin.renewMembership': a(actionAdminRenewMembership, 'admin'),
  'admin.setMembershipStatus': a(actionAdminSetMembershipStatus, 'admin'),
  'admin.getMembershipReport': a(actionAdminGetMembershipReport, 'admin'),

  'admin.getResults': a(actionAdminGetResults, 'admin'),
  'admin.saveResults': a(actionAdminSaveResults, 'admin'),
  'admin.createResult': a(actionAdminCreateResult, 'admin'),
  'admin.updateResult': a(actionAdminUpdateResult, 'admin'),
  'admin.deleteResult': a(actionAdminDeleteResult, 'admin'),
  'admin.publishResults': a(actionAdminPublishResults, 'admin'),

  'admin.createCertificate': a(actionAdminCreateCertificate, 'admin'),
  'admin.revokeCertificate': a(actionAdminRevokeCertificate, 'admin'),
  'admin.publishCertificate': a(actionAdminPublishCertificate, 'admin'),
  'admin.regenerateCertificate': a(actionAdminRegenerateCertificate, 'admin'),
  'admin.generateEventCertificates': a(actionAdminGenerateEventCertificates, 'admin'),

  'admin.getContactInquiries': a(entityAlias('inquiries', 'list'), 'admin'),
  'admin.updateContactInquiry': a(entityAlias('inquiries', 'update'), 'admin'),
  'admin.getSponsors': a(entityAlias('sponsors', 'list'), 'admin'),
  'admin.updateSponsors': a(function (p, ctx) { return actionAdminSave({ entity: 'sponsors', id: p.id, data: p.data, updatedAt: p.updatedAt }, ctx); }, 'admin'),

  'admin.getPayments': a(actionAdminGetPayments, 'admin'),
  'admin.updatePayment': a(actionAdminUpdatePayment, 'admin'),

  'admin.getReport': a(actionAdminGetReport, 'admin'),
  'admin.export': a(actionAdminExport, 'admin'),

  'admin.list': a(actionAdminList, 'admin'),
  'admin.get': a(actionAdminGet, 'admin'),
  'admin.save': a(actionAdminSave, 'admin'),
  'admin.setStatus': a(actionAdminSetStatus, 'admin'),
  'admin.delete': a(actionAdminDelete, 'admin'),
  'admin.bulkStatus': a(actionAdminBulkStatus, 'admin'),
  'admin.upload': a(actionAdminUpload, 'admin'),

  'admin.getSettings': a(actionAdminGetSettings, 'admin'),
  'admin.updateSettings': a(actionAdminUpdateSettings, 'admin'),
  'admin.setSecret': a(actionAdminSetSecret, 'admin'),
  'admin.clearCache': a(actionAdminClearCache, 'admin'),
  'admin.listAdmins': a(actionAdminListAdmins, 'admin'),
  'admin.createAdmin': a(actionAdminCreateAdmin, 'admin'),
  'admin.setAdminStatus': a(actionAdminSetAdminStatus, 'admin'),
  'admin.deleteSampleData': a(actionAdminDeleteSampleData, 'admin'),
  'admin.createSampleData': a(actionAdminCreateSampleData, 'admin'),
};

/** Public read actions that may be called with GET (cache-friendly). */
const GET_ALLOWED = ['getSettings', 'getHome', 'getAbout', 'getPage', 'getUpcomingEvents', 'getOngoingEvents', 'getPastEvents', 'getEvents', 'getEvent',
  'getEventCategories', 'getEventResults', 'getPrograms', 'getProgram', 'getCertifications', 'getGallery', 'getVideos', 'getMembershipPlans',
  'getAnnouncements', 'getSponsors', 'getRankings', 'verifyMembership', 'verifyCertificate', 'setupStatus'];

/** Clears per-execution memoisation (each Apps Script request normally starts fresh). */
function resetRequestState() {
  Db.refresh();
  resetSettingsMemo();
  _folderMemo = null;
  _lockDepth = 0;
}

/** Spec alias: validates the request envelope and returns the action definition. */
function validateRequest(method, req) {
  if (!req || typeof req !== 'object') throw new ApiError('BAD_REQUEST', 'Invalid request.');
  const action = str(req.action);
  if (!/^[A-Za-z.]{2,60}$/.test(action) || !Object.prototype.hasOwnProperty.call(ACTIONS, action)) throw new ApiError('UNKNOWN_ACTION', 'Unknown action.', 404);
  const secret = prop(PROP.API_PROXY_SECRET);
  if (secret && !safeEqual(secret, str(req.key))) throw new ApiError('FORBIDDEN', 'Access denied.', 403);
  if (method === 'GET' && GET_ALLOWED.indexOf(action) === -1) throw new ApiError('METHOD_NOT_ALLOWED', 'Use POST for this action.', 405);
  const def = ACTIONS[action];
  if (def.access === 'system' && !secret) throw new ApiError('FORBIDDEN', 'Configure API_PROXY_SECRET first.', 403);
  if (req.payload !== undefined && (typeof req.payload !== 'object' || req.payload === null || Array.isArray(req.payload))) {
    throw new ApiError('BAD_REQUEST', 'Invalid request payload.');
  }
  return def;
}

function handleRequest(method, req) {
  resetRequestState();
  const action = str(req && req.action);
  const ctx = { user: null, student: null, tokenHash: null, clientKey: 'anon', context: '' };
  try {
    const def = validateRequest(method, req);
    if (def.access !== 'public' && def.access !== 'system' && action !== 'setupStatus' && !isInitialized()) {
      throw new ApiError('NOT_CONFIGURED', 'The system has not been set up yet.', 503);
    }
    ctx.clientKey = str(req.clientIp).slice(0, 64) || 'anon';
    ctx.context = (method + ' ' + action + ' ' + (req.clientIp ? 'ip:' + str(req.clientIp).slice(0, 64) : '')).trim();
    if (req.token) {
      const sess = resolveSession(str(req.token));
      if (sess) { ctx.user = sess.user; ctx.student = sess.student; ctx.tokenHash = sess.tokenHash; }
    }
    if (def.access === 'user') requireUser(ctx);
    if (def.access === 'student') requireStudent(ctx);
    if (def.access === 'admin') requireAdmin(ctx);
    const data = def.fn(req.payload || {}, ctx);
    return { success: true, data: data === undefined ? null : data, message: 'Success' };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, error: err.code, message: err.message, status: err.status };
    }
    logError(action, err, ctx);
    return { success: false, error: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', status: 500 };
  }
}


// ===================================================================
// Core.gs
// ===================================================================

/**
 * Core.gs — locking + ID generation, cache, rate limiting, audit logs,
 * error logs and notifications.
 */

/* ------------------------------------------------------------------ */
/* Locking                                                             */
/* ------------------------------------------------------------------ */

let _lockDepth = 0;
/** Runs fn while holding the script lock (re-entrant within one execution). */
function withLock(fn) {
  if (_lockDepth > 0) return fn();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new ApiError('BUSY', 'The system is busy. Please try again in a moment.', 503);
  _lockDepth++;
  try {
    return fn();
  } finally {
    _lockDepth--;
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------------ */
/* IDs — PREFIX-YYYY-000001, sequence per prefix and year              */
/* ------------------------------------------------------------------ */

const ID_SOURCES = {
  MembershipNumber: ['Memberships', 'Membership_Number'],
  CertificateNumber: ['Student_Certifications', 'Certificate_Number'],
};

function pad6(n) { const s = String(n); return s.length >= 6 ? s : ('000000' + s).slice(-6); }

function maxExistingSequence(kind, prefix, year) {
  const src = ID_SOURCES[kind] || [kind, PRIMARY_KEY[kind]];
  let max = 0;
  try {
    Db.refresh(src[0]);
    const re = new RegExp('^' + prefix + '-' + year + '-(\\d+)$');
    Db.all(src[0]).forEach(function (r) {
      const m = String(r[src[1]]).match(re);
      if (m) max = Math.max(max, +m[1]);
    });
  } catch (e) { /* sheet may not exist yet */ }
  return max;
}

/**
 * Generates a unique, sequential ID under the script lock so simultaneous
 * requests never receive the same number. The counter lives in Script
 * Properties and is re-seeded from the sheet if it is ever lost.
 */
function generateID(kind) {
  const prefix = ID_PREFIX[kind];
  if (!prefix) throw new Error('Unknown ID kind ' + kind);
  return withLock(function () {
    const year = currentYear();
    const props = PropertiesService.getScriptProperties();
    const key = 'SEQ_' + prefix + '_' + year;
    let n = Number(props.getProperty(key) || 0);
    if (!n) n = maxExistingSequence(kind, prefix, year);
    n += 1;
    props.setProperty(key, String(n));
    return prefix + '-' + year + '-' + pad6(n);
  });
}

/** Lock-free unique ID for high-volume append-only logs. */
function logId(prefix) {
  return prefix + '-' + formatInTz(new Date(), 'yyyyMMddHHmmss') + '-' + randomCode(5);
}

/* ------------------------------------------------------------------ */
/* Cache (CacheService, versioned per tag)                             */
/* ------------------------------------------------------------------ */

const CACHE_TAGS = ['settings', 'home', 'events', 'programs', 'gallery', 'videos', 'plans', 'announcements', 'sponsors', 'results',
  'rankings'];

const AppCache = (function () {
  function store() { return CacheService.getScriptCache(); }

  function version(tag) {
    const c = store();
    let v = c.get('ver:' + tag);
    if (!v) { v = randomCode(6); c.put('ver:' + tag, v, 21600); }
    return v;
  }

  function fullKey(tag, key) { return 'c:' + tag + ':' + version(tag) + ':' + key; }

  function get(tag, key) {
    const c = store();
    const k = fullKey(tag, key);
    const head = c.get(k);
    if (!head) return null;
    if (head.indexOf('__chunks:') === 0) {
      const n = +head.slice(9);
      const keys = [];
      for (let i = 0; i < n; i++) keys.push(k + ':' + i);
      const parts = c.getAll(keys);
      let s = '';
      for (let i = 0; i < n; i++) { if (parts[keys[i]] === undefined || parts[keys[i]] === null) return null; s += parts[keys[i]]; }
      return JSON.parse(s);
    }
    return JSON.parse(head);
  }

  function put(tag, key, value, ttl) {
    const c = store();
    const k = fullKey(tag, key);
    const s = JSON.stringify(value);
    const seconds = Math.max(1, Math.min(21600, Math.floor(ttl || 300)));
    try {
      if (s.length < 90000) { c.put(k, s, seconds); return; }
      const chunk = 90000, map = {};
      const n = Math.ceil(s.length / chunk);
      if (n > 50) return; // too large to cache sensibly
      for (let i = 0; i < n; i++) map[k + ':' + i] = s.substr(i * chunk, chunk);
      c.putAll(map, seconds);
      c.put(k, '__chunks:' + n, seconds);
    } catch (e) {
      console.warn('Cache put failed: ' + e);
    }
  }

  function clear(tags) {
    const c = store();
    (tags || CACHE_TAGS).forEach(function (t) { c.put('ver:' + t, randomCode(6), 21600); });
  }

  return { get: get, put: put, clear: clear };
})();

function cacheSeconds() {
  return Math.max(10, Math.min(21600, toNumber(getSettingValue('CACHE_SECONDS', 300), 300)));
}

/** Returns a cached value or computes and caches it. */
function cached(tag, key, fn) {
  const hit = AppCache.get(tag, key);
  if (hit !== null && hit !== undefined) return hit;
  const value = fn();
  AppCache.put(tag, key, value, cacheSeconds());
  return value;
}

/** Clears the caches affected by a change to the given sheets. */
function clearCacheForSheets(sheetNames) {
  const tags = {};
  sheetNames.forEach(function (s) { (SHEET_CACHE_TAGS[s] || []).forEach(function (t) { tags[t] = true; }); });
  const list = Object.keys(tags);
  if (list.length) AppCache.clear(list);
  if (sheetNames.indexOf('Settings') !== -1) resetSettingsMemo();
}

/** Clears all website caches. */
function clearCache() {
  AppCache.clear();
  resetSettingsMemo();
  return { cleared: true, at: nowIso() };
}

/* ------------------------------------------------------------------ */
/* Rate limiting                                                       */
/* ------------------------------------------------------------------ */

function rateLimit(bucket, limit, windowSeconds) {
  const c = CacheService.getScriptCache();
  const win = Math.floor(new Date().getTime() / 1000 / windowSeconds);
  const key = 'rl:' + sha256Hex(bucket).slice(0, 32) + ':' + win;
  const n = Number(c.get(key) || 0);
  if (n >= limit) throw new ApiError('RATE_LIMITED', 'Too many requests. Please wait a few minutes and try again.', 429);
  c.put(key, String(n + 1), windowSeconds + 5);
}

/* ------------------------------------------------------------------ */
/* Audit + error logs                                                  */
/* ------------------------------------------------------------------ */

const AUDIT_REDACT = ['Password_Hash', 'Password_Salt', 'Password_Iterations', 'Parent_Mobile', 'Address', 'Emergency_Contact_Phone'];

function diffForAudit(oldObj, newObj) {
  const o = {}, n = {};
  const keys = {};
  Object.keys(oldObj || {}).forEach(function (k) { keys[k] = true; });
  Object.keys(newObj || {}).forEach(function (k) { keys[k] = true; });
  Object.keys(keys).forEach(function (k) {
    if (k === 'Updated_At' || k === 'Created_At') return;
    const a = oldObj ? oldObj[k] : undefined, b = newObj ? newObj[k] : undefined;
    if (String(a === undefined ? '' : a) === String(b === undefined ? '' : b)) return;
    const redact = AUDIT_REDACT.indexOf(k) !== -1;
    if (oldObj && a !== undefined) o[k] = redact ? '[redacted]' : a;
    if (newObj && b !== undefined) n[k] = redact ? '[redacted]' : b;
  });
  return { o: o, n: n };
}

function writeAuditLog(ctx, action, entityType, entityId, oldObj, newObj) {
  try {
    const d = diffForAudit(oldObj, newObj);
    const clip = function (x) { const s = JSON.stringify(x); return s === '{}' ? '' : s.slice(0, 5000); };
    Db.insert('Audit_Logs', {
      Log_ID: logId('LOG'),
      User_ID: ctx && ctx.user ? ctx.user.User_ID : 'SYSTEM',
      Role: ctx && ctx.user ? ctx.user.Role : 'SYSTEM',
      Action: action,
      Entity_Type: entityType,
      Entity_ID: entityId || '',
      Old_Value: clip(d.o),
      New_Value: clip(d.n),
      Timestamp: nowIso(),
      IP_or_Context: ctx ? str(ctx.context).slice(0, 200) : 'trigger',
    });
  } catch (e) {
    console.error('Audit log failed: ' + e);
  }
}

function logError(action, err, ctx) {
  try {
    console.error(action + ': ' + (err && err.stack ? err.stack : err));
    Db.insert('Error_Logs', {
      Error_ID: logId('ERR'),
      Action: action || '',
      Code: err && err.code ? err.code : 'INTERNAL',
      Message: String(err && err.message ? err.message : err).slice(0, 1000),
      Stack: String(err && err.stack ? err.stack : '').slice(0, 3000),
      User_ID: ctx && ctx.user ? ctx.user.User_ID : '',
      Timestamp: nowIso(),
    });
  } catch (e) {
    console.error('Error log failed: ' + e);
  }
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

/**
 * Creates a notification for a user. When `dedupeKey` is given the same
 * notification is never created twice (safe for daily triggers).
 */
function notifyUser(userId, title, message, type, relatedId, dedupeKey) {
  if (!userId) return null;
  if (dedupeKey && Db.findOne('Notifications', 'Dedupe_Key', dedupeKey)) return null;
  const rec = Db.insert('Notifications', {
    Notification_ID: logId('NTF'),
    User_ID: userId,
    Title: title,
    Message: message,
    Type: type || 'GENERAL',
    Related_ID: relatedId || '',
    Read_Status: 'UNREAD',
    Created_At: nowIso(),
    Dedupe_Key: dedupeKey || '',
  });
  if (toBool(getSettingValue('EMAIL_NOTIFICATIONS', 'FALSE'))) {
    try {
      const user = Db.byId('Users', userId);
      if (user && isEmail(user.Email) && MailApp.getRemainingDailyQuota() > 5) {
        MailApp.sendEmail({
          to: user.Email,
          subject: title + ' — ' + getSettingValue('SITE_NAME', 'Skating Association'),
          body: message + '\n\n' + (siteUrl() ? siteUrl() + '/dashboard/notifications' : ''),
        });
      }
    } catch (e) { console.warn('Email failed: ' + e); }
  }
  return rec;
}

function notifyStudent(studentId, title, message, type, relatedId, dedupeKey) {
  const s = Db.byId('Students', studentId);
  if (!s || !s.User_ID) return null;
  return notifyUser(s.User_ID, title, message, type, relatedId, dedupeKey);
}


// ===================================================================
// Db.gs
// ===================================================================

/**
 * Db.gs — Google Sheets data access layer.
 *
 * - Each sheet is read at most once per request (one getValues batch read)
 *   and memoised for the rest of the execution.
 * - Columns are addressed by header name, so reordering columns in the
 *   spreadsheet never breaks the API.
 * - Writes are batched (setValues) and every value is sanitised so user
 *   input is stored as plain text, never as a formula.
 */
const Db = (function () {
  let ss = null;
  let memo = {};

  function spreadsheet() {
    if (ss) return ss;
    const id = PropertiesService.getScriptProperties().getProperty(PROP.SPREADSHEET_ID);
    if (!id) throw new ApiError('NOT_CONFIGURED', 'The system has not been set up yet.');
    ss = SpreadsheetApp.openById(id);
    return ss;
  }

  function setSpreadsheet(sheetFile) { ss = sheetFile; memo = {}; }

  function sheet(name) {
    const sh = spreadsheet().getSheetByName(name);
    if (!sh) throw new ApiError('NOT_CONFIGURED', 'Sheet "' + name + '" is missing. Run setupSystem().');
    return sh;
  }

  function normalizeValue(v) {
    if (Object.prototype.toString.call(v) === '[object Date]') {
      if (isNaN(v.getTime())) return '';
      const local = formatInTz(v, 'yyyy-MM-dd HH:mm');
      return / 00:00$/.test(local) ? local.slice(0, 10) : local;
    }
    return unsanitizeCell(v);
  }

  function table(name) {
    if (memo[name]) return memo[name];
    const sh = sheet(name);
    const lastRow = sh.getLastRow();
    const lastCol = Math.max(sh.getLastColumn(), 1);
    const values = lastRow > 0 ? sh.getRange(1, 1, lastRow, lastCol).getValues() : [[]];
    const headers = values[0].map(function (h) { return String(h).trim(); });
    const rows = [];
    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      let empty = true;
      const obj = {};
      for (let c = 0; c < headers.length; c++) {
        if (!headers[c]) continue;
        const v = normalizeValue(row[c]);
        if (v !== '' && v !== null) empty = false;
        obj[headers[c]] = v === null || v === undefined ? '' : v;
      }
      if (empty) continue;
      Object.defineProperty(obj, '_row', { value: r + 1, enumerable: false, writable: true });
      rows.push(obj);
    }
    memo[name] = { name: name, headers: headers, rows: rows, sheet: sh };
    return memo[name];
  }

  function all(name) { return table(name).rows; }

  function where(name, predicate) { return all(name).filter(predicate); }

  function findOne(name, field, value) {
    if (value === undefined || value === null || value === '') return null;
    const rows = all(name);
    const needle = String(value);
    for (let i = 0; i < rows.length; i++) if (String(rows[i][field]) === needle) return rows[i];
    return null;
  }

  function byId(name, id) { return findOne(name, PRIMARY_KEY[name], id); }

  function toRowArray(t, obj) {
    return t.headers.map(function (h) {
      if (!h) return '';
      const v = obj[h];
      return v === undefined || v === null ? '' : sanitizeCell(v);
    });
  }

  function stamp(t, obj, isNew) {
    const now = nowIso();
    if (isNew && t.headers.indexOf('Created_At') !== -1 && !obj.Created_At) obj.Created_At = now;
    if (t.headers.indexOf('Updated_At') !== -1) obj.Updated_At = now;
  }

  /** Inserts records in one batch write. Returns the inserted records. */
  function insertMany(name, objs) {
    if (!objs.length) return [];
    const t = table(name);
    const sh = t.sheet;
    const start = Math.max(sh.getLastRow(), 1) + 1;
    const rows = objs.map(function (o) { stamp(t, o, true); return toRowArray(t, o); });
    sh.getRange(start, 1, rows.length, t.headers.length).setNumberFormat('@').setValues(rows);
    objs.forEach(function (o, i) {
      const rec = {};
      t.headers.forEach(function (h, c) { if (h) rec[h] = o[h] === undefined || o[h] === null ? '' : o[h]; });
      Object.defineProperty(rec, '_row', { value: start + i, enumerable: false, writable: true });
      t.rows.push(rec);
    });
    return t.rows.slice(t.rows.length - objs.length);
  }

  function insert(name, obj) { return insertMany(name, [obj])[0]; }

  /**
   * Updates a record by primary key. When `expectedUpdatedAt` is supplied and
   * the stored Updated_At is different, the update is rejected (someone —
   * possibly a direct spreadsheet edit — changed the record meanwhile).
   */
  function update(name, id, patch, opts) {
    opts = opts || {};
    const t = table(name);
    const rec = byId(name, id);
    if (!rec) fail('NOT_FOUND', 'Record not found.');
    if (opts.expectedUpdatedAt && rec.Updated_At && String(rec.Updated_At) !== String(opts.expectedUpdatedAt)) {
      throw new ApiError('CONFLICT', 'This record was changed by someone else. Reload it and try again.', 409);
    }
    const changed = [];
    Object.keys(patch).forEach(function (k) {
      if (k === PRIMARY_KEY[name] || t.headers.indexOf(k) === -1) return;
      const nv = patch[k] === undefined || patch[k] === null ? '' : patch[k];
      if (String(rec[k]) !== String(nv)) { rec[k] = nv; changed.push(k); }
    });
    if (!changed.length) return rec;
    stamp(t, rec, false);
    if (rec.Updated_At !== undefined && changed.indexOf('Updated_At') === -1) changed.push('Updated_At');
    let lo = Infinity, hi = -1;
    changed.forEach(function (k) { const c = t.headers.indexOf(k); lo = Math.min(lo, c); hi = Math.max(hi, c); });
    const rowArr = toRowArray(t, rec).slice(lo, hi + 1);
    t.sheet.getRange(rec._row, lo + 1, 1, hi - lo + 1).setNumberFormat('@').setValues([rowArr]);
    return rec;
  }

  /** Batch update of many records of the same sheet (one write per row span). */
  function updateMany(name, patches) {
    return patches.map(function (p) { return update(name, p.id, p.patch); });
  }

  /** Physically deletes a record (used only for disposable data). */
  function remove(name, id) {
    const t = table(name);
    const rec = byId(name, id);
    if (!rec) return false;
    t.sheet.deleteRow(rec._row);
    delete memo[name];
    return true;
  }

  function refresh(name) { if (name) delete memo[name]; else memo = {}; }

  function headers(name) { return table(name).headers; }

  return {
    spreadsheet: spreadsheet, setSpreadsheet: setSpreadsheet, sheet: sheet, table: table, all: all, where: where,
    findOne: findOne, byId: byId, insert: insert, insertMany: insertMany, update: update, updateMany: updateMany,
    remove: remove, refresh: refresh, headers: headers,
  };
})();

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

let _settingsMemo = null;
function getSettingsMap() {
  if (_settingsMemo) return _settingsMemo;
  try {
    const hit = AppCache.get('settings', 'map');
    if (hit) { _settingsMemo = hit; return hit; }
  } catch (e) { /* cache unavailable */ }
  const map = {};
  DEFAULT_SETTINGS.forEach(function (s) { map[s[0]] = s[1]; });
  try {
    Db.all('Settings').forEach(function (r) {
      if (r.Setting_Key && upper(r.Status || 'ACTIVE') !== 'INACTIVE') map[str(r.Setting_Key)] = r.Setting_Value;
    });
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
  }
  _settingsMemo = map;
  try { AppCache.put('settings', 'map', map, 600); } catch (e) { /* ignore */ }
  return map;
}

function getSettingValue(key, fallback) {
  const v = getSettingsMap()[key];
  return v === undefined || v === '' ? (fallback === undefined ? '' : fallback) : v;
}

function resetSettingsMemo() { _settingsMemo = null; _tzMemo = null; }

function prop(key) { return PropertiesService.getScriptProperties().getProperty(key) || ''; }

function siteUrl() { return str(prop(PROP.SITE_URL)).replace(/\/+$/, ''); }


// ===================================================================
// Drive.gs
// ===================================================================

/**
 * Drive.gs — Google Drive folder structure and file storage.
 *
 * Every folder the system creates is recorded in Drive_Folders with a
 * stable Folder_Key (e.g. EVENTS/EVT-2026-000001/Poster) so it can be found
 * again without searching Drive.
 */

const ROOT_FOLDER_NAME = 'SKATING ASSOCIATION';

const BASE_FOLDERS = [
  ['WEBSITE', 'Website', 'ROOT'],
  ['WEBSITE/Logo', 'Logo', 'WEBSITE'],
  ['WEBSITE/Hero', 'Hero', 'WEBSITE'],
  ['WEBSITE/Banners', 'Banners', 'WEBSITE'],
  ['WEBSITE/Documents', 'Documents', 'WEBSITE'],
  ['EVENTS', 'Events', 'ROOT'],
  ['STUDENTS', 'Students', 'ROOT'],
  ['MEMBERSHIPS', 'Memberships', 'ROOT'],
  ['PROGRAMS', 'Programs', 'ROOT'],
  ['GALLERY', 'Gallery', 'ROOT'],
  ['GALLERY/EVENTS', 'Events', 'GALLERY'],
  ['GALLERY/TRAINING', 'Training', 'GALLERY'],
  ['GALLERY/AWARDS', 'Awards', 'GALLERY'],
  ['GALLERY/OTHER', 'Other', 'GALLERY'],
  ['CERTIFICATES', 'Certificates', 'ROOT'],
  ['DOCUMENTS', 'Documents', 'ROOT'],
  ['REPORTS', 'Reports', 'ROOT'],
];

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

let _folderMemo = null;
function folderIndex() {
  if (_folderMemo) return _folderMemo;
  _folderMemo = {};
  try {
    Db.all('Drive_Folders').forEach(function (f) {
      if (f.Folder_Key && upper(f.Status || 'ACTIVE') === 'ACTIVE') _folderMemo[f.Folder_Key] = f.Google_Drive_ID;
    });
  } catch (e) { /* not set up */ }
  return _folderMemo;
}

function driveConfigured() {
  return !!folderIndex().ROOT;
}

function recordFolder(key, type, folder, parentId) {
  Db.insert('Drive_Folders', {
    Folder_ID: logId('FLD'), Folder_Type: type, Google_Drive_ID: folder.getId(), Parent_Folder_ID: parentId || '',
    Folder_URL: folder.getUrl(), Status: 'ACTIVE', Created_At: nowIso(), Folder_Key: key,
  });
  folderIndex()[key] = folder.getId();
}

/** Returns the Drive folder for a key, creating it (and recording it) if needed. */
function ensureFolder(key, name, parentKey, type) {
  const idx = folderIndex();
  if (idx[key]) {
    try { return DriveApp.getFolderById(idx[key]); } catch (e) { /* deleted in Drive → recreate */ }
  }
  if (!idx[parentKey]) return null;
  const parent = DriveApp.getFolderById(idx[parentKey]);
  const existing = parent.getFoldersByName(name);
  const folder = existing.hasNext() ? existing.next() : parent.createFolder(name);
  recordFolder(key, type || key.split('/')[0], folder, idx[parentKey]);
  return folder;
}

/** Creates the full folder tree below the admin-provided root folder. */
function createDriveFolders(parentFolderId) {
  const idx = folderIndex();
  if (!idx.ROOT) {
    const parent = DriveApp.getFolderById(parentFolderId);
    const existing = parent.getFoldersByName(ROOT_FOLDER_NAME);
    const root = existing.hasNext() ? existing.next() : parent.createFolder(ROOT_FOLDER_NAME);
    recordFolder('ROOT', 'ROOT', root, parentFolderId);
  }
  BASE_FOLDERS.forEach(function (f) { ensureFolder(f[0], f[1], f[2], f[0].split('/')[0]); });
  return folderIndex();
}

function ensureEventFolders(eventId) {
  if (!driveConfigured()) return null;
  const base = 'EVENTS/' + eventId;
  const folder = ensureFolder(base, eventId, 'EVENTS', 'EVENT');
  ['Poster', 'Rules', 'Schedule', 'Results', 'Gallery'].forEach(function (n) { ensureFolder(base + '/' + n, n, base, 'EVENT_' + n.toUpperCase()); });
  return folder;
}

function ensureStudentFolders(studentId) {
  if (!driveConfigured()) return null;
  const base = 'STUDENTS/' + studentId;
  const folder = ensureFolder(base, studentId, 'STUDENTS', 'STUDENT');
  ['Photo', 'Documents', 'Certificates'].forEach(function (n) { ensureFolder(base + '/' + n, n, base, 'STUDENT_' + n.toUpperCase()); });
  return folder;
}

function galleryFolderKey(category) {
  const c = upper(category) || 'OTHER';
  const key = 'GALLERY/' + c;
  ensureFolder(key, c.charAt(0) + c.slice(1).toLowerCase(), 'GALLERY', 'GALLERY');
  return key;
}

/* ------------------------------------------------------------------ */
/* Files                                                               */
/* ------------------------------------------------------------------ */

function extractDriveId(value) {
  const s = str(value);
  if (!s) return '';
  let m = s.match(/\/d\/([A-Za-z0-9_-]{20,})/) || s.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{25,}$/.test(s)) return s;
  return '';
}

/** Converts Drive links into a fast, embeddable image URL of the requested width. */
function driveImageUrl(value, width) {
  const s = str(value);
  if (!s) return '';
  const isDrive = /drive\.google\.com|googleusercontent\.com|docs\.google\.com/.test(s) || /^[A-Za-z0-9_-]{25,}$/.test(s);
  if (!isDrive) return s;
  const id = extractDriveId(s);
  if (!id) return s;
  return 'https://lh3.googleusercontent.com/d/' + id + '=w' + (width || 1600);
}

/**
 * Saves a base64 upload into the folder identified by folderKey.
 * file = { name, mimeType, base64 } (base64 may be a data: URL).
 */
function saveUpload(file, folderKey, opts) {
  opts = opts || {};
  if (!file || !file.base64) fail('VALIDATION_ERROR', 'No file was received.');
  const allowed = opts.allowedTypes || DOCUMENT_TYPES;
  const mime = str(file.mimeType).toLowerCase();
  if (allowed.indexOf(mime) === -1) fail('VALIDATION_ERROR', 'This file type is not allowed.');
  const data = String(file.base64).replace(/^data:[^;]+;base64,/, '');
  const bytes = Utilities.base64Decode(data);
  if (bytes.length > (opts.maxBytes || MAX_UPLOAD_BYTES)) fail('VALIDATION_ERROR', 'The file is too large.');
  if (!driveConfigured()) fail('NOT_CONFIGURED', 'File storage is not configured. Run setupSystem().');
  const folderId = folderIndex()[folderKey];
  if (!folderId) fail('NOT_CONFIGURED', 'Storage folder is missing.');
  const safeName = str(file.name).replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'upload';
  const blob = Utilities.newBlob(bytes, mime, (opts.prefix ? opts.prefix + '_' : '') + safeName);
  const created = DriveApp.getFolderById(folderId).createFile(blob);
  if (opts.public) created.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  if (opts.replaceFileId) {
    try { DriveApp.getFileById(opts.replaceFileId).setTrashed(true); } catch (e) { /* already gone */ }
  }
  return {
    fileId: created.getId(),
    url: mime.indexOf('image/') === 0 ? 'https://lh3.googleusercontent.com/d/' + created.getId() : created.getUrl(),
    viewUrl: created.getUrl(),
    name: created.getName(),
  };
}

/** Makes an existing Drive file (e.g. added manually) viewable by link. */
function publishDriveFile(fileId) {
  try {
    DriveApp.getFileById(fileId).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return true;
  } catch (e) {
    return false;
  }
}

function trashDriveFile(fileId) {
  if (!fileId) return;
  try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e) { /* ignore */ }
}


// ===================================================================
// Events.gs
// ===================================================================

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


// ===================================================================
// Payments.gs
// ===================================================================

/**
 * Payments.gs — payment records and a configurable payment gateway.
 *
 * Gateways (Settings → PAYMENT_GATEWAY):
 *   MANUAL   – pay offline; an admin verifies and marks the payment SUCCESS.
 *   RAZORPAY – Razorpay Checkout. Success is recorded only after the
 *              signature is verified with the secret key AND the payment is
 *              confirmed via the Razorpay API, or via a signed webhook.
 *   FREE     – treated like MANUAL for paid items (no online collection).
 * Zero-amount items are marked SUCCESS immediately.
 *
 * Card numbers or other payment credentials are never stored.
 */

function paymentGateway() {
  const g = upper(getSettingValue('PAYMENT_GATEWAY', 'MANUAL'));
  if (g === 'RAZORPAY' && prop(PROP.RAZORPAY_KEY_ID) && prop(PROP.RAZORPAY_KEY_SECRET)) return 'RAZORPAY';
  return 'MANUAL';
}

function createPaymentRecord(o) {
  const amount = Math.max(0, toNumber(o.amount, 0));
  const free = amount <= 0;
  return Db.insert('Payments', {
    Payment_ID: generateID('Payments'),
    User_ID: o.userId || '', Student_ID: o.studentId || '', Event_ID: o.eventId || '', Membership_ID: o.membershipId || '',
    Program_ID: o.programId || '', Registration_ID: o.registrationId || '', Program_Registration_ID: o.programRegistrationId || '',
    Amount: amount, Currency: getSettingValue('DEFAULT_CURRENCY', 'INR'), Payment_Type: o.type,
    Gateway: free ? 'NONE' : paymentGateway(), Transaction_ID: '', Payment_Date: free ? todayKey() : '',
    Payment_Status: free ? 'SUCCESS' : 'PENDING', Gateway_Response_ID: '', Remarks: str(o.remarks).slice(0, 300),
  });
}

function serializePayment(p) {
  if (!p) return null;
  return {
    id: p.Payment_ID, amount: toNumber(p.Amount, 0), currency: p.Currency || 'INR', type: p.Payment_Type, gateway: p.Gateway,
    status: p.Payment_Status, transactionId: p.Transaction_ID, date: toDateKey(p.Payment_Date), remarks: p.Remarks,
    eventId: p.Event_ID, membershipId: p.Membership_ID, programId: p.Program_ID, registrationId: p.Registration_ID,
    createdAt: p.Created_At,
  };
}

function ownPayment(ctx, paymentId) {
  const student = requireStudent(ctx);
  const pay = Db.byId('Payments', str(paymentId));
  if (!pay || pay.Student_ID !== student.Student_ID) fail('NOT_FOUND', 'Payment not found.');
  return pay;
}

function razorpayRequest(method, path, body) {
  const auth = Utilities.base64Encode(prop(PROP.RAZORPAY_KEY_ID) + ':' + prop(PROP.RAZORPAY_KEY_SECRET));
  const opts = { method: method, muteHttpExceptions: true, headers: { Authorization: 'Basic ' + auth }, contentType: 'application/json' };
  if (body) opts.payload = JSON.stringify(body);
  const res = UrlFetchApp.fetch('https://api.razorpay.com/v1' + path, opts);
  const json = parseJsonSafe(res.getContentText(), {});
  if (res.getResponseCode() >= 300) {
    throw new Error('Razorpay ' + path + ' failed: ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 300));
  }
  return json;
}

/** Starts (or resumes) payment for a pending payment record. */
function actionStartPayment(p, ctx) {
  const pay = ownPayment(ctx, p.paymentId);
  const status = upper(pay.Payment_Status);
  if (status === 'SUCCESS') return { gateway: 'NONE', status: 'SUCCESS', payment: serializePayment(pay) };
  if (status !== 'PENDING') fail('NOT_ALLOWED', 'This payment can no longer be completed.');
  const gateway = paymentGateway();
  if (gateway === 'RAZORPAY') {
    let orderId = pay.Gateway_Order_ID;
    if (!orderId) {
      const order = razorpayRequest('post', '/orders', {
        amount: Math.round(toNumber(pay.Amount) * 100), currency: pay.Currency || 'INR', receipt: pay.Payment_ID,
        notes: { payment_id: pay.Payment_ID, type: pay.Payment_Type },
      });
      orderId = order.id;
      Db.update('Payments', pay.Payment_ID, { Gateway_Order_ID: orderId, Gateway: 'RAZORPAY' });
    }
    return {
      gateway: 'RAZORPAY', keyId: prop(PROP.RAZORPAY_KEY_ID), orderId: orderId, amount: Math.round(toNumber(pay.Amount) * 100),
      currency: pay.Currency || 'INR', name: getSettingValue('SITE_NAME'), description: pay.Remarks,
      prefill: { name: ctx.student.Full_Name, email: ctx.user.Email }, payment: serializePayment(pay),
    };
  }
  if (pay.Gateway !== 'MANUAL') Db.update('Payments', pay.Payment_ID, { Gateway: 'MANUAL' });
  return {
    gateway: 'MANUAL', instructions: getSettingValue('PAYMENT_INSTRUCTIONS'), amount: toNumber(pay.Amount),
    currency: pay.Currency || 'INR', reference: pay.Payment_ID, payment: serializePayment(pay),
  };
}

/** MANUAL gateway: the student submits their bank/UPI reference for verification. */
function actionSubmitPaymentReference(p, ctx) {
  const pay = ownPayment(ctx, p.paymentId);
  if (upper(pay.Payment_Status) !== 'PENDING') fail('NOT_ALLOWED', 'This payment is not pending.');
  validate(p, { reference: 'required|max:100' });
  Db.update('Payments', pay.Payment_ID, { Transaction_ID: str(p.reference), Remarks: (pay.Remarks + ' | Reference submitted by student').slice(0, 300) });
  return { submitted: true, payment: serializePayment(Db.byId('Payments', pay.Payment_ID)) };
}

/** Razorpay Checkout success handler — verifies the signature server-side. */
function actionVerifyPayment(p, ctx) {
  const pay = ownPayment(ctx, p.paymentId);
  if (upper(pay.Payment_Status) === 'SUCCESS') return { status: 'SUCCESS', payment: serializePayment(pay) };
  if (!pay.Gateway_Order_ID || str(p.razorpay_order_id) !== pay.Gateway_Order_ID) fail('PAYMENT_INVALID', 'Payment could not be verified.');
  const expected = hmacSha256Hex(pay.Gateway_Order_ID + '|' + str(p.razorpay_payment_id), prop(PROP.RAZORPAY_KEY_SECRET));
  if (!safeEqual(expected, str(p.razorpay_signature))) fail('PAYMENT_INVALID', 'Payment could not be verified.');
  let gp = razorpayRequest('get', '/payments/' + encodeURIComponent(str(p.razorpay_payment_id)));
  if (gp.order_id !== pay.Gateway_Order_ID || Number(gp.amount) !== Math.round(toNumber(pay.Amount) * 100)) {
    fail('PAYMENT_INVALID', 'Payment details do not match.');
  }
  if (gp.status === 'authorized') gp = razorpayRequest('post', '/payments/' + gp.id + '/capture', { amount: gp.amount, currency: gp.currency });
  if (gp.status !== 'captured') fail('PAYMENT_PENDING', 'Payment is not complete yet. It will update automatically once confirmed.');
  const updated = markPaymentSuccess(pay.Payment_ID, { transactionId: gp.id, gatewayResponseId: gp.id }, ctx);
  return { status: 'SUCCESS', payment: serializePayment(updated) };
}

/**
 * Razorpay webhook, forwarded by the website server with the raw body and
 * the X-Razorpay-Signature header. The signature is verified here.
 */
function actionPaymentWebhook(p) {
  const secret = prop(PROP.RAZORPAY_WEBHOOK_SECRET);
  if (!secret) fail('NOT_CONFIGURED', 'Webhook secret not configured.');
  const expected = hmacSha256Hex(str(p.rawBody), secret);
  if (!safeEqual(expected, str(p.signature))) fail('FORBIDDEN', 'Invalid signature.');
  const body = parseJsonSafe(p.rawBody, {});
  const entity = body.payload && body.payload.payment ? body.payload.payment.entity : null;
  if (!entity || !entity.order_id) return { ignored: true };
  const pay = Db.findOne('Payments', 'Gateway_Order_ID', entity.order_id);
  if (!pay) return { ignored: true };
  if ((body.event === 'payment.captured' || body.event === 'order.paid') && entity.status === 'captured' &&
      Number(entity.amount) === Math.round(toNumber(pay.Amount) * 100)) {
    markPaymentSuccess(pay.Payment_ID, { transactionId: entity.id, gatewayResponseId: body.event + ':' + entity.id }, null);
    return { processed: true };
  }
  if (body.event === 'payment.failed' && upper(pay.Payment_Status) === 'PENDING') {
    Db.update('Payments', pay.Payment_ID, { Gateway_Response_ID: 'payment.failed:' + entity.id,
      Remarks: (pay.Remarks + ' | Last attempt failed').slice(0, 300) });
  }
  return { processed: true };
}

/**
 * Marks a payment SUCCESS (idempotent) and applies its effects:
 * registration → PAID/CONFIRMED, membership → ACTIVE or awaiting approval,
 * program registration → CONFIRMED.
 */
function markPaymentSuccess(paymentId, info, ctx) {
  info = info || {};
  const done = withLock(function () {
    Db.refresh('Payments');
    const pay = Db.byId('Payments', paymentId);
    if (!pay) fail('NOT_FOUND', 'Payment not found.');
    if (upper(pay.Payment_Status) === 'SUCCESS') return { pay: pay, already: true };
    const updated = Db.update('Payments', pay.Payment_ID, {
      Payment_Status: 'SUCCESS', Payment_Date: todayKey(), Transaction_ID: info.transactionId || pay.Transaction_ID,
      Gateway_Response_ID: info.gatewayResponseId || pay.Gateway_Response_ID,
      Remarks: info.remarks ? (pay.Remarks + ' | ' + info.remarks).slice(0, 300) : pay.Remarks,
    });
    return { pay: updated, already: false };
  });
  if (done.already) return done.pay;
  const pay = done.pay;
  if (pay.Registration_ID) {
    const reg = Db.byId('Event_Registrations', pay.Registration_ID);
    if (reg) {
      Db.update('Event_Registrations', reg.Registration_ID, { Payment_Status: 'PAID', Registration_Status: 'CONFIRMED' });
      const ev = Db.byId('Events', reg.Event_ID) || {};
      notifyUser(pay.User_ID, 'Payment successful', 'Your payment for ' + (ev.Event_Name || 'the event') + ' was received. Registration ' +
        reg.Registration_Number + ' is confirmed.', 'PAYMENT', reg.Registration_ID);
      clearCacheForSheets(['Event_Registrations']);
    }
  }
  if (pay.Membership_ID) {
    const m = Db.byId('Memberships', pay.Membership_ID);
    if (m) {
      if (toBool(getSettingValue('MEMBERSHIP_AUTO_APPROVE', 'FALSE'))) {
        activateMembership(m, ctx, 'AUTO');
      } else {
        Db.update('Memberships', m.Membership_ID, { Remarks: 'Payment received — awaiting approval' });
        notifyUser(pay.User_ID, 'Payment successful', 'Your membership payment was received and is awaiting approval.', 'PAYMENT', m.Membership_ID);
      }
    }
  }
  if (pay.Program_Registration_ID) {
    const pr = Db.byId('Program_Registrations', pay.Program_Registration_ID);
    if (pr) {
      Db.update('Program_Registrations', pr.Program_Registration_ID, { Status: 'CONFIRMED' });
      const prog = Db.byId('Programs', pr.Program_ID) || {};
      notifyUser(pay.User_ID, 'Program registration confirmed', 'Your payment for ' + (prog.Program_Name || 'the program') +
        ' was received.', 'PROGRAM', pr.Program_Registration_ID);
    }
  }
  writeAuditLog(ctx, 'PAYMENT_SUCCESS', 'Payment', pay.Payment_ID, null, { Payment_Status: 'SUCCESS', Amount: pay.Amount });
  return pay;
}

/** Admin: verify manual payments, record refunds, failures or cancellations. */
function actionAdminUpdatePayment(p, ctx) {
  requireAdmin(ctx);
  const pay = Db.byId('Payments', str(p.paymentId));
  if (!pay) fail('NOT_FOUND', 'Payment not found.');
  const status = upper(p.status);
  if (PAYMENT_STATUSES.indexOf(status) === -1) fail('VALIDATION_ERROR', 'Invalid payment status.');
  if (status === 'SUCCESS') {
    const r = markPaymentSuccess(pay.Payment_ID, { transactionId: str(p.transactionId) || pay.Transaction_ID,
      gatewayResponseId: 'manual:' + ctx.user.User_ID, remarks: str(p.remarks) }, ctx);
    return serializePayment(r);
  }
  const updated = Db.update('Payments', pay.Payment_ID, {
    Payment_Status: status, Transaction_ID: str(p.transactionId) || pay.Transaction_ID,
    Remarks: str(p.remarks) ? (pay.Remarks + ' | ' + str(p.remarks)).slice(0, 300) : pay.Remarks,
  });
  if (pay.Registration_ID) {
    const regPatch = { Payment_Status: status === 'REFUNDED' ? 'REFUNDED' : status };
    if (status === 'REFUNDED' || status === 'CANCELLED') regPatch.Registration_Status = 'CANCELLED';
    Db.update('Event_Registrations', pay.Registration_ID, regPatch);
    clearCacheForSheets(['Event_Registrations']);
  }
  if (status === 'REFUNDED') notifyUser(pay.User_ID, 'Refund processed', 'Your payment ' + pay.Payment_ID + ' has been refunded.', 'PAYMENT', pay.Payment_ID);
  writeAuditLog(ctx, 'UPDATE_PAYMENT', 'Payment', pay.Payment_ID, { Payment_Status: pay.Payment_Status }, { Payment_Status: status });
  return serializePayment(updated);
}


// ===================================================================
// Public.gs
// ===================================================================

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


// ===================================================================
// Reports.gs
// ===================================================================

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


// ===================================================================
// Setup.gs
// ===================================================================

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


// ===================================================================
// Student.gs
// ===================================================================

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


// ===================================================================
// Triggers.gs
// ===================================================================

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


// ===================================================================
// Utils.gs
// ===================================================================

/**
 * Utils.gs — errors, dates (association timezone), validation, sanitising,
 * hashing and pagination helpers shared by every module.
 */

/** Error with a machine code and a user-friendly message. */
function ApiError(code, message, status) {
  this.name = 'ApiError';
  this.code = code;
  this.message = message || 'Something went wrong. Please try again.';
  this.status = status || 400;
}
ApiError.prototype = Object.create(Error.prototype);

function fail(code, message) {
  throw new ApiError(code, message);
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/* Dates — every lifecycle decision uses the association timezone.     */
/* ------------------------------------------------------------------ */

let _tzMemo = null;
function getTimezone() {
  if (_tzMemo) return _tzMemo;
  let tz = '';
  try { tz = getSettingValue('TIMEZONE', ''); } catch (e) { tz = ''; }
  _tzMemo = tz || DEFAULT_TIMEZONE;
  return _tzMemo;
}

function formatInTz(date, pattern) {
  return Utilities.formatDate(date, getTimezone(), pattern);
}

/** Today's date as yyyy-MM-dd in the association timezone. */
function todayKey() {
  return formatInTz(new Date(), 'yyyy-MM-dd');
}

/** Current local time as yyyy-MM-dd HH:mm in the association timezone. */
function nowLocalKey() {
  return formatInTz(new Date(), 'yyyy-MM-dd HH:mm');
}

/** ISO timestamp with offset, e.g. 2026-10-24T10:30:00+05:30 */
function nowIso() {
  return formatInTz(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX");
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

function pad2(n) { return (n < 10 ? '0' : '') + n; }

function validYmd(y, m, d) {
  if (!(y > 1900 && y < 3000 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return '';
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return '';
  return y + '-' + pad2(m) + '-' + pad2(d);
}

/**
 * Normalises a date cell/string into yyyy-MM-dd. Accepts Date objects,
 * 2026-10-24, 2026-10-24T10:00, 24-Oct-2026, 24 Oct 2026, 24/10/2026, 24-10-2026.
 */
function toDateKey(value) {
  if (value === null || value === undefined || value === '') return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (isNaN(value.getTime())) return '';
    return formatInTz(value, 'yyyy-MM-dd');
  }
  const s = String(value).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return validYmd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[\s\-\/\.]([A-Za-z]{3,9})[\s\-\/\.,]+(\d{4})/);
  if (m) {
    const mon = MONTHS[m[2].toLowerCase().slice(0, 3)];
    return mon ? validYmd(+m[3], mon, +m[1]) : '';
  }
  m = s.match(/^(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{4})/);
  if (m) return validYmd(+m[3], +m[2], +m[1]);
  return '';
}

/**
 * Normalises a date-time into 'yyyy-MM-dd HH:mm'. A bare date becomes the
 * start (00:00) or end (23:59) of that day depending on `endOfDay`.
 */
function toDateTimeKey(value, endOfDay) {
  if (value === null || value === undefined || value === '') return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (isNaN(value.getTime())) return '';
    const local = formatInTz(value, 'yyyy-MM-dd HH:mm');
    if (/ 00:00$/.test(local) && endOfDay) return local.slice(0, 10) + ' 23:59';
    return local;
  }
  const s = String(value).trim();
  const date = toDateKey(s);
  if (!date) return '';
  const t = s.match(/[T\s](\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
  if (t) {
    let h = +t[1];
    if (t[3]) {
      const pm = t[3].toLowerCase() === 'pm';
      if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12;
    }
    return date + ' ' + pad2(h) + ':' + t[2];
  }
  return date + (endOfDay ? ' 23:59' : ' 00:00');
}

function dateKeyToUtc(key) {
  const p = key.split('-');
  return Date.UTC(+p[0], +p[1] - 1, +p[2]);
}

/** Whole days from dateKey a to dateKey b (b - a). */
function daysBetween(a, b) {
  return Math.round((dateKeyToUtc(b) - dateKeyToUtc(a)) / 86400000);
}

function addDays(key, n) {
  const d = new Date(dateKeyToUtc(key) + n * 86400000);
  return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
}

function addMonths(key, n) {
  const p = key.split('-').map(Number);
  let y = p[0], m = p[1] - 1 + n;
  y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const d = Math.min(p[2], last);
  return y + '-' + pad2(m + 1) + '-' + pad2(d);
}

/** Age in completed years on a given date key. */
function ageOn(dobKey, onKey) {
  if (!dobKey || !onKey) return null;
  const a = dobKey.split('-').map(Number), b = onKey.split('-').map(Number);
  let age = b[0] - a[0];
  if (b[1] < a[1] || (b[1] === a[1] && b[2] < a[2])) age--;
  return age;
}

function currentYear() { return +todayKey().slice(0, 4); }

/* ------------------------------------------------------------------ */
/* Values                                                              */
/* ------------------------------------------------------------------ */

function toBool(v) {
  if (v === true) return true;
  if (v === false || v === null || v === undefined) return false;
  return ['TRUE', 'YES', 'Y', '1', 'ON'].indexOf(String(v).trim().toUpperCase()) !== -1;
}

function toNumber(v, fallback) {
  if (v === null || v === undefined || v === '') return fallback === undefined ? 0 : fallback;
  const n = Number(String(v).replace(/[,₹\s]/g, ''));
  return isNaN(n) ? (fallback === undefined ? 0 : fallback) : n;
}

function str(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function upper(v) { return str(v).toUpperCase(); }

/** Strips control characters and neutralises spreadsheet formulas. */
function sanitizeCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Object.prototype.toString.call(value) === '[object Date]') return value;
  let s = String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  if (s.length > 20000) s = s.slice(0, 20000);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}

/** Reverses the apostrophe guard when a value is read back. */
function unsanitizeCell(value) {
  if (typeof value === 'string' && /^'[=+\-@\t\r]/.test(value)) return value.slice(1);
  return value;
}

function slugify(text) {
  return str(text).toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'item';
}

function splitList(v) {
  if (Array.isArray(v)) return v.map(str).filter(Boolean);
  return str(v).split(/[\n,;|]+/).map(function (s) { return s.trim(); }).filter(Boolean);
}

function parseJsonSafe(s, fallback) {
  if (!s) return fallback;
  if (typeof s === 'object') return s;
  try { return JSON.parse(s); } catch (e) { return fallback; }
}

function pick(obj, keys) {
  const out = {};
  keys.forEach(function (k) { if (obj[k] !== undefined) out[k] = obj[k]; });
  return out;
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@<>()]+@[^\s@<>()]+\.[A-Za-z]{2,}$/;
const MOBILE_RE = /^\+?[0-9][0-9\s\-]{8,16}$/;

function isEmail(v) { return EMAIL_RE.test(str(v)); }
function isMobile(v) { return MOBILE_RE.test(str(v)); }

/**
 * Validates `data` against rules: { Field: 'required|email|mobile|date|number|min:0|max:200|in:A,B' }.
 * Throws VALIDATION_ERROR with a readable message listing the first problem.
 */
function validate(data, rules) {
  Object.keys(rules).forEach(function (field) {
    const label = field.replace(/_/g, ' ');
    const parts = rules[field].split('|');
    const value = data[field];
    const empty = value === undefined || value === null || str(value) === '';
    if (parts.indexOf('required') !== -1 && empty) fail('VALIDATION_ERROR', label + ' is required.');
    if (empty) return;
    parts.forEach(function (rule) {
      const r = rule.split(':');
      switch (r[0]) {
        case 'email': if (!isEmail(value)) fail('VALIDATION_ERROR', 'Please enter a valid email address.'); break;
        case 'mobile': if (!isMobile(value)) fail('VALIDATION_ERROR', 'Please enter a valid mobile number.'); break;
        case 'date': if (!toDateKey(value)) fail('VALIDATION_ERROR', label + ' must be a valid date.'); break;
        case 'number': if (isNaN(Number(String(value).replace(/,/g, '')))) fail('VALIDATION_ERROR', label + ' must be a number.'); break;
        case 'min': if (toNumber(value) < Number(r[1])) fail('VALIDATION_ERROR', label + ' must be at least ' + r[1] + '.'); break;
        case 'max': if (str(value).length > Number(r[1])) fail('VALIDATION_ERROR', label + ' is too long.'); break;
        case 'in': if (r[1].split(',').indexOf(upper(value)) === -1) fail('VALIDATION_ERROR', label + ' has an invalid value.'); break;
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* Hashing                                                             */
/* ------------------------------------------------------------------ */

function bytesToHex(bytes) {
  return bytes.map(function (b) { const v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}

function sha256Hex(text) {
  return bytesToHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8));
}

function hmacSha256Hex(data, key) {
  return bytesToHex(Utilities.computeHmacSha256Signature(data, key, Utilities.Charset.UTF_8));
}

function randomToken() {
  return sha256Hex(Utilities.getUuid() + ':' + Utilities.getUuid() + ':' + new Date().getTime() + ':' + Math.random());
}

/** Short human-friendly verification code (no ambiguous characters). */
function randomCode(length) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const hex = randomToken();
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[parseInt(hex.substr(i * 2, 2), 16) % alphabet.length];
  return out;
}

/** PBKDF2-HMAC-SHA256 (single 32-byte block) → hex. */
function pbkdf2Hex(password, saltHex, iterations) {
  const pw = Utilities.newBlob(String(password)).getBytes();
  const salt = Utilities.newBlob(saltHex).getBytes().concat([0, 0, 0, 1]);
  let u = Utilities.computeHmacSha256Signature(salt, pw);
  const t = u.slice();
  for (let i = 1; i < iterations; i++) {
    u = Utilities.computeHmacSha256Signature(u, pw);
    for (let j = 0; j < t.length; j++) t[j] ^= u[j];
  }
  return bytesToHex(t);
}

/** Constant-time string comparison. */
function safeEqual(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/* ------------------------------------------------------------------ */
/* Lists                                                               */
/* ------------------------------------------------------------------ */

function paginate(items, page, pageSize) {
  const size = Math.max(1, Math.min(200, Math.floor(toNumber(pageSize, 25)) || 25));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const p = Math.max(1, Math.min(totalPages, Math.floor(toNumber(page, 1)) || 1));
  return { items: items.slice((p - 1) * size, p * size), page: p, pageSize: size, total: total, totalPages: totalPages };
}

function textMatch(record, fields, q) {
  if (!q) return true;
  const needle = String(q).toLowerCase();
  for (let i = 0; i < fields.length; i++) {
    if (String(record[fields[i]] || '').toLowerCase().indexOf(needle) !== -1) return true;
  }
  return false;
}

function sortBy(items, field, dir) {
  const d = dir === 'desc' ? -1 : 1;
  return items.slice().sort(function (a, b) {
    const x = a[field], y = b[field];
    const nx = Number(x), ny = Number(y);
    if (x !== '' && y !== '' && !isNaN(nx) && !isNaN(ny)) return (nx - ny) * d;
    return String(x || '').localeCompare(String(y || '')) * d;
  });
}

function groupCount(items, keyFn) {
  const out = {};
  items.forEach(function (i) { const k = keyFn(i) || 'Unspecified'; out[k] = (out[k] || 0) + 1; });
  return out;
}

function indexBy(items, field) {
  const out = {};
  items.forEach(function (i) { out[i[field]] = i; });
  return out;
}

function lastNMonths(n) {
  const out = [];
  let key = todayKey().slice(0, 7) + '-01';
  for (let i = 0; i < n; i++) { out.unshift(key.slice(0, 7)); key = addMonths(key, -1); }
  return out;
}
