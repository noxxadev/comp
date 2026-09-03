const SPREADSHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
const WORK_SHEET_NAME = 'Work Items';
const HISTORY_SHEET_NAME = 'Work History';

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

const HISTORY_HEADERS = [
  'Event ID',
  'Timestamp',
  'IP',
  'Serial Number',
  'Location ID',
  'Nama DC',
  'Zona',
  'Repeat Zero',
  'Engineer ID',
  'Status',
  'Catatan',
  'Resolution Status',
  'Resolution Message',
  'Source'
];

const ALLOWED_STATUSES = [
  'Belum Dikerjakan',
  'In Progress',
  'Selesai',
  'Problem',
  'Skipped'
];

const ALLOWED_RESOLUTION_STATUSES = [
  'resolved',
  'unresolved',
  'ambiguous',
  'missing-location',
  'invalid-time'
];

function doGet(e) {
  try {
    const action = String(e?.parameter?.action || '').trim();

    if (REQUEST_KEY && e?.parameter?.requestKey !== REQUEST_KEY) {
      return jsonResponse({ ok: false, error: 'Invalid request key.' });
    }

    if (SPREADSHEET_ID === 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE') {
      return jsonResponse({ ok: false, error: 'Spreadsheet ID is not configured.' });
    }

    if (action === 'getWorkHistory') {
      return getWorkHistory(e);
    }

    return jsonResponse({
      ok: true,
      service: 'COMP Work Tracking',
      sheet: WORK_SHEET_NAME,
      configured: true
    });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: error.message || 'Unknown server error.' });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e?.postData?.contents || '{}');

    if (REQUEST_KEY && payload.requestKey !== REQUEST_KEY) {
      return jsonResponse({ ok: false, error: 'Invalid request key.' });
    }

    if (SPREADSHEET_ID === 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE') {
      return jsonResponse({ ok: false, error: 'Spreadsheet ID is not configured.' });
    }

    if (payload.action === 'upsertWorkItems') {
      return upsertWorkItems(payload.items);
    }

    if (payload.action === 'appendWorkHistory') {
      return appendWorkHistory(payload.events);
    }

    return jsonResponse({ ok: false, error: 'Unsupported action.' });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: error.message || 'Unknown server error.' });
  }
}

function upsertWorkItems(items) {
  const rows = items && typeof items === 'object' ? Object.values(items) : [];

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
}

function appendWorkHistory(events) {
  const rows = Array.isArray(events) ? events : [];

  if (!rows.length) {
    return jsonResponse({ ok: false, error: 'No history events supplied.' });
  }

  if (rows.length > 200) {
    return jsonResponse({ ok: false, error: 'Too many history events in one request.' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getHistorySheet();
    const existingIds = new Set();
    const lastRow = sheet.getLastRow();

    if (lastRow > 1) {
      const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      ids.forEach(row => {
        const eventId = String(row[0] || '').trim();
        if (eventId) existingIds.add(eventId);
      });
    }

    const values = [];
    const seenRequestIds = new Set();

    rows.forEach(event => {
      const eventId = String(event?.eventId || '').trim();
      const ip = String(event?.ip || '').trim();
      const serialNumber = String(event?.serialNumber || '').trim();
      const locationId = String(event?.locationId || '').trim();
      const name = String(event?.name || '').trim();
      const zone = String(event?.zone || '-').trim() || '-';
      const repeat = Number(event?.repeat || 0);
      const engineerId = String(event?.engineerId || '').trim();
      const status = String(event?.status || '').trim();
      const note = String(event?.note || '').trim();
      const resolutionStatus = String(event?.resolutionStatus || '').trim();
      const resolutionMessage = String(event?.resolutionMessage || '').trim();
      const timestampText = String(event?.timestamp || '').trim();
      const timestamp = new Date(timestampText);

      if (!eventId || existingIds.has(eventId) || seenRequestIds.has(eventId)) return;
      if (!isValidIpv4(ip)) return;
      if (!engineerId) return;
      if (!ALLOWED_STATUSES.includes(status)) return;
      if (!ALLOWED_RESOLUTION_STATUSES.includes(resolutionStatus)) return;
      if (resolutionStatus === 'resolved' && !serialNumber) return;
      if (!timestampText || Number.isNaN(timestamp.getTime())) return;
      if (note.length > 500 || resolutionMessage.length > 500) return;

      values.push([
        eventId,
        timestamp,
        ip,
        serialNumber,
        locationId,
        name,
        zone,
        repeat,
        engineerId,
        status,
        note,
        resolutionStatus,
        resolutionMessage,
        'IP Repeat Analyzer'
      ]);

      seenRequestIds.add(eventId);
    });

    if (values.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, values.length, HISTORY_HEADERS.length).setValues(values);
      SpreadsheetApp.flush();
    }

    return jsonResponse({ ok: true, saved: values.length });
  } finally {
    lock.releaseLock();
  }
}

function getWorkHistory(e) {
  const sheet = getHistorySheet();
  const data = sheet.getDataRange().getValues();
  const requestedLimit = Number(e?.parameter?.limit || 2000);
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 2000, 1), 5000);

  if (data.length <= 1) {
    return jsonResponse({ ok: true, rows: [], total: 0 });
  }

  const rows = [];
  for (let r = data.length - 1; r >= 1 && rows.length < limit; r--) {
    const row = data[r];
    rows.push({
      eventId: String(row[0] || '').trim(),
      timestamp: row[1] instanceof Date ? row[1].toISOString() : String(row[1] || '').trim(),
      ip: String(row[2] || '').trim(),
      serialNumber: String(row[3] || '').trim(),
      locationId: String(row[4] || '').trim(),
      name: String(row[5] || '').trim(),
      zone: String(row[6] || '-').trim() || '-',
      repeat: Number(row[7] || 0),
      engineerId: String(row[8] || '').trim(),
      status: String(row[9] || '').trim(),
      note: String(row[10] || '').trim(),
      resolutionStatus: String(row[11] || '').trim(),
      resolutionMessage: String(row[12] || '').trim(),
      source: String(row[13] || '').trim()
    });
  }

  return jsonResponse({
    ok: true,
    rows,
    total: Math.max(data.length - 1, 0),
    returned: rows.length
  });
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

function getHistorySheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(HISTORY_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(HISTORY_SHEET_NAME);
    sheet.getRange(1, 1, 1, HISTORY_HEADERS.length).setValues([HISTORY_HEADERS]);
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
