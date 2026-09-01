const SPREADSHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
const WORK_SHEET_NAME = 'Work Items';

// Optional lightweight request key. This is NOT a secret when the frontend is public.
// Keep both this value and google-sheets-config.js requestKey empty to disable it.
const REQUEST_KEY = '';

const HEADERS = [
  'IP',
  'Nama DC',
  'Zona',
  'Repeat Zero',
  'Engineer ID',
  'Status',
  'Timestamp',
  'Catatan'
];

const ALLOWED_STATUSES = [
  'Belum Dikerjakan',
  'In Progress',
  'Selesai',
  'Problem',
  'Skipped'
];

function doGet() {
  return jsonResponse({
    ok: true,
    service: 'COMP Work Tracking',
    sheet: WORK_SHEET_NAME,
    configured: SPREADSHEET_ID !== 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE'
  });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e?.postData?.contents || '{}');

    if (REQUEST_KEY && payload.requestKey !== REQUEST_KEY) {
      return jsonResponse({ ok: false, error: 'Invalid request key.' });
    }

    if (payload.action !== 'upsertWorkItems') {
      return jsonResponse({ ok: false, error: 'Unsupported action.' });
    }

    if (SPREADSHEET_ID === 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE') {
      return jsonResponse({ ok: false, error: 'Spreadsheet ID is not configured.' });
    }

    const items = payload.items && typeof payload.items === 'object' ? payload.items : {};
    const rows = Object.values(items);

    if (!rows.length) {
      return jsonResponse({ ok: false, error: 'No work items supplied.' });
    }

    if (rows.length > 200) {
      return jsonResponse({ ok: false, error: 'Too many work items in one request.' });
    }

    const sheet = getWorkSheet();
    const data = sheet.getDataRange().getValues();
    const rowByIp = new Map();

    for (let r = 1; r < data.length; r++) {
      const ip = String(data[r][0] || '').trim();
      if (ip) rowByIp.set(ip, r + 1);
    }

    const now = new Date();
    let saved = 0;

    rows.forEach(item => {
      const ip = String(item?.ip || '').trim();
      const name = String(item?.name || '').trim();
      const zone = String(item?.zone || '-').trim() || '-';
      const repeat = Number(item?.repeat || 0);
      const engineerId = String(item?.engineerId || '').trim();
      const status = String(item?.status || '').trim();
      const note = String(item?.note || '').trim();

      if (!isValidIpv4(ip)) return;
      if (!engineerId) return;
      if (!ALLOWED_STATUSES.includes(status)) return;
      if (note.length > 500) return;

      const values = [[ip, name, zone, repeat, engineerId, status, now, note]];
      const existingRow = rowByIp.get(ip);

      if (existingRow) {
        sheet.getRange(existingRow, 1, 1, HEADERS.length).setValues(values);
      } else {
        sheet.getRange(sheet.getLastRow() + 1, 1, 1, HEADERS.length).setValues(values);
      }

      saved++;
    });

    SpreadsheetApp.flush();

    return jsonResponse({
      ok: true,
      saved,
      updatedAt: now.toISOString()
    });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: error.message || 'Unknown server error.' });
  }
}

function getWorkSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(WORK_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(WORK_SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function isValidIpv4(value) {
  const parts = value.split('.');
  return parts.length === 4 && parts.every(part => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const number = Number(part);
    return number >= 0 && number <= 255;
  });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
