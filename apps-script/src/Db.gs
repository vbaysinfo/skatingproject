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
