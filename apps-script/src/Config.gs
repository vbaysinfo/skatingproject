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
