/**
 * In-memory mocks of the Google Apps Script services used by the backend,
 * so the real .gs sources can be executed and tested with Node.js.
 */
'use strict';
const crypto = require('crypto');

function toSigned(buf) { return Array.from(buf).map((b) => (b > 127 ? b - 256 : b)); }
function toBuf(v) {
  if (Array.isArray(v)) return Buffer.from(v.map((b) => (b < 0 ? b + 256 : b)));
  return Buffer.from(String(v), 'utf8');
}

/* ---------------- Utilities ---------------- */
function formatDate(date, tz, pattern) {
  const parts = {};
  new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    second: '2-digit', hourCycle: 'h23' }).formatToParts(date).forEach((p) => { parts[p.type] = p.value; });
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const offMin = Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  const sign = offMin >= 0 ? '+' : '-';
  const abs = Math.abs(offMin);
  const xxx = offMin === 0 ? 'Z' : sign + String(Math.floor(abs / 60)).padStart(2, '0') + ':' + String(abs % 60).padStart(2, '0');
  let out = '';
  for (let i = 0; i < pattern.length;) {
    if (pattern[i] === "'") { const j = pattern.indexOf("'", i + 1); out += pattern.slice(i + 1, j); i = j + 1; continue; }
    const tokens = [['yyyy', parts.year], ['MM', parts.month], ['dd', parts.day], ['HH', parts.hour], ['mm', parts.minute], ['ss', parts.second], ['XXX', xxx]];
    const t = tokens.find(([k]) => pattern.startsWith(k, i));
    if (t) { out += t[1]; i += t[0].length; } else { out += pattern[i]; i++; }
  }
  return out;
}

function makeBlob(bytes, mime, name) {
  let data = bytes;
  let n = name || 'blob';
  return {
    getBytes: () => (typeof data === 'string' ? toSigned(Buffer.from(data, 'utf8')) : data),
    getContentType: () => mime || 'application/octet-stream',
    getName: () => n,
    setName(x) { n = x; return this; },
    getDataAsString: () => (typeof data === 'string' ? data : toBuf(data).toString('utf8')),
  };
}

const Utilities = {
  DigestAlgorithm: { SHA_256: 'sha256' },
  Charset: { UTF_8: 'utf8' },
  formatDate,
  computeDigest: (alg, text) => toSigned(crypto.createHash(alg).update(toBuf(text)).digest()),
  computeHmacSha256Signature: (value, key) => toSigned(crypto.createHmac('sha256', toBuf(key)).update(toBuf(value)).digest()),
  getUuid: () => crypto.randomUUID(),
  base64Encode: (v) => toBuf(v).toString('base64'),
  base64Decode: (s) => toSigned(Buffer.from(s, 'base64')),
  newBlob: (data, mime, name) => makeBlob(typeof data === 'string' ? toSigned(Buffer.from(data, 'utf8')) : data, mime, name),
};

/* ---------------- Spreadsheet ---------------- */
class Range {
  constructor(sheet, row, col, nr, nc) { Object.assign(this, { sheet, row, col, nr, nc }); }
  getValues() {
    const out = [];
    for (let r = 0; r < this.nr; r++) {
      const line = [];
      for (let c = 0; c < this.nc; c++) {
        const v = (this.sheet.data[this.row - 1 + r] || [])[this.col - 1 + c];
        line.push(v === undefined ? '' : v);
      }
      out.push(line);
    }
    return out;
  }
  setValues(values) {
    if (values.length !== this.nr || values.some((r) => r.length !== this.nc)) throw new Error('setValues dimension mismatch');
    values.forEach((line, r) => {
      const idx = this.row - 1 + r;
      while (this.sheet.data.length <= idx) this.sheet.data.push([]);
      line.forEach((v, c) => {
        let val = v;
        if (typeof val === 'string' && /^[=+@]/.test(val)) this.sheet.formulaWrites++;
        // Mimic Sheets: a leading apostrophe is a text marker and is not stored.
        if (typeof val === 'string' && val.startsWith("'")) val = val.slice(1);
        this.sheet.data[idx][this.col - 1 + c] = val;
      });
    });
    return this;
  }
  setValue(v) { return this.setValues([[v]]); }
  setNumberFormat() { return this; }
  setFontWeight() { return this; }
  setBackground() { return this; }
  setFontColor() { return this; }
  clearContent() {
    for (let r = 0; r < this.nr; r++) for (let c = 0; c < this.nc; c++) { const row = this.sheet.data[this.row - 1 + r]; if (row) row[this.col - 1 + c] = ''; }
    return this;
  }
  getRow() { return this.row; }
  getLastRow() { return this.row + this.nr - 1; }
  getColumn() { return this.col; }
  getNumColumns() { return this.nc; }
  getSheet() { return this.sheet; }
}

class Sheet {
  constructor(name, ss) { this.name = name; this.ss = ss; this.data = []; this.formulaWrites = 0; }
  getName() { return this.name; }
  getLastRow() {
    for (let i = this.data.length - 1; i >= 0; i--) if ((this.data[i] || []).some((v) => v !== '' && v !== undefined && v !== null)) return i + 1;
    return 0;
  }
  getLastColumn() { return this.data.reduce((m, r) => { let last = 0; (r || []).forEach((v, i) => { if (v !== '' && v !== undefined) last = i + 1; }); return Math.max(m, last); }, 0); }
  getMaxRows() { return Math.max(1000, this.data.length); }
  getRange(row, col, nr, nc) { return new Range(this, row, col, nr || 1, nc || 1); }
  setFrozenRows() { return this; }
  deleteRow(row) { this.data.splice(row - 1, 1); }
}

class Spreadsheet {
  constructor(id, name) { this.id = id; this.name = name; this.sheets = [new Sheet('Sheet1', this)]; }
  getId() { return this.id; }
  getUrl() { return 'https://docs.google.com/spreadsheets/d/' + this.id; }
  getSheetByName(n) { return this.sheets.find((s) => s.name === n) || null; }
  insertSheet(n) { const s = new Sheet(n, this); this.sheets.push(s); return s; }
  getSheets() { return this.sheets; }
  deleteSheet(s) { this.sheets = this.sheets.filter((x) => x !== s); }
}

function createEnv(opts = {}) {
  const store = { spreadsheets: {}, props: {}, cache: {}, files: {}, folders: {}, mails: [], triggers: [], fetches: [] };
  let idc = 0;
  const newId = (p) => p + 'x'.repeat(10) + String(++idc).padStart(20, '0');

  const SpreadsheetApp = {
    openById: (id) => { if (!store.spreadsheets[id]) throw new Error('No spreadsheet ' + id); return store.spreadsheets[id]; },
    create: (name) => { const id = newId('SS'); store.spreadsheets[id] = new Spreadsheet(id, name); store.files[id] = makeFile(id, name, 'sheet'); return store.spreadsheets[id]; },
    flush: () => {},
    getUi: () => { throw new Error('No UI'); },
  };

  const PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (k) => (store.props[k] === undefined ? null : store.props[k]),
      setProperty: (k, v) => { store.props[k] = String(v); },
      deleteProperty: (k) => { delete store.props[k]; },
    }),
  };

  const CacheService = {
    getScriptCache: () => ({
      get: (k) => { const e = store.cache[k]; if (!e || e.exp < Date.now()) return null; return e.v; },
      put: (k, v, s) => { if (String(v).length > 100000) throw new Error('Cache value too large'); store.cache[k] = { v: String(v), exp: Date.now() + (s || 600) * 1000 }; },
      getAll: (keys) => { const o = {}; keys.forEach((k) => { const e = store.cache[k]; if (e && e.exp >= Date.now()) o[k] = e.v; }); return o; },
      putAll: (map, s) => { Object.keys(map).forEach((k) => { store.cache[k] = { v: map[k], exp: Date.now() + (s || 600) * 1000 }; }); },
      remove: (k) => { delete store.cache[k]; },
    }),
  };

  const LockService = { getScriptLock: () => ({ tryLock: () => true, waitLock: () => {}, releaseLock: () => {}, hasLock: () => true }) };

  function makeFile(id, name, kind, blob, parent) {
    const f = {
      id, name, kind, blob, parent, sharing: 'PRIVATE', trashed: false,
      getId: () => id, getName: () => f.name, getUrl: () => 'https://drive.google.com/file/d/' + id + '/view',
      setSharing: (a) => { f.sharing = a; return f; }, setTrashed: (t) => { f.trashed = t; return f; },
      getBlob: () => blob, moveTo: (folder) => { f.parent = folder.getId(); return f; },
    };
    return f;
  }
  function makeFolder(id, name, parent) {
    const folder = {
      id, name, parent,
      getId: () => id, getName: () => name, getUrl: () => 'https://drive.google.com/drive/folders/' + id,
      createFolder: (n) => { const fid = newId('FD'); store.folders[fid] = makeFolder(fid, n, id); return store.folders[fid]; },
      getFoldersByName: (n) => {
        const list = Object.values(store.folders).filter((x) => x.parent === id && x.name === n);
        return { hasNext: () => list.length > 0, next: () => list.shift() };
      },
      createFile: (blob) => { const fid = newId('FL'); store.files[fid] = makeFile(fid, blob.getName(), 'file', blob, id); return store.files[fid]; },
    };
    return folder;
  }
  const rootId = 'ROOTFOLDER' + 'x'.repeat(20);
  store.folders[rootId] = makeFolder(rootId, 'Association Root', null);

  const DriveApp = {
    Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' }, Permission: { VIEW: 'VIEW' },
    getFolderById: (id) => { if (!store.folders[id]) throw new Error('No folder ' + id); return store.folders[id]; },
    getFileById: (id) => { if (!store.files[id]) throw new Error('No file ' + id); return store.files[id]; },
  };

  const UrlFetchApp = {
    fetch: (url, o) => {
      store.fetches.push({ url, o });
      const r = (opts.fetchHandler || (() => ({ code: 200, body: '' })))(url, o || {});
      return { getResponseCode: () => r.code, getContentText: () => (typeof r.body === 'string' ? r.body : JSON.stringify(r.body)),
        getBlob: () => makeBlob(toSigned(Buffer.from('PNG')), 'image/png', 'qr.png') };
    },
  };

  const ctx = {
    console: { log: () => {}, warn: () => {}, error: opts.verbose ? console.error : () => {} },
    Utilities, SpreadsheetApp, PropertiesService, CacheService, LockService, DriveApp, UrlFetchApp,
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ content: s, setMimeType() { return this; } }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.org' }) },
    MailApp: { getRemainingDailyQuota: () => 100, sendEmail: (m) => store.mails.push(m) },
    HtmlService: { createHtmlOutput: (html) => ({ getAs: (mime) => makeBlob(html, mime, 'doc.pdf') }) },
    ScriptApp: {
      getProjectTriggers: () => store.triggers,
      deleteTrigger: (t) => { store.triggers = store.triggers.filter((x) => x !== t); },
      newTrigger: (fn) => {
        const b = { timeBased: () => b, everyDays: () => b, atHour: () => b, inTimezone: () => b, everyHours: () => b, forSpreadsheet: () => b, onEdit: () => b,
          create: () => { const t = { getHandlerFunction: () => fn }; store.triggers.push(t); return t; } };
        return b;
      },
    },
    Intl, Date, Math, JSON, Object, Array, String, Number, Boolean, RegExp, Error, isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
  };
  return { ctx, store, rootId };
}

module.exports = { createEnv };
