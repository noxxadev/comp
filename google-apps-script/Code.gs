const SPREADSHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
const WORK_SHEET_NAME = 'Work Items';
const HISTORY_SHEET_NAME = 'Work History';
const MACHINE_LIST_SHEET_NAME = 'Machine List Current';
const MACHINE_LIST_META_KEY = 'comp.machineList.meta';

// Optional lightweight request key. This is NOT a secret when the frontend is public.
// Keep both this value and google-sheets-config.js requestKey empty to disable it.
const REQUEST_KEY = '';

const HEADERS = [
  'IP', 'Nama DC', 'Zona', 'Repeat Zero', 'Engineer ID', 'Status', 'Timestamp', 'Catatan'
];

const HISTORY_HEADERS = [
  'Event ID', 'Timestamp', 'IP', 'Serial Number', 'Location ID', 'Nama DC', 'Zona',
  'Repeat Zero', 'Engineer ID', 'Status', 'Catatan', 'Resolution Status',
  'Resolution Message', 'Source'
];

const MACHINE_LIST_HEADERS = [
  'Serial Number', 'Location ID', 'Installed Date', 'Uninstalled Date'
];

const ALLOWED_STATUSES = [
  'Belum Dikerjakan', 'In Progress', 'Selesai', 'Problem', 'Skipped'
];

const ALLOWED_RESOLUTION_STATUSES = [
  'resolved', 'unresolved', 'ambiguous', 'missing-location', 'invalid-time'
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
    if (action === 'getWorkHistory') return getWorkHistory(e);
    if (action === 'getMachineList') return getMachineList();
    return jsonResponse({
      ok: true,
      service: 'COMP Work Tracking',
      sheets: { work: WORK_SHEET_NAME, history: HISTORY_SHEET_NAME, machineList: MACHINE_LIST_SHEET_NAME },
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
    if (payload.action === 'upsertWorkItems') return upsertWorkItems(payload.items);
    if (payload.action === 'appendWorkHistory') return appendWorkHistory(payload.events);
    if (payload.action === 'replaceMachineList') return replaceMachineList(payload.records, payload.sourceFileName);
    return jsonResponse({ ok: false, error: 'Unsupported action.' });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: error.message || 'Unknown server error.' });
  }
}

function upsertWorkItems(items) {
  const rows = items && typeof items === 'object' ? Object.values(items) : [];
  if (!rows.length) return jsonResponse({ ok: false, error: 'No work items supplied.' });
  if (rows.length > 200) return jsonResponse({ ok: false, error: 'Too many work items in one request.' });

  // Protect the read → decide row → write sequence from concurrent users.
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
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

      if (!isValidIpv4(ip) || !engineerId || !ALLOWED_STATUSES.includes(status) || note.length > 500) return;

      const values = [[ip, name, zone, repeat, engineerId, status, now, note]];
      const existingRow = rowByIp.get(ip);

      if (existingRow) {
        sheet.getRange(existingRow, 1, 1, HEADERS.length).setValues(values);
      } else {
        const newRow = sheet.getLastRow() + 1;
        sheet.getRange(newRow, 1, 1, HEADERS.length).setValues(values);
        rowByIp.set(ip, newRow);
      }
      saved++;
    });

    SpreadsheetApp.flush();
    return jsonResponse({ ok: true, saved, updatedAt: now.toISOString() });
  } finally {
    lock.releaseLock();
  }
}

function appendWorkHistory(events) {
  const rows = Array.isArray(events) ? events : [];
  if (!rows.length) return jsonResponse({ ok: false, error: 'No history events supplied.' });
  if (rows.length > 200) return jsonResponse({ ok: false, error: 'Too many history events in one request.' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getHistorySheet();
    const existingIds = new Set();
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 1).getValues().forEach(row => {
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
      if (!isValidIpv4(ip) || !engineerId || !ALLOWED_STATUSES.includes(status)) return;
      if (!ALLOWED_RESOLUTION_STATUSES.includes(resolutionStatus)) return;
      if (resolutionStatus === 'resolved' && !serialNumber) return;
      if (!timestampText || Number.isNaN(timestamp.getTime())) return;
      if (note.length > 500 || resolutionMessage.length > 500) return;

      values.push([
        eventId, timestamp, ip, serialNumber, locationId, name, zone, repeat,
        engineerId, status, note, resolutionStatus, resolutionMessage, 'IP Repeat Analyzer'
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
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(HISTORY_SHEET_NAME);
  if (!sheet) return jsonResponse({ ok: true, rows: [], total: 0, returned: 0 });

  const data = sheet.getDataRange().getValues();
  const requestedLimit = Number(e?.parameter?.limit || 2000);
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 2000, 1), 5000);
  if (data.length <= 1) return jsonResponse({ ok: true, rows: [], total: 0, returned: 0 });

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
  return jsonResponse({ ok: true, rows, total: Math.max(data.length - 1, 0), returned: rows.length });
}

function getMachineList() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(MACHINE_LIST_SHEET_NAME);
  const meta = readMachineListMeta();
  if (!sheet || sheet.getLastRow() <= 1) {
    return jsonResponse({ ok: true, records: [], total: 0, updatedAt: meta.updatedAt || null, sourceFileName: meta.sourceFileName || '' });
  }

  const data = sheet.getDataRange().getValues();
  const records = [];
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const serialNumber = String(row[0] || '').trim();
    const locationId = String(row[1] || '').trim();
    const installedDate = String(row[2] || '').trim();
    const uninstalledDate = String(row[3] || '').trim();
    if (!serialNumber && !locationId && !installedDate && !uninstalledDate) continue;
    records.push({ serialNumber, locationId, installedDate, uninstalledDate });
  }
  return jsonResponse({ ok: true, records, total: records.length, updatedAt: meta.updatedAt || null, sourceFileName: meta.sourceFileName || '' });
}

function replaceMachineList(records, sourceFileName) {
  const rows = Array.isArray(records) ? records : [];
  if (!rows.length) return jsonResponse({ ok: false, error: 'Machine List kosong. Dataset lama tidak diubah.' });
  if (rows.length > 20000) return jsonResponse({ ok: false, error: 'Machine List terlalu besar. Maksimum 20.000 record per upload.' });

  const normalizedRows = [];
  const seenSerialNumbers = new Set();
  const seenLocations = new Set();

  for (let i = 0; i < rows.length; i++) {
    const record = rows[i] || {};
    const serialNumber = normalizeMachineText(record.serialNumber);
    const locationId = normalizeMachineText(record.locationId).toUpperCase();
    const installedDate = normalizeMachineText(record.installedDate);
    const uninstalledDate = normalizeMachineText(record.uninstalledDate);
    if (!serialNumber || !locationId) return jsonResponse({ ok: false, error: `Record Machine List ke-${i + 1} tidak memiliki serial_number dan location_id. Dataset lama tidak diubah.` });
    if (serialNumber.length > 200 || locationId.length > 200) return jsonResponse({ ok: false, error: `Record Machine List ke-${i + 1} memiliki nilai terlalu panjang. Dataset lama tidak diubah.` });
    if (installedDate.length > 100 || uninstalledDate.length > 100) return jsonResponse({ ok: false, error: `Tanggal pada record Machine List ke-${i + 1} terlalu panjang. Dataset lama tidak diubah.` });
    const serialKey = serialNumber.toUpperCase();
    const locationKey = locationId.toUpperCase();
    if (seenSerialNumbers.has(serialKey)) return jsonResponse({ ok: false, error: `Serial Number duplikat pada record ke-${i + 1}: ${serialNumber}. Dataset lama tidak diubah.` });
    if (seenLocations.has(locationKey)) return jsonResponse({ ok: false, error: `Location ID duplikat pada record ke-${i + 1}: ${locationId}. Dataset lama tidak diubah.` });
    seenSerialNumbers.add(serialKey);
    seenLocations.add(locationKey);
    normalizedRows.push([serialNumber, locationId, installedDate, uninstalledDate]);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(MACHINE_LIST_SHEET_NAME);
    if (!sheet) sheet = spreadsheet.insertSheet(MACHINE_LIST_SHEET_NAME);
    sheet.clearContents();
    sheet.getRange(1, 1, 1, MACHINE_LIST_HEADERS.length).setValues([MACHINE_LIST_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(2, 1, normalizedRows.length, MACHINE_LIST_HEADERS.length).setValues(normalizedRows);
    SpreadsheetApp.flush();

    const updatedAt = new Date();
    writeMachineListMeta({ updatedAt: updatedAt.toISOString(), sourceFileName: normalizeMachineText(sourceFileName).slice(0, 200), rowCount: normalizedRows.length });
    return jsonResponse({ ok: true, action: 'replaceMachineList', saved: normalizedRows.length, sourceFileName: normalizeMachineText(sourceFileName).slice(0, 200), updatedAt: updatedAt.toISOString(), sheet: MACHINE_LIST_SHEET_NAME });
  } finally {
    lock.releaseLock();
  }
}

function readMachineListMeta() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty(MACHINE_LIST_META_KEY);
    if (!raw) return {};
    const meta = JSON.parse(raw);
    return meta && typeof meta === 'object' ? meta : {};
  } catch (error) {
    console.warn('Gagal membaca metadata Machine List:', error);
    return {};
  }
}

function writeMachineListMeta(meta) {
  PropertiesService.getScriptProperties().setProperty(MACHINE_LIST_META_KEY, JSON.stringify(meta));
}

function normalizeMachineText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
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
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
