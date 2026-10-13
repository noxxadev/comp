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
const CSI_DAILY_REPORTS_SHEET = 'CSI Daily Reports';
const CSI_PRIORITY_REQUESTS_SHEET = 'CSI Priority Requests';
const CSI_PRIORITY_REQUEST_HEADERS = ['Request ID','Request Group ID','Created At','Nama DC','Frame Side','Job Type','Reason','Priority','Treatment JSON','Status','Created By User ID','Created By Username','Accepted At','Accepted By Username','Started At','Completed At','Rejected At','Rejected By Username','Reject Reason','Rescheduled At','Rescheduled By Username','Reschedule Reason','Scheduled Date','Cancel Requested At','Cancel Requested By Role','Cancel Reason','Cancel Confirmed At','Cancel Confirmed By Role','Linked History Record IDs','Updated At','Pending Reason'];

const CSI_DAILY_REPORT_HEADERS = ['Report ID','Created At','Work Date','Site Name','Site Address','Team Name','Personnel JSON','PIC Name','Site Leader Name','Report Text','Status','Created By User ID','Created By Username','Reviewed At','Reviewed By Username','Review Note','Printed At','Print Report HTML'];

const CSI_HISTORY_HEADERS = [
  'Record ID',
  'Record At',
  'Work Date',
  'Nama DC',
  'Frame Side',
  'Job Type',
  'Recorded By User ID',
  'Recorded By Username',
  'Notes',
  'Treatments'
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
      const user = csiRequireUser_(payload.session, true);
      return csiJson_({ ok: true, authenticated: true, authorized: true, user: { id: user.id, username: user.username, role: user.role } });
    }
    if (action === 'createPriorityRequest') {
      const user = csiRequireAdmin_(payload.session);
      return csiJson_({ ok: true, requests: csiCreatePriorityRequest_(payload, user) });
    }
    if (action === 'listPriorityRequests') {
      const user = csiRequireUser_(payload.session, true);
      return csiJson_({ ok: true, requests: csiListPriorityRequests_(user) });
    }
    if (action === 'acceptPriorityRequest') {
      const user = csiRequireUser_(payload.session);
      return csiJson_({ ok: true, requests: csiAcceptPriorityRequest_(payload, user) });
    }
    if (action === 'startPriorityRequest') {
      const user = csiRequireUser_(payload.session);
      return csiJson_({ ok: true, requests: csiStartPriorityRequest_(payload, user) });
    }
    if (action === 'rejectPriorityRequest') {
      const user = csiRequireUser_(payload.session);
      return csiJson_({ ok: true, requests: csiRejectPriorityRequest_(payload, user) });
    }
    if (action === 'reschedulePriorityRequest') {
      const user = csiRequireUser_(payload.session);
      return csiJson_({ ok: true, requests: csiReschedulePriorityRequest_(payload, user) });
    }
    if (action === 'cancelPriorityRequest') {
      const user = csiRequireUser_(payload.session, true);
      return csiJson_({ ok: true, requests: csiCancelPriorityRequest_(payload, user) });
    }
    if (action === 'respondCancelPriorityRequest') {
      const user = csiRequireUser_(payload.session, true);
      return csiJson_({ ok: true, requests: csiRespondCancelPriorityRequest_(payload, user) });
    }
    if (action === 'createDailyReport') {
      const user = csiRequireUser_(payload.session);
      return csiJson_({ ok: true, report: csiCreateDailyReport_(payload, user) });
    }
    if (action === 'listDailyReports') {
      csiRequireAdmin_(payload.session);
      return csiJson_({ ok: true, rows: csiListDailyReports_() });
    }
    if (action === 'getDailyReport') {
      csiRequireAdmin_(payload.session);
      return csiJson_({ ok: true, report: csiGetDailyReport_(payload.reportId) });
    }
    if (action === 'reviewDailyReport') {
      const user = csiRequireAdmin_(payload.session);
      return csiJson_({ ok: true, report: csiReviewDailyReport_(payload, user) });
    }
    if (action === 'markDailyReportPrinted') {
      const user = csiRequireAdmin_(payload.session);
      return csiJson_({ ok: true, report: csiMarkDailyReportPrinted_(payload.reportId, user) });
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
  const reportsSheet = csiEnsureSheet_(spreadsheet, CSI_DAILY_REPORTS_SHEET, CSI_DAILY_REPORT_HEADERS);
  const priorityRequestsSheet = csiEnsureSheet_(spreadsheet, CSI_PRIORITY_REQUESTS_SHEET, CSI_PRIORITY_REQUEST_HEADERS);
  SpreadsheetApp.flush();
  const actualSheetNames = spreadsheet.getSheets().map(sheet => sheet.getName());
  if (!spreadsheet.getSheetByName(CSI_HISTORY_SHEET) || !spreadsheet.getSheetByName(CSI_SUMMARY_SHEET)) throw new Error('Setup belum lengkap. Tab yang terbaca: ' + actualSheetNames.join(', '));
  const result = { ok: true, spreadsheetName: spreadsheet.getName(), spreadsheetUrl: spreadsheet.getUrl(), sheets: actualSheetNames, historyHeaderColumns: historySheet.getLastColumn(), summaryHeaderColumns: summarySheet.getLastColumn(), dailyReportsHeaderColumns: reportsSheet.getLastColumn(), priorityRequestsHeaderColumns: priorityRequestsSheet.getLastColumn() };
  console.log('[CSI setup] Verification result: ' + JSON.stringify(result));
  return result;
}

function csiSaveWork_(payload, user) {
  // Accept both the multi-DC payload and the legacy single-DC field.
  const rawDcNames = Array.isArray(payload.dcNames) ? payload.dcNames : [payload.dcName];
  const dcNames = [...new Set(rawDcNames.map(value => csiNormalizeDcName_(value)).filter(Boolean))];
  const workDateText = String(payload.workDate || '').trim();
  const frameSide = String(payload.frameSide || '').trim();
  const jobType = String(payload.jobType || '').trim();
  const notes = String(payload.notes || '').trim().slice(0, 500);
  const allowedTreatments = [
    'Pencopotan Frame', 'Pemasangan Frame', 'Penyemprotan Celldeck',
    'Pembersihan Kisi-kisi', 'Perapihan/Penggantian Kain Flanel',
    'Penggantian Celldeck', 'Perapihan pipa dan pengecekan saluran air'
  ];
  const requestedTreatments = Array.isArray(payload.treatments) ? payload.treatments.map(value => String(value || '').trim()) : [];
  const treatments = [...new Set(requestedTreatments)];
  if (!dcNames.length) throw new Error('Pilih minimal satu Nama DC.');
  if (dcNames.length !== rawDcNames.map(value => csiNormalizeDcName_(value)).filter(Boolean).length) throw new Error('Nama DC duplikat atau tidak valid.');
  if (dcNames.some(name => !/^[A-F]\\d+[A-Z]?$/.test(name))) throw new Error('Nama DC tidak valid. Pilih DC dari daftar master data.');
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(workDateText)) throw new Error('Tanggal pekerjaan tidak valid.');
  const workDate = new Date(workDateText + 'T12:00:00');
  if (isNaN(workDate.getTime()) || Utilities.formatDate(workDate, Session.getScriptTimeZone(), 'yyyy-MM-dd') !== workDateText) throw new Error('Tanggal pekerjaan tidak valid.');
  const sides = frameSide === 'Both' ? ['A', 'B'] : [frameSide];
  if (!sides.every(side => side === 'A' || side === 'B')) throw new Error('Pilih sisi A, sisi B, atau kedua sisi.');
  if (jobType !== 'Cleaning' && jobType !== 'Replace') throw new Error('Jenis pekerjaan harus Cleaning atau Replace.');
  if (!treatments.length) throw new Error('Pilih minimal satu jenis treatment.');
  if (treatments.some(value => !allowedTreatments.includes(value))) throw new Error('Pilihan treatment tidak valid.');
  if (workDate.getTime() > new Date().getTime() + 86400000) throw new Error('Tanggal pekerjaan tidak boleh di masa depan.');

  const priorityGroupId = String(payload.priorityRequestGroupId || '').trim();
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const prioritySheet = csiPrioritySheet_();
    const priorityLast = prioritySheet.getLastRow();
    const priorityRows = priorityLast > 1
      ? prioritySheet.getRange(2, 1, priorityLast - 1, CSI_PRIORITY_REQUEST_HEADERS.length).getValues()
      : [];
    const terminalStatuses = ['Selesai', 'Dibatalkan', 'Ditolak'];
    const activeRowsForDcs = priorityRows.map((row, index) => ({row, rowIndex:index + 2}))
      .filter(item => dcNames.includes(csiNormalizeDcName_(item.row[3])) && !terminalStatuses.includes(String(item.row[9])));

    if (!priorityGroupId && activeRowsForDcs.length) {
      const dc = csiNormalizeDcName_(activeRowsForDcs[0].row[3]);
      throw new Error('DC ' + dc + ' memiliki request prioritas aktif. Pekerjaan harus dicatat melalui request tersebut, bukan formulir manual.');
    }

    let priorityTargets = [];
    const completedSidesByDc = new Map();
    if (priorityGroupId) {
      const groupRows = priorityRows.map((row, index) => ({row, rowIndex:index + 2}))
        .filter(item => String(item.row[1]) === priorityGroupId);
      if (!groupRows.length) throw new Error('Request tidak ditemukan.');
      priorityTargets = groupRows.filter(item => dcNames.includes(csiNormalizeDcName_(item.row[3])));
      if (priorityTargets.length !== dcNames.length) throw new Error('DC yang dipilih tidak cocok dengan request prioritas.');
      if (priorityTargets.length !== dcNames.length) throw new Error('Pilih DC yang memang tercantum pada request prioritas.');
      const otherActive = activeRowsForDcs.filter(item => String(item.row[1]) !== priorityGroupId);
      if (otherActive.length) throw new Error('Salah satu DC memiliki request prioritas aktif lain. Selesaikan request yang sudah ada terlebih dahulu.');

      const historySheet = csiGetSheet_(CSI_HISTORY_SHEET, CSI_HISTORY_HEADERS);
      const historyLast = historySheet.getLastRow();
      const historyRows = historyLast > 1 ? historySheet.getRange(2, 1, historyLast - 1, CSI_HISTORY_HEADERS.length).getValues() : [];
      const historyById = new Map(historyRows.map(row => [String(row[0]), row]));
      const sortedTreatments = [...treatments].sort().join('|');
      priorityTargets.forEach(item => {
        const row = item.row;
        let requestTreatments = [];
        try { requestTreatments = JSON.parse(String(row[8] || '[]')); } catch (_) {}
        if (!['Sedang Dikerjakan', 'Pending'].includes(String(row[9]))) throw new Error('Mulai request terlebih dahulu sebelum menyimpan hasil pekerjaan.');
        if (String(row[5]) !== jobType) throw new Error('Jenis pekerjaan harus sesuai request prioritas.');
        const requestedSides = String(row[4]) === 'Both' ? ['A', 'B'] : [String(row[4])];
        if (!sides.every(side => requestedSides.includes(side))) throw new Error('Sisi yang dipilih tidak sesuai dengan sisi request.');
        if (requestTreatments.length && [...requestTreatments].sort().join('|') !== sortedTreatments) throw new Error('Treatment harus sama dengan yang ditetapkan pada request.');
        const linkedIds = String(row[28] || '').split(',').map(id => id.trim()).filter(Boolean);
        const completed = new Set();
        linkedIds.forEach(id => { const hist = historyById.get(id); if (hist && csiNormalizeDcName_(hist[3]) === csiNormalizeDcName_(row[3])) completed.add(String(hist[4])); });
        if (String(row[9]) === 'Selesai') requestedSides.forEach(side => completed.add(side));
        if (sides.some(side => completed.has(side))) throw new Error('Sisi yang dipilih sudah tercatat selesai untuk DC ' + csiNormalizeDcName_(row[3]) + '. Pilih sisi yang belum dikerjakan.');
        completedSidesByDc.set(csiNormalizeDcName_(row[3]), completed);
      });
    }

    const history = csiGetSheet_(CSI_HISTORY_SHEET, CSI_HISTORY_HEADERS);
    const now = new Date();
    const rows = [];
    dcNames.forEach(dcName => sides.forEach(side => {
      rows.push([Utilities.getUuid(), now, workDate, dcName, side, jobType, user.id, user.username, notes, JSON.stringify(treatments)]);
    }));
    history.getRange(history.getLastRow() + 1, 1, rows.length, CSI_HISTORY_HEADERS.length).setValues(rows);

    if (priorityGroupId && priorityTargets.length) {
      const savedIdsByDc = new Map();
      rows.forEach(savedRow => {
        const dc = csiNormalizeDcName_(savedRow[3]);
        if (!savedIdsByDc.has(dc)) savedIdsByDc.set(dc, []);
        savedIdsByDc.get(dc).push(String(savedRow[0]));
      });
      priorityTargets.forEach(item => {
        const rowIndex = item.rowIndex;
        const current = prioritySheet.getRange(rowIndex, 1, 1, CSI_PRIORITY_REQUEST_HEADERS.length).getValues()[0];
        const dc = csiNormalizeDcName_(current[3]);
        const requestedSides = String(current[4]) === 'Both' ? ['A', 'B'] : [String(current[4])];
        const completed = new Set(completedSidesByDc.get(dc) || []);
        sides.forEach(side => completed.add(side));
        const allDone = requestedSides.every(side => completed.has(side));
        const oldIds = String(current[28] || '').split(',').map(id => id.trim()).filter(Boolean);
        const newIds = savedIdsByDc.get(dc) || [];
        current[28] = [...new Set(oldIds.concat(newIds))].join(',');
        current[9] = allDone ? 'Selesai' : 'Pending';
        current[15] = allDone ? now : '';
        current[30] = allDone ? '' : 'Sisi ' + requestedSides.filter(side => completed.has(side)).join(' dan Sisi ') +
          ' selesai; sisi ' + requestedSides.filter(side => !completed.has(side)).join(' dan Sisi ') + ' belum dikerjakan.';
        current[29] = now;
        prioritySheet.getRange(rowIndex, 1, 1, CSI_PRIORITY_REQUEST_HEADERS.length).setValues([current]);
      });
      SpreadsheetApp.flush();
    }

    const summaryPairs = new Set();
    dcNames.forEach(dcName => sides.forEach(side => summaryPairs.add(dcName + '|' + side)));
    summaryPairs.forEach(pair => {
      const [dcName, side] = pair.split('|');
      csiRefreshSummary_(dcName, side);
    });
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
  const matching = values.filter(row => csiNormalizeDcName_(row[3]) === dcName && String(row[4]) === side)
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
  const index = existing.findIndex(row => csiNormalizeDcName_(row[0]) === dcName && row[1] === side);
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



function csiRequireAdmin_(sessionToken) {
  const user = csiRequireUser_(sessionToken, true);
  if (String(user.role || '').trim().toUpperCase() !== 'ADMIN') throw new Error('Akses ditolak. Fitur Daily Report hanya untuk Admin.');
  return user;
}

function csiCreateDailyReport_(payload, user) {
  const workDate = String(payload.workDate || '').trim();
  const teamName = String(payload.teamName || '').trim().slice(0, 120);
  const picName = String(payload.picName || '').trim().slice(0, 120);
  const leaderName = String(payload.leaderName || '').trim().slice(0, 120);
  const siteName = String(payload.siteName || 'CWUP Karawang').trim().slice(0, 120);
  const siteAddress = String(payload.siteAddress || 'Karawang').trim().slice(0, 200);
  const reportText = String(payload.reportText || '').trim().slice(0, 20000);
  const printReportHtml = String(payload.printReportHtml || '').trim().slice(0, 60000);
  const personnel = Array.isArray(payload.personnel) ? payload.personnel.map(v => String(v || '').trim()).filter(Boolean).slice(0, 4) : [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) throw new Error('Tanggal laporan tidak valid.');
  if (!teamName) throw new Error('Nama TIM CSI wajib diisi.');
  if (!personnel.length) throw new Error('Nama personil wajib diisi.');
  if (!reportText) throw new Error('Isi laporan kosong.');
  if (!printReportHtml || !/^<!doctype html>/i.test(printReportHtml)) throw new Error('Snapshot template cetak berlogo tidak tersedia. Buat ulang report dari halaman CSI.');
  const id = Utilities.getUuid();
  const sheet = csiGetSheet_(CSI_DAILY_REPORTS_SHEET, CSI_DAILY_REPORT_HEADERS);
  sheet.appendRow([id, new Date(), workDate, siteName, siteAddress, teamName, JSON.stringify(personnel), picName, leaderName, reportText, 'Menunggu Review', user.id, user.username, '', '', '', '', printReportHtml]);
  SpreadsheetApp.flush();
  return csiSerializeDailyReport_(sheet.getRange(sheet.getLastRow(), 1, 1, CSI_DAILY_REPORT_HEADERS.length).getValues()[0]);
}

function csiListDailyReports_() {
  const sheet = csiGetSheet_(CSI_DAILY_REPORTS_SHEET, CSI_DAILY_REPORT_HEADERS);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, CSI_DAILY_REPORT_HEADERS.length).getValues().reverse().map(csiSerializeDailyReport_);
}

function csiFindDailyReportRow_(reportId) {
  const id = String(reportId || '').trim();
  if (!id || id.length > 100) throw new Error('ID laporan tidak valid.');
  const sheet = csiGetSheet_(CSI_DAILY_REPORTS_SHEET, CSI_DAILY_REPORT_HEADERS);
  const last = sheet.getLastRow();
  if (last < 2) throw new Error('Laporan tidak ditemukan.');
  const ids = sheet.getRange(2, 1, last - 1, 1).getDisplayValues().flat();
  const index = ids.findIndex(value => value === id);
  if (index < 0) throw new Error('Laporan tidak ditemukan.');
  return { sheet, row: index + 2, values: sheet.getRange(index + 2, 1, 1, CSI_DAILY_REPORT_HEADERS.length).getValues()[0] };
}

function csiGetDailyReport_(reportId) {
  return csiSerializeDailyReport_(csiFindDailyReportRow_(reportId).values);
}

function csiReviewDailyReport_(payload, user) {
  const status = String(payload.status || '').trim();
  const note = String(payload.reviewNote || '').trim().slice(0, 2000);
  if (!['Perlu Revisi', 'Disetujui'].includes(status)) throw new Error('Status review tidak valid.');
  if (status === 'Perlu Revisi' && !note) throw new Error('Catatan revisi wajib diisi.');
  const found = csiFindDailyReportRow_(payload.reportId);
  if (found.values[10] === 'Sudah Dicetak') throw new Error('Laporan yang sudah dicetak tidak dapat diubah statusnya.');
  found.sheet.getRange(found.row, 11).setValue(status);
  found.sheet.getRange(found.row, 14, 1, 3).setValues([[new Date(), user.username, note]]);
  SpreadsheetApp.flush();
  return csiSerializeDailyReport_(found.sheet.getRange(found.row, 1, 1, CSI_DAILY_REPORT_HEADERS.length).getValues()[0]);
}

function csiMarkDailyReportPrinted_(reportId, user) {
  const found = csiFindDailyReportRow_(reportId);
  if (!['Disetujui', 'Sudah Dicetak'].includes(String(found.values[10]))) throw new Error('Laporan harus disetujui sebelum dicetak.');
  found.sheet.getRange(found.row, 11).setValue('Sudah Dicetak');
  found.sheet.getRange(found.row, 17).setValue(new Date());
  SpreadsheetApp.flush();
  return csiSerializeDailyReport_(found.sheet.getRange(found.row, 1, 1, CSI_DAILY_REPORT_HEADERS.length).getValues()[0]);
}

function csiSerializeDailyReport_(row) {
  let personnel = [];
  try { personnel = JSON.parse(String(row[6] || '[]')); } catch (_) {}
  return {
    reportId: String(row[0] || ''), createdAt: row[1] instanceof Date ? row[1].toISOString() : String(row[1] || ''),
    workDate: row[2] instanceof Date ? Utilities.formatDate(row[2], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row[2] || ''),
    siteName: String(row[3] || ''), siteAddress: String(row[4] || ''), teamName: String(row[5] || ''),
    personnel, picName: String(row[7] || ''), leaderName: String(row[8] || ''), reportText: String(row[9] || ''),
    status: String(row[10] || ''), createdByUserId: String(row[11] || ''), createdByUsername: String(row[12] || ''),
    reviewedAt: row[13] instanceof Date ? row[13].toISOString() : String(row[13] || ''),
    reviewedByUsername: String(row[14] || ''), reviewNote: String(row[15] || ''),
    printedAt: row[16] instanceof Date ? row[16].toISOString() : String(row[16] || ''),
    printReportHtml: String(row[17] || '')
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
    const dc = csiNormalizeDcName_(row[3]), side = String(row[4] || '').trim(), type = String(row[5] || '').trim();
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

function csiNormalizeDcName_(value) {
  return String(value || '').trim().toUpperCase().replace(/^GBE\./, '');
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

  // CSI Work History v1 -> v2: append Treatments at the end.
  // Preserve any existing rows; older rows naturally return an empty Treatments value.
  const legacyHistoryHeaders = [
    'Record ID', 'Record At', 'Work Date', 'Nama DC', 'Frame Side',
    'Job Type', 'Recorded By User ID', 'Recorded By Username', 'Notes'
  ];
  const isLegacyHistory = sheetName === CSI_HISTORY_SHEET &&
    firstRow.length === legacyHistoryHeaders.length &&
    legacyHistoryHeaders.every((header, index) => firstRow[index] === header) &&
    headers.length === legacyHistoryHeaders.length + 1 &&
    headers[headers.length - 1] === 'Treatments';
  if (isLegacyHistory) {
    sheet.getRange(1, headers.length).setValue('Treatments');
    sheet.setFrozenRows(1);
    return sheet;
  }

  // CSI Daily Reports v1 -> v2: append the branded print snapshot without changing existing rows.
  const legacyDailyReportHeaders = ['Report ID','Created At','Work Date','Site Name','Site Address','Team Name','Personnel JSON','PIC Name','Site Leader Name','Report Text','Status','Created By User ID','Created By Username','Reviewed At','Reviewed By Username','Review Note','Printed At'];
  const isLegacyDailyReports = sheetName === CSI_DAILY_REPORTS_SHEET &&
    firstRow.length === legacyDailyReportHeaders.length &&
    legacyDailyReportHeaders.every((header, index) => firstRow[index] === header) &&
    headers.length === legacyDailyReportHeaders.length + 1 &&
    headers[headers.length - 1] === 'Print Report HTML';
  if (isLegacyDailyReports) {
    sheet.getRange(1, headers.length).setValue('Print Report HTML');
    sheet.setFrozenRows(1);
    return sheet;
  }

  // CSI Priority Requests v1 -> v2: append a readable reason for partial completion.
  const legacyPriorityHeaders = ['Request ID','Request Group ID','Created At','Nama DC','Frame Side','Job Type','Reason','Priority','Treatment JSON','Status','Created By User ID','Created By Username','Accepted At','Accepted By Username','Started At','Completed At','Rejected At','Rejected By Username','Reject Reason','Rescheduled At','Rescheduled By Username','Reschedule Reason','Scheduled Date','Cancel Requested At','Cancel Requested By Role','Cancel Reason','Cancel Confirmed At','Cancel Confirmed By Role','Linked History Record IDs','Updated At'];
  const isLegacyPriority = sheetName === CSI_PRIORITY_REQUESTS_SHEET &&
    firstRow.length === legacyPriorityHeaders.length &&
    legacyPriorityHeaders.every((header, index) => firstRow[index] === header) &&
    headers.length === legacyPriorityHeaders.length + 1 &&
    headers[headers.length - 1] === 'Pending Reason';
  if (isLegacyPriority) {
    sheet.getRange(1, headers.length).setValue('Pending Reason');
    sheet.setFrozenRows(1);
    return sheet;
  }

  const matches = firstRow.length === headers.length &&
    headers.every((header, index) => firstRow[index] === header);
  if (!matches) {
    throw new Error('Struktur kolom sheet "' + sheetName + '" tidak sesuai. Header tidak diubah otomatis karena struktur tidak dikenali.');
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


function csiPrioritySheet_() {
  return csiGetSheet_(CSI_PRIORITY_REQUESTS_SHEET, CSI_PRIORITY_REQUEST_HEADERS);
}
function csiPriorityRows_() {
  const sheet = csiPrioritySheet_();
  const last = sheet.getLastRow();
  return last > 1 ? sheet.getRange(2, 1, last - 1, CSI_PRIORITY_REQUEST_HEADERS.length).getValues() : [];
}
function csiPrioritySerialize_(row, historySideMap) {
  const value = (i) => row[i] instanceof Date ? row[i].toISOString() : String(row[i] == null ? '' : row[i]);
  let treatments = [];
  try { treatments = JSON.parse(value(8) || '[]'); } catch (_) {}
  const requestedSides = value(4) === 'Both' ? ['A','B'] : [value(4)];
  const completedSides = new Set();
  String(value(28) || '').split(',').map(id => id.trim()).filter(Boolean).forEach(id => {
    const entry = historySideMap && historySideMap.get(id);
    if (entry && csiNormalizeDcName_(entry.dcName) === csiNormalizeDcName_(value(3))) completedSides.add(entry.side);
  });
  if (value(9) === 'Selesai') requestedSides.forEach(side => completedSides.add(side));
  const done = requestedSides.filter(side => completedSides.has(side));
  const remaining = requestedSides.filter(side => !completedSides.has(side));
  return {
    requestId:value(0), groupId:value(1), createdAt:value(2), dcName:value(3), frameSide:value(4),
    jobType:value(5), reason:value(6), priority:value(7), treatments,
    status:value(9), createdByUsername:value(11), acceptedAt:value(12), acceptedByUsername:value(13),
    startedAt:value(14), completedAt:value(15), rejectedAt:value(16), rejectedByUsername:value(17),
    rejectReason:value(18), rescheduledAt:value(19), rescheduledByUsername:value(20),
    rescheduleReason:value(21), scheduledDate:value(22), cancelRequestedAt:value(23),
    cancelRequestedByRole:value(24), cancelReason:value(25), cancelConfirmedAt:value(26),
    cancelConfirmedByRole:value(27), linkedHistoryRecordIds:value(28), updatedAt:value(29),
    pendingReason:value(30), completedSides:done, remainingSides:remaining
  };
}
function csiHistorySideMap_() {
  const sheet = csiGetSheet_(CSI_HISTORY_SHEET, CSI_HISTORY_HEADERS);
  const last = sheet.getLastRow();
  const rows = last > 1 ? sheet.getRange(2,1,last-1,CSI_HISTORY_HEADERS.length).getValues() : [];
  return new Map(rows.map(row => [String(row[0]), {dcName:String(row[3] || ''), side:String(row[4] || '')}]));
}
function csiFindPriorityGroup_(groupId) {
  const id = String(groupId || '').trim();
  if (!id || id.length > 100) throw new Error('ID request tidak valid.');
  const sheet = csiPrioritySheet_(), last = sheet.getLastRow();
  if (last < 2) throw new Error('Request tidak ditemukan.');
  const values = sheet.getRange(2, 1, last - 1, CSI_PRIORITY_REQUEST_HEADERS.length).getValues();
  const rows = [];
  values.forEach((row, i) => { if (String(row[1]) === id) rows.push({row:i+2,values:row}); });
  if (!rows.length) throw new Error('Request tidak ditemukan.');
  return {sheet,rows};
}
function csiGroupResponse_(groupId) {
  const sideMap = csiHistorySideMap_();
  return csiPriorityRows_().filter(row => String(row[1]) === String(groupId)).map(row => csiPrioritySerialize_(row, sideMap));
}
function csiCreatePriorityRequest_(payload, user) {
  const raw = Array.isArray(payload.dcNames) ? payload.dcNames : [];
  const dcs = [...new Set(raw.map(csiNormalizeDcName_).filter(Boolean))];
  const side = String(payload.frameSide || '').trim();
  const job = String(payload.jobType || '').trim();
  const reason = String(payload.reason || '').trim().slice(0,1500);
  const priority = String(payload.priority || '').trim();
  const scheduled = String(payload.scheduledDate || '').trim();
  if (!dcs.length || dcs.length !== raw.map(csiNormalizeDcName_).filter(Boolean).length) throw new Error('Pilih Nama DC unik yang valid.');
  if (dcs.some(dc => !/^[A-F]\d+[A-Z]?$/.test(dc))) throw new Error('Nama DC tidak valid.');
  if (!['A','B','Both'].includes(side)) throw new Error('Sisi Celldeck harus A, B, atau A+B.');
  if (!['Cleaning','Replace'].includes(job)) throw new Error('Jenis pekerjaan tidak valid.');
  if (!reason) throw new Error('Alasan request wajib diisi.');
  if (!['Tinggi','Mendesak'].includes(priority)) throw new Error('Prioritas harus Tinggi atau Mendesak.');
  if (scheduled && !/^\d{4}-\d{2}-\d{2}$/.test(scheduled)) throw new Error('Tanggal rencana tidak valid.');
  const groupId = Utilities.getUuid(), now = new Date();
  const sheet = csiPrioritySheet_();
  const rows = dcs.map(dc => [Utilities.getUuid(),groupId,now,dc,side,job,reason,priority,'[]','Menunggu CSI',user.id,user.username,'','','','','','','','','','',scheduled,'','','','','','',now,'']);
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const activeStatuses = new Set(['Menunggu CSI','Dijadwalkan Ulang','Diterima','Sedang Dikerjakan','Pending','Menunggu Konfirmasi Pembatalan']);
    const existing = csiPriorityRows_();
    const conflict = existing.find(row => dcs.includes(csiNormalizeDcName_(row[3])) && activeStatuses.has(String(row[9])));
    if (conflict) throw new Error('DC ' + csiNormalizeDcName_(conflict[3]) + ' masih memiliki request prioritas aktif.');
    sheet.getRange(sheet.getLastRow()+1,1,rows.length,CSI_PRIORITY_REQUEST_HEADERS.length).setValues(rows);
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
  return csiGroupResponse_(groupId);
}
function csiListPriorityRequests_(user) {
  const rows = csiPriorityRows_();
  const role = String(user.role || '').toUpperCase();
  if (!['ADMIN','CSI'].includes(role)) throw new Error('Akses ditolak. Request hanya tersedia untuk Admin dan CSI.');
  const sideMap = csiHistorySideMap_();
  return rows.filter(row => role === 'ADMIN' || !['Selesai','Dibatalkan','Ditolak'].includes(String(row[9]))).reverse().map(row => csiPrioritySerialize_(row, sideMap));
}
function csiUpdatePriorityGroup_(groupId, updater) {
  const now = new Date();
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const found = csiFindPriorityGroup_(groupId);
    // Validate and mutate all rows in memory first; do not leave a partially updated multi-DC group.
    found.rows.forEach(item => { updater(item.values, now); item.values[29] = now; });
    found.rows.forEach(item => found.sheet.getRange(item.row,1,1,CSI_PRIORITY_REQUEST_HEADERS.length).setValues([item.values]));
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
  return csiGroupResponse_(groupId);
}
function csiAcceptPriorityRequest_(payload, user) {
  const groupId = payload.groupId;
  return csiUpdatePriorityGroup_(groupId,(row,now)=>{
    if (row[9] !== 'Menunggu CSI' && row[9] !== 'Dijadwalkan Ulang') throw new Error('Request tidak lagi menunggu penerimaan CSI.');
    row[8]='[]'; row[9]='Diterima'; row[12]=now; row[13]=user.username;
  });
}
function csiStartPriorityRequest_(payload,user) {
  return csiUpdatePriorityGroup_(payload.groupId,(row,now)=>{
    if (row[9] === 'Diterima') { row[9]='Sedang Dikerjakan'; row[14]=now; }
    else if (!['Sedang Dikerjakan','Pending','Selesai'].includes(String(row[9]))) {
      throw new Error('Request harus diterima sebelum pekerjaan dimulai.');
    }
  });
}
function csiRejectPriorityRequest_(payload,user) {
  const reason=String(payload.reason||'').trim().slice(0,1500);
  if(!reason) throw new Error('Alasan penolakan wajib diisi.');
  return csiUpdatePriorityGroup_(payload.groupId,(row,now)=>{
    if(!['Menunggu CSI','Dijadwalkan Ulang'].includes(row[9])) throw new Error('Request tidak dapat ditolak pada status ini.');
    row[9]='Ditolak'; row[16]=now; row[17]=user.username; row[18]=reason;
  });
}
function csiReschedulePriorityRequest_(payload,user) {
  const reason=String(payload.reason||'').trim().slice(0,1500), date=String(payload.scheduledDate||'').trim();
  if(!reason) throw new Error('Alasan penjadwalan ulang wajib diisi.');
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) throw new Error('Pilih tanggal penjadwalan ulang.');
  return csiUpdatePriorityGroup_(payload.groupId,(row,now)=>{
    if(!['Menunggu CSI','Diterima'].includes(row[9])) throw new Error('Request tidak dapat dijadwalkan ulang pada status ini.');
    row[9]='Dijadwalkan Ulang'; row[19]=now; row[20]=user.username; row[21]=reason; row[22]=date;
  });
}
function csiCancelPriorityRequest_(payload,user) {
  const role = String(user.role || '').toUpperCase();
  if (!['ADMIN','CSI'].includes(role)) throw new Error('Akses ditolak.');
  const reason=String(payload.reason||'').trim().slice(0,1500);
  if(!reason) throw new Error('Alasan pembatalan wajib diisi.');
  return csiUpdatePriorityGroup_(payload.groupId,(row,now)=>{
    if(['Selesai','Dibatalkan','Ditolak'].includes(row[9])) throw new Error('Request sudah berakhir.');
    if(row[9] === 'Menunggu Konfirmasi Pembatalan') throw new Error('Pembatalan sudah menunggu konfirmasi pihak lain.');
    if(['Sedang Dikerjakan','Pending'].includes(String(row[9]))) {
      row[9]='Menunggu Konfirmasi Pembatalan'; row[23]=now; row[24]=String(user.role).toUpperCase(); row[25]=reason;
    } else {
      if(String(user.role).toUpperCase()!=='ADMIN') throw new Error('Hanya Admin yang dapat membatalkan sebelum pekerjaan dimulai.');
      row[9]='Dibatalkan'; row[23]=now; row[24]='ADMIN'; row[25]=reason; row[26]=now; row[27]='ADMIN';
    }
  });
}
function csiRespondCancelPriorityRequest_(payload,user) {
  const confirm = payload.confirm === true;
  const role = String(user.role||'').toUpperCase();
  if (!['ADMIN','CSI'].includes(role)) throw new Error('Akses ditolak.');
  return csiUpdatePriorityGroup_(payload.groupId,(row,now)=>{
    if(row[9] !== 'Menunggu Konfirmasi Pembatalan') throw new Error('Tidak ada pembatalan yang menunggu konfirmasi.');
    if(role === String(row[24]).toUpperCase()) throw new Error('Konfirmasi harus dilakukan oleh pihak yang berbeda.');
    if(confirm) { row[9]='Dibatalkan'; row[26]=now; row[27]=role; }
    else {
      const hasSavedHistory = String(row[28] || '').trim() !== '';
      row[9] = hasSavedHistory ? 'Pending' : 'Sedang Dikerjakan';
      row[23]=''; row[24]=''; row[25]='';
    }
  });
}
