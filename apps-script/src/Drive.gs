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
