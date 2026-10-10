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
  if (action !== 'health') {
    return csiJson_({ ok: false, error: 'Unsupported action.' });
  }

  return csiJson_({
    ok: true,
    service: 'COMP CSI',
    configured: Boolean(csiGetProperty_('CSI_SPREADSHEET_ID') && csiGetProperty_('COMP_WEB_APP_URL'))
  });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e && e.postData && e.postData.contents || '{}');
    const action = String(payload.action || '').trim();

    if (action === 'validateAccess') {
      const user = csiRequireUser_(payload.session);
      return csiJson_({
        ok: true,
        authenticated: true,
        authorized: true,
        user: { id: user.id, username: user.username, role: user.role }
      });
    }

    if (action === 'getHistory') {
      csiRequireUser_(payload.session);
      const sheet = csiGetSheet_(CSI_HISTORY_SHEET, CSI_HISTORY_HEADERS);
      const lastRow = sheet.getLastRow();
      const rows = lastRow > 1
        ? sheet.getRange(2, 1, lastRow - 1, CSI_HISTORY_HEADERS.length).getValues()
        : [];
      return csiJson_({ ok: true, rows: rows.map(csiSerializeRow_) });
    }

    return csiJson_({ ok: false, error: 'Unsupported action.' });
  } catch (error) {
    console.error(error);
    return csiJson_({
      ok: false,
      error: error && error.message ? error.message : 'CSI request failed.'
    });
  }
}

/**
 * Run manually from the Apps Script editor after setting CSI_SPREADSHEET_ID.
 * Creates/initializes only CSI-owned tabs; does not touch COMP sheets.
 */
function setupCsiSheets() {
  const spreadsheetId = csiGetProperty_('CSI_SPREADSHEET_ID');
  if (!spreadsheetId) {
    throw new Error('Set CSI_SPREADSHEET_ID in Script Properties first.');
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  csiEnsureSheet_(spreadsheet, CSI_HISTORY_SHEET, CSI_HISTORY_HEADERS);
  csiEnsureSheet_(spreadsheet, CSI_SUMMARY_SHEET, CSI_SUMMARY_HEADERS);
  SpreadsheetApp.flush();

  return {
    ok: true,
    spreadsheetName: spreadsheet.getName(),
    sheets: [CSI_HISTORY_SHEET, CSI_SUMMARY_SHEET]
  };
}

function csiRequireUser_(sessionToken) {
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
  if (String(user.role || '').trim().toUpperCase() !== 'CSI') {
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
