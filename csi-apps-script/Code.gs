/**
 * COMP CSI backend — separate from google-apps-script/Code.gs.
 *
 * Required Script Properties (Apps Script > Project Settings > Script properties):
 *   CSI_SPREADSHEET_ID  = ID of the dedicated CSI Google Spreadsheet
 *   COMP_WEB_APP_URL    = deployed COMP authentication Web App URL ending in /exec
 *
 * Do not place either spreadsheet ID or private configuration in GitHub.
 * Deploy this project as a Web App that executes as the owner. The browser-facing
 * API still validates every CSI request against the existing COMP auth backend.
 */

const CSI_HISTORY_SHEET = 'CSI Work History';
const CSI_SUMMARY_SHEET = 'CSI Summary';

const CSI_HISTORY_HEADERS = [
  'Record ID',
  'Record At',
  'Work Date',
  'Nama DC',
  'Frame Side',
  'Job Type',
  'Recorded By User ID',
  'Recorded By Username',
  'Notes'
];

const CSI_SUMMARY_HEADERS = [
  'Nama DC',
  'Frame Side',
  'Last Work Date',
  'Last Job Type',
  'Age Days',
  'Status',
  'Updated At'
];

function doGet(e) {
  const action = String(e && e.parameter && e.parameter.action || 'health').trim();
  if (action !== 'health') return csiJson_({ ok: false, error: 'Unsupported action.' });
  return csiJson_({ ok: true, service: 'COMP CSI', configured: Boolean(csiGetProperty_('CSI_SPREADSHEET_ID') && csiGetProperty_('COMP_WEB_APP_URL')) });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e && e.postData && e.postData.contents || '{}');
    const action = String(payload.action || '').trim();
    if (action === 'validateAccess') {
      const user = csiRequireUser_(payload.session);
      return csiJson_({ ok: true, authenticated: true, authorized: true, user: { id: user.id, username: user.username, role: user.role } });
    }
    if (action === 'getHighTempSummary') {
      csiRequireUser_(payload.session, true);
      return csiJson_({ ok: true, rows: csiBuildHighTempSummary_() });
    }
    if (action === 'getHistory') {
      csiRequireUser_(payload.session);
      const sheet = csiGetSheet_(CSI_HISTORY_SHEET, CSI_HISTORY_HEADERS);
      const lastRow = sheet.getLastRow();
      const rows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, CSI_HISTORY_HEADERS.length).getValues() : [];
      return csiJson_({ ok: true, rows: rows.map(csiSerializeRow_) });
    }
    if (action === 'saveWork') {
      const user = csiRequireUser_(payload.session);
      const rows = csiSaveWork_(payload, user);
      return csiJson_({ ok: true, saved: rows.length, rows });
    }
    return csiJson_({ ok: false, error: 'Unsupported action.' });
  } catch (error) {
    console.error(error);
    return csiJson_({ ok: false, error: error && error.message ? error.message : 'CSI request failed.' });
  }
}

function setupCsiSheets() {
  const spreadsheetId = csiGetProperty_('CSI_SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('Set CSI_SPREADSHEET_ID in Script Properties first.');
  console.log('[CSI setup] Opening spreadsheet ID suffix: ' + spreadsheetId.slice(-6));
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  console.log('[CSI setup] Destination spreadsheet: ' + spreadsheet.getName());
  console.log('[CSI setup] Destination URL: ' + spreadsheet.getUrl());
  const historySheet = csiEnsureSheet_(spreadsheet, CSI_HISTORY_SHEET, CSI_HISTORY_HEADERS);
  const summarySheet = csiEnsureSheet_(spreadsheet, CSI_SUMMARY_SHEET, CSI_SUMMARY_HEADERS);
  SpreadsheetApp.flush();
  const actualSheetNames = spreadsheet.getSheets().map(sheet => sheet.getName());
  if (!spreadsheet.getSheetByName(CSI_HISTORY_SHEET) || !spreadsheet.getSheetByName(CSI_SUMMARY_SHEET)) throw new Error('Setup belum lengkap. Tab yang terbaca: ' + actualSheetNames.join(', '));
  const result = { ok: true, spreadsheetName: spreadsheet.getName(), spreadsheetUrl: spreadsheet.getUrl(), sheets: actualSheetNames, historyHeaderColumns: historySheet.getLastColumn(), summaryHeaderColumns: summarySheet.getLastColumn() };
  console.log('[CSI setup] Verification result: ' + JSON.stringify(result));
  return result;
}

function csiSaveWork_(payload, user) {
  const dcName = String(payload.dcName || '').trim().toUpperCase();
  const workDateText = String(payload.workDate || '').trim();
  const frameSide = String(payload.frameSide || '').trim();
  const jobType = String(payload.jobType || '').trim();
  const notes = String(payload.notes || '').trim().slice(0, 500);
  if (!/^GBE\.[A-F]\d+[A-Z]?$/.test(dcName)) throw new Error('Nama DC tidak valid. Pilih DC dari daftar master data.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDateText)) throw new Error('Tanggal pekerjaan tidak valid.');
  const workDate = new Date(workDateText + 'T12:00:00');
  if (isNaN(workDate.getTime()) || Utilities.formatDate(workDate, Session.getScriptTimeZone(), 'yyyy-MM-dd') !== workDateText) throw new Error('Tanggal pekerjaan tidak valid.');
  const sides = frameSide === 'Both' ? ['A', 'B'] : [frameSide];
  if (!sides.every(side => side === 'A' || side === 'B')) throw new Error('Pilih sisi A, sisi B, atau kedua sisi.');
  if (jobType !== 'Cleaning' && jobType !== 'Replace') throw new Error('Jenis pekerjaan harus Cleaning atau Replace.');
  if (workDate.getTime() > new Date().getTime() + 86400000) throw new Error('Tanggal pekerjaan tidak boleh di masa depan.');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const history = csiGetSheet_(CSI_HISTORY_SHEET, CSI_HISTORY_HEADERS);
    const now = new Date();
    const rows = sides.map(side => [Utilities.getUuid(), now, workDate, dcName, side, jobType, user.id, user.username, notes]);
    history.getRange(history.getLastRow() + 1, 1, rows.length, CSI_HISTORY_HEADERS.length).setValues(rows);
    sides.forEach(side => csiRefreshSummary_(dcName, side));
    SpreadsheetApp.flush();
    return rows.map(row => csiSerializeRow_(row));
  } finally { lock.releaseLock(); }
}

function csiRefreshSummary_(dcName, side) {
  const spreadsheet = SpreadsheetApp.openById(csiGetProperty_('CSI_SPREADSHEET_ID'));
  const history = csiEnsureSheet_(spreadsheet, CSI_HISTORY_SHEET, CSI_HISTORY_HEADERS);
  const summary = csiEnsureSheet_(spreadsheet, CSI_SUMMARY_SHEET, CSI_SUMMARY_HEADERS);
  const lastRow = history.getLastRow();
  const values = lastRow > 1 ? history.getRange(2, 1, lastRow - 1, CSI_HISTORY_HEADERS.length).getValues() : [];
  const matching = values.filter(row => String(row[3]) === dcName && String(row[4]) === side)
    .sort((a,b) => new Date(b[2]).getTime() - new Date(a[2]).getTime() || new Date(b[1]).getTime() - new Date(a[1]).getTime());
  if (!matching.length) return;

  const latestWork = matching[0];
  const latestCleaning = matching.find(row => String(row[5]) === 'Cleaning') || null;
  const now = new Date();
  let ageDays = '';
  let status = 'Belum ada data cleaning';
  if (latestCleaning) {
    const tz = Session.getScriptTimeZone();
    const todayText = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
    const dateText = Utilities.formatDate(latestCleaning[2] instanceof Date ? latestCleaning[2] : new Date(latestCleaning[2]), tz, 'yyyy-MM-dd');
    ageDays = Math.max(0, Math.floor((Date.parse(todayText + 'T00:00:00Z') - Date.parse(dateText + 'T00:00:00Z')) / 86400000));
    status = ageDays >= 30 ? 'Perlu Cleaning' : 'Normal';
  }
  const summaryRow = [dcName, side, latestWork[2], String(latestWork[5]), ageDays, status, now];
  const existing = summary.getLastRow() > 1 ? summary.getRange(2, 1, summary.getLastRow() - 1, 2).getDisplayValues() : [];
  const index = existing.findIndex(row => row[0] === dcName && row[1] === side);
  if (index >= 0) summary.getRange(index + 2, 1, 1, summaryRow.length).setValues([summaryRow]);
  else summary.getRange(summary.getLastRow() + 1, 1, 1, summaryRow.length).setValues([summaryRow]);
}

function csiRequireUser_(sessionToken, allowAnyActiveRole) {
  const token = String(sessionToken || '').trim();
  if (!token || token.length > 200) {
    throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
  }

  const compUrl = csiGetProperty_('COMP_WEB_APP_URL');
  if (!compUrl || !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/.test(compUrl)) {
    throw new Error('COMP_WEB_APP_URL belum dikonfigurasi dengan benar.');
  }

  const response = UrlFetchApp.fetch(compUrl, {
    method: 'post',
    contentType: 'text/plain;charset=UTF-8',
    payload: JSON.stringify({ action: 'validateSession', session: token }),
    followRedirects: true,
    muteHttpExceptions: true
  });

  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error('Sesi login tidak dapat diverifikasi oleh COMP.');
  }

  let result;
  try {
    result = JSON.parse(response.getContentText());
  } catch (_) {
    throw new Error('Respons validasi sesi COMP tidak valid.');
  }

  if (!result || result.authenticated !== true || !result.user) {
    throw new Error('Sesi login tidak valid atau sudah berakhir.');
  }

  const user = result.user;
  if (String(user.status || '').trim().toLowerCase() !== 'active') {
    throw new Error('Akun COMP tidak aktif.');
  }
  if (!allowAnyActiveRole && String(user.role || '').trim().toUpperCase() !== 'CSI') {
    throw new Error('Akses ditolak. Halaman ini khusus anggota CSI.');
  }
  if (!String(user.id || '').trim()) {
    throw new Error('Identitas akun COMP tidak valid.');
  }

  return {
    id: String(user.id).trim(),
    username: String(user.username || '').trim(),
    role: String(user.role).trim()
  };
}


function csiBuildHighTempSummary_() {
  const sheet = csiGetSheet_(CSI_HISTORY_SHEET, CSI_HISTORY_HEADERS);
  const last = sheet.getLastRow();
  const rows = last > 1 ? sheet.getRange(2, 1, last - 1, CSI_HISTORY_HEADERS.length).getValues() : [];
  const map = new Map();
  const tz = Session.getScriptTimeZone();
  const today = Date.parse(Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd') + 'T00:00:00Z');
  rows.forEach(row => {
    const dc = String(row[3] || '').trim(), side = String(row[4] || '').trim(), type = String(row[5] || '').trim();
    if (!dc || !['A', 'B'].includes(side)) return;
    const d = row[2] instanceof Date ? row[2] : new Date(row[2]);
    if (isNaN(d.getTime())) return;
    const date = Utilities.formatDate(d, tz, 'yyyy-MM-dd');
    const key = dc + '|' + side;
    const item = map.get(key) || { dcName: dc, frameSide: side, lastWorkDate: '', lastJobType: '', lastCleaningDate: '', lastReplaceDate: '' };
    if (!item.lastWorkDate || date >= item.lastWorkDate) { item.lastWorkDate = date; item.lastJobType = type; }
    if (type === 'Cleaning' && (!item.lastCleaningDate || date > item.lastCleaningDate)) item.lastCleaningDate = date;
    if (type === 'Replace' && (!item.lastReplaceDate || date > item.lastReplaceDate)) item.lastReplaceDate = date;
    map.set(key, item);
  });
  return [...map.values()].map(item => {
    item.ageDays = item.lastCleaningDate ? Math.max(0, Math.floor((today - Date.parse(item.lastCleaningDate + 'T00:00:00Z')) / 86400000)) : null;
    item.status = item.ageDays === null ? 'Belum ada cleaning' : item.ageDays >= 30 ? 'Perlu Cleaning' : 'Normal';
    return item;
  });
}

function csiGetProperty_(name) {
  return String(PropertiesService.getScriptProperties().getProperty(name) || '').trim();
}

function csiGetSheet_(sheetName, headers) {
  const spreadsheetId = csiGetProperty_('CSI_SPREADSHEET_ID');
  if (!spreadsheetId) {
    throw new Error('CSI_SPREADSHEET_ID belum dikonfigurasi di Script Properties.');
  }
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  return csiEnsureSheet_(spreadsheet, sheetName, headers);
}

function csiEnsureSheet_(spreadsheet, sheetName, headers) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(sheetName);

  const lastColumn = sheet.getLastColumn();
  const firstRow = lastColumn
    ? sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(v => String(v || '').trim())
    : [];

  if (sheet.getLastRow() === 0 || firstRow.every(value => !value)) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  const matches = firstRow.length === headers.length &&
    headers.every((header, index) => firstRow[index] === header);
  if (!matches) {
    throw new Error('Struktur kolom sheet "' + sheetName + '" tidak sesuai. Header tidak diubah otomatis untuk mencegah kehilangan data.');
  }
  return sheet;
}

function csiSerializeRow_(row) {
  return row.map(value => value instanceof Date ? value.toISOString() : value);
}

function csiJson_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
