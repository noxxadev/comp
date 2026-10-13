(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const form = $('csiWorkForm');
  const saveButton = $('saveWorkBtn');
  const historyBody = $('historyBody');
  const notice = $('csiNotice');
  let allRows = [];
  let busy = false;
  const TREATMENTS = ["Pencopotan Frame","Pemasangan Frame","Penyemprotan Celldeck","Pembersihan Kisi-kisi","Perapihan/Penggantian Kain Flanel","Penggantian Celldeck","Perapihan pipa dan pengecekan saluran air"];
  function selectedTreatments() {
    return [...form.querySelectorAll('input[name="treatments"]:checked')].map(input => input.value);
  }
  function parseTreatments(value) {
    if (Array.isArray(value)) return value.filter(item => TREATMENTS.includes(item));
    if (!value) return [];
    try {
      const parsed = JSON.parse(String(value));
      return Array.isArray(parsed) ? parsed.filter(item => TREATMENTS.includes(item)) : [];
    } catch (_) { return []; }
  }

  function showNotice(message, kind) {
    notice.textContent = message;
    notice.dataset.kind = kind || 'info';
    notice.hidden = !message;
  }
  function session() {
    return window.CompAuth?.getSession?.() || localStorage.getItem('comp.auth.session') || '';
  }
  function configUrl() {
    const url = String(window.CompCsiConfig?.webAppUrl || '').trim();
    if (!url) throw new Error('URL Web App CSI belum diatur di csi-google-sheets-config.js.');
    if (!/^https:\/\/script\.google\.com\/(?:a\/macros\/[^/]+\/s|macros\/s)\/[^/]+\/exec(?:\?.*)?$/.test(url)) throw new Error('URL Web App CSI tidak valid. Gunakan URL deployment yang berakhiran /exec.');
    return url;
  }
  async function request(action, payload = {}) {
    const response = await fetch(configUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ action, session: session(), ...payload }),
      cache: 'no-store', credentials: 'omit', redirect: 'follow'
    });
    const raw = await response.text();
    let result;
    try { result = JSON.parse(raw); } catch (_) { throw new Error('Respons CSI tidak valid. Pastikan URL Web App sudah benar dan deployment terbaru sudah aktif.'); }
    if (!response.ok || !result?.ok) throw new Error(result?.error || 'Permintaan CSI gagal.');
    return result;
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function dcList() {
    const names = new Set();
    Object.values(window.masterData || {}).forEach(location => {
      const match = String(location || '').trim().toUpperCase().match(/^(GBE\.[A-F]\d+[A-Z]?)(?:\.|$)/);
      if (match) names.add(match[1].replace(/^GBE\./, ''));
    });
    return [...names].sort((a,b) => a.localeCompare(b, undefined, {numeric:true}));
  }
  function populateDcOptions() {
    const list = dcList();
    if (!list.length) throw new Error('Nama DC tidak ditemukan dari master-data.js.');
    const options = list.map(dc => '<option value="' + escapeHtml(dc) + '">' + escapeHtml(dc) + '</option>').join('');
    $('dcName').innerHTML = '<option value="">Pilih Nama DC</option>' + options;
    $('filterDc').innerHTML = '<option value="">Semua DC</option>' + options;
  }
  function asDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  function dateText(value, withTime = false) {
    const date = asDate(value);
    if (!date) return value ? String(value) : '—';
    const opts = withTime
      ? {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}
      : {day:'2-digit',month:'short',year:'numeric'};
    return new Intl.DateTimeFormat('id-ID', opts).format(date);
  }
  function ageDays(value) {
    const date = asDate(value);
    if (!date) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    date.setHours(0,0,0,0);
    return Math.max(0, Math.floor((today - date) / 86400000));
  }
  function latestCleaningFor(dc, side) {
    return allRows.filter(row => String(row[3]) === dc && String(row[4]) === side && String(row[5]) === 'Cleaning')
      .sort((a,b) => new Date(b[2]).getTime() - new Date(a[2]).getTime() || new Date(b[1]).getTime() - new Date(a[1]).getTime())[0] || null;
  }
  function oldSideKeys() {
    const keys = new Set();
    const pairs = new Set(allRows.map(row => String(row[3]) + '|' + String(row[4])));
    pairs.forEach(key => {
      const [dc, side] = key.split('|');
      const last = latestCleaningFor(dc, side);
      const age = last ? ageDays(last[2]) : null;
      if (age !== null && age >= 30) keys.add(key);
    });
    return keys;
  }
  function renderHistory() {
    const dc = $('filterDc').value, job = $('filterJob').value;
    const from = $('filterFrom').value, to = $('filterTo').value, oldOnly = $('filterOld').checked;
    const oldKeys = oldSideKeys();
    const rows = allRows.filter(row => {
      const workDate = String(row[2] || '').slice(0,10);
      if (dc && row[3] !== dc) return false;
      if (job && row[5] !== job) return false;
      if (from && workDate < from) return false;
      if (to && workDate > to) return false;
      if (oldOnly && !oldKeys.has(String(row[3]) + '|' + String(row[4]))) return false;
      return true;
    }).sort((a,b) => new Date(b[2]).getTime() - new Date(a[2]).getTime() || new Date(b[1]).getTime() - new Date(a[1]).getTime());
    $('historyCount').textContent = rows.length + ' catatan ditampilkan · ' + allRows.length + ' total catatan';
    if (!rows.length) {
      historyBody.innerHTML = '<tr><td colspan="7" class="csi-empty">Tidak ada riwayat yang sesuai filter.</td></tr>';
      return;
    }
    historyBody.innerHTML = rows.map(row => {
      const cleaning = latestCleaningFor(String(row[3]), String(row[4]));
      const age = cleaning ? ageDays(cleaning[2]) : null;
      const status = !cleaning ? '<span class="csi-pill normal">Belum ada cleaning</span>' : age >= 30 ? '<span class="csi-pill old">Perlu Cleaning · ' + age + ' hari</span>' : '<span class="csi-pill normal">Normal · ' + age + ' hari</span>';
      const jobClass = row[5] === 'Replace' ? 'replace' : 'cleaning';
      const treatmentText = parseTreatments(row[9]).join(', ');
      return '<tr><td>' + escapeHtml(dateText(row[1], true)) + '</td><td>' + escapeHtml(dateText(row[2])) + '</td><td><strong>' + escapeHtml(row[3]) + '</strong></td><td>' + escapeHtml(row[4]) + '</td><td><span class="csi-pill ' + jobClass + '">' + escapeHtml(row[5]) + '</span></td><td>' + escapeHtml([row[8], treatmentText ? 'Treatment: ' + treatmentText : ''].filter(Boolean).join(' · ') || '—') + '</td><td>' + status + '</td></tr>';
    }).join('');
  }
  async function loadHistory() {
    $('refreshHistoryBtn').disabled = true;
    try {
      const result = await request('getHistory');
      allRows = Array.isArray(result.rows) ? result.rows.map(row => {
        const normalized = Array.isArray(row) ? row.slice() : row;
        if (Array.isArray(normalized)) normalized[3] = String(normalized[3] || '').trim().replace(/^GBE\./i, '');
        return normalized;
      }) : [];
      renderHistory();
    } finally { $('refreshHistoryBtn').disabled = false; }
  }

  function localDateValue(date = new Date()) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }
  function reportDateText(value) {
    const parts = String(value || '').split('-');
    return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : String(value || '');
  }
  function parsePersonnelNames(value) {
    const seen = new Set();
    return String(value || '').split(/[,;\n]+/)
      .map(name => name.trim().replace(/\s+/g, ' '))
      .filter(name => {
        const key = name.toLocaleLowerCase('id-ID');
        if (!name || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }
  function buildDailyReport(dateValue, personnelNames) {
    const rows = allRows.filter(row => String(row[2] || '').slice(0, 10) === dateValue)
      .sort((a, b) => String(a[3]).localeCompare(String(b[3]), undefined, {numeric: true}) ||
        String(a[5]).localeCompare(String(b[5])) || String(a[4]).localeCompare(String(b[4])));
    if (!rows.length) return '';
    const uniqueRows = new Map();
    rows.forEach(row => {
      const key = JSON.stringify([
        String(row[2] || '').slice(0, 10),
        String(row[3] || '').trim().toUpperCase().replace(/^GBE\./, ''),
        String(row[4] || '').trim(),
        String(row[5] || '').trim(),
        String(row[8] || '').trim()
      ]);
      if (!uniqueRows.has(key)) uniqueRows.set(key, row);
    });
    const reportRows = [...uniqueRows.values()];
    const dcGroups = new Map();
    const totals = { Cleaning: 0, Replace: 0 };
    reportRows.forEach(row => {
      const dc = String(row[3] || '').trim() || 'DC tidak diketahui';
      const job = String(row[5] || '').trim();
      const side = String(row[4] || '').trim();
      const notes = String(row[8] || '').trim();
      if (!dcGroups.has(dc)) dcGroups.set(dc, new Map());
      const jobGroups = dcGroups.get(dc);
      const groupKey = job + '|' + notes;
      if (!jobGroups.has(groupKey)) jobGroups.set(groupKey, { job, notes, sides: { A: 0, B: 0 } });
      const group = jobGroups.get(groupKey);
      if (side === 'A' || side === 'B') {
        group.sides[side] += 1;
        if (job === 'Cleaning' || job === 'Replace') totals[job] += 1;
      }
    });
    const names = parsePersonnelNames(personnelNames);
    const lines = [
      'Daily Report CSI',
      'Tanggal: ' + reportDateText(dateValue),
      'Jumlah Personil: ' + names.length,
      'Nama Personil:',
      ...names.map((name, index) => (index + 1) + '. ' + name),
      ''
    ];
    [...dcGroups.keys()].sort((a, b) => a.localeCompare(b, undefined, {numeric: true})).forEach(dc => {
      lines.push('Nama DC: ' + dc);
      [...dcGroups.get(dc).values()].forEach(group => {
        const sideParts = ['A', 'B'].filter(side => group.sides[side] > 0).map(side =>
          'Sisi ' + side + (group.sides[side] > 1 ? ' (' + group.sides[side] + ' catatan)' : ''));
        if (!sideParts.length) return;
        lines.push('- ' + group.job + ': ' + sideParts.join(', '));
        if (group.notes) lines.push('  Catatan: ' + group.notes);
      });
      lines.push('');
    });
    lines.push('Rekap pekerjaan:');
    lines.push('- Cleaning: ' + totals.Cleaning + ' sisi');
    lines.push('- Replace: ' + totals.Replace + ' sisi');
    lines.push('- Total: ' + (totals.Cleaning + totals.Replace) + ' sisi');
    return lines.join('\n');
  }
  function buildPrintableReport(dateValue, siteName, siteAddress, personnel, teamName, picName, leaderName) {
    const rows = allRows.filter(row => String(row[2] || '').slice(0, 10) === dateValue);
    if (!rows.length) return '';
    const areas = new Map();
    rows.forEach(row => {
      const dc = String(row[3] || '').trim().replace(/^GBE\./i, '');
      const side = String(row[4] || '').trim();
      const job = String(row[5] || '').trim();
      const key = [dc, side, job].join('|');
      if (!areas.has(key)) areas.set(key, { dc, side, job, treatments: new Set(), notes: [] });
      const area = areas.get(key);
      parseTreatments(row[9]).forEach(treatment => area.treatments.add(treatment));
      const note = String(row[8] || '').trim();
      if (note && !area.notes.includes(note)) area.notes.push(note);
    });
    const areaList = [...areas.values()].sort((a,b) => a.dc.localeCompare(b.dc, undefined, {numeric:true}) || a.side.localeCompare(b.side) || a.job.localeCompare(b.job));
    const esc = escapeHtml;
    const treatmentRows = areaList.map((area, index) => {
      const treatmentLines = TREATMENTS.map(t => '<div class="treatment-line"><span class="check">' + (area.treatments.has(t) ? '✓' : '') + '</span><span>' + esc(t) + '</span></div>').join('');
      return '<tr><td class="number">' + (index + 1) + '</td><td><strong>' + esc(area.dc) + '</strong><br><span class="sub">' + esc('Sisi ' + area.side + ' · ' + area.job) + '</span></td><td>' + treatmentLines + '</td><td class="write-cell"></td><td>' + esc(area.notes.join('; ')) + '</td></tr>';
    }).join('');
    const people = personnel.slice(0,4);
    while (people.length < 4) people.push('');
    const dayName = new Intl.DateTimeFormat('id-ID', {weekday:'long'}).format(new Date(dateValue + 'T12:00:00'));
    const styles = `
      @page { size: A4 portrait; margin: 10mm; }
      * { box-sizing:border-box; } body { font-family:Arial,sans-serif;color:#111;margin:0;font-size:9px; }
      .header { display:grid;grid-template-columns:76px 1fr 100px;align-items:center;border:1px solid #222;padding:8px;gap:10px; }
      .logo {display:flex;align-items:center;justify-content:center}.logo img{display:block;max-width:72px;max-height:58px;width:auto;height:auto;object-fit:contain}.title{text-align:center}.title h1{font-size:14px;margin:0 0 5px}.title p{margin:0;font-size:9px;font-weight:bold}
      .meta {display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:8px 0}.meta div{border:1px solid #555;padding:5px;min-height:22px}.people{grid-row:span 3}
      table {border-collapse:collapse;width:100%;table-layout:fixed} th,td{border:1px solid #222;padding:4px;vertical-align:top} th{background:#e9efed;text-align:center;font-size:9px}
      th:nth-child(1){width:4%} th:nth-child(2){width:22%} th:nth-child(3){width:34%} th:nth-child(4){width:20%} th:nth-child(5){width:20%}
      .number{text-align:center;font-weight:bold}.sub{font-size:8px;color:#444}.treatment-line{display:flex;gap:5px;align-items:flex-start;margin:0 0 3px}.check{display:inline-flex;border:1px solid #333;width:11px;height:11px;min-width:11px;align-items:center;justify-content:center;font-weight:bold;font-size:10px}
      .write-cell{height:70px}.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:14px;text-align:center}.sign{min-height:75px}.sign strong{display:block}.sign .space{height:45px}.sign .name{border-top:1px solid #333;display:inline-block;min-width:170px;padding-top:4px}
      .footer{margin-top:5px;font-size:8px;color:#555}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    `;
    return '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Daily Report Cleaning Celldeck</title><style>' + styles + '</style></head><body>' +
      '<header class="header"><div class="logo"><img src="https://raw.githubusercontent.com/noxxadev/comp/main/csi.png" alt="Logo CSI"></div><div class="title"><h1>DAILY REPORT CLEANING CELLDECK</h1><p>PT. CAKRAWALA SEJAHTERA INSANI - GREENBOX (DATA CENTER)</p></div><div><strong>FORM CSI</strong><br>Dokumentasi pekerjaan</div></header>' +
      '<section class="meta"><div><strong>HARI:</strong> ' + esc(dayName) + '</div><div><strong>TANGGAL:</strong> ' + esc(reportDateText(dateValue)) + '</div><div><strong>NAMA SITE:</strong> ' + esc(siteName) + '</div><div><strong>ALAMAT:</strong> ' + esc(siteAddress || '-') + '</div><div><strong>JUMLAH PERSONIL:</strong> ' + people.filter(Boolean).length + '</div><div class="people"><strong>NAMA PERSONIL</strong><br>' + people.map((p,i) => (i+1) + ') ' + esc(p || '________________') + '<br>').join('') + '</div></section>' +
      '<table><thead><tr><th>NO</th><th>AREA CLEANING</th><th>JENIS TREATMENT</th><th>TEMUAN DILAPANGAN</th><th>PENANGANAN</th></tr></thead><tbody>' + treatmentRows + '</tbody></table>' +
      '<div class="signatures"><div class="sign"><strong>DIBUAT</strong><span>TIM CSI</span><div class="space"></div><span class="name">' + esc(teamName || 'Nama Jelas') + '</span></div><div class="sign"><strong>DIKETAHUI</strong><span>PIC SITE</span><div class="space"></div><span class="name">' + esc(picName || 'Nama Jelas') + '</span></div><div class="sign"><strong>DISETUJUI</strong><span>SITE LEADER</span><div class="space"></div><span class="name">' + esc(leaderName || 'Nama Jelas') + '</span></div></div>' +
      '</body></html>';
  }
  async function printDailyReport() {
    const button = $('printDailyReportBtn');
    const dateValue = $('printReportDate').value;
    const siteName = 'CWUP Karawang';
    const siteAddress = 'Karawang';
    const teamName = $('printTeamName').value.trim();
    const personnel = parsePersonnelNames($('printPersonnel').value);
    if (!dateValue || !teamName || !personnel.length) {
      showNotice('Lengkapi tanggal, Nama TIM CSI, dan minimal satu nama personil.', 'error');
      return;
    }
    if (personnel.length > 4) {
      showNotice('Template Daily Report menyediakan maksimal empat nama personil.', 'error');
      return;
    }
    const win = window.open('', '_blank');
    if (!win) {
      showNotice('Pop-up diblokir browser. Izinkan pop-up untuk halaman ini lalu coba lagi.', 'error');
      return;
    }
    button.disabled = true;
    try {
      await loadHistory();
      const report = buildPrintableReport(dateValue, siteName, siteAddress, personnel, teamName, $('printPicName').value.trim(), $('printLeaderName').value.trim());
      if (!report) {
        win.close();
        showNotice('Tidak ada pekerjaan CSI tersimpan pada tanggal laporan yang dipilih.', 'error');
        return;
      }
      win.onload = () => { win.focus(); win.print(); };
      win.document.open(); win.document.write(report); win.document.close();
      showNotice('Daily Report siap dicetak. Periksa centang treatment lalu cetak atau simpan sebagai PDF.', 'success');
    } catch (error) {
      win.close();
      showNotice('Gagal menyiapkan Daily Report: ' + (error.message || 'periksa koneksi CSI.'), 'error');
    } finally { button.disabled = false; }
  }
  async function init() {
    if (!session()) { location.replace('login.html'); return; }
    populateDcOptions();
    $('workDate').value = localDateValue();
    $('printReportDate').value = localDateValue();
    await request('validateAccess');
    await loadHistory();
    showNotice('Akses CSI terverifikasi. Riwayat berhasil dimuat.', 'success');
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    busy = true; saveButton.disabled = true;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    showNotice('', '');
    let savedCount = 0;
    try {
      const result = await request('saveWork', {
        dcName: $('dcName').value, workDate: $('workDate').value,
        frameSide: $('frameSide').value, jobType: $('jobType').value,
        notes: $('notes').value.trim(), treatments: selectedTreatments()
      });
      savedCount = Number(result.saved) || 0;
      form.reset();
      $('workDate').value = localDateValue();
    } catch (error) {
      showNotice(error.message || 'Gagal menyimpan pekerjaan.', 'error');
      busy = false; saveButton.disabled = false;
      saveButton.innerHTML = '<i class="fas fa-floppy-disk"></i> Simpan Pekerjaan';
      return;
    }
    try {
      await loadHistory();
      showNotice('Berhasil menyimpan ' + savedCount + ' catatan pekerjaan.', 'success');
    } catch (error) {
      showNotice('Pekerjaan tersimpan (' + savedCount + ' catatan), tetapi riwayat belum berhasil dimuat ulang. Tekan Refresh; jangan simpan ulang pekerjaan yang sama.', 'error');
    } finally {
      busy = false; saveButton.disabled = false;
      saveButton.innerHTML = '<i class="fas fa-floppy-disk"></i> Simpan Pekerjaan';
    }
  });
  $('refreshHistoryBtn').addEventListener('click', async () => {
    try { await loadHistory(); showNotice('Riwayat berhasil diperbarui.', 'success'); }
    catch (error) { showNotice(error.message, 'error'); }
  });
  function closeWhatsappModal() {
    $('whatsappReportModal').hidden = true;
    $('reportPreview').readOnly = true;
    $('editReportBtn').innerHTML = '<i class="fas fa-pen"></i> Edit';
  }
  $('generateReportBtn').addEventListener('click', async () => {
    const button = $('generateReportBtn');
    const dateValue = $('printReportDate').value;
    if (!dateValue) { showNotice('Pilih tanggal laporan terlebih dahulu.', 'error'); return; }
    const personnelNames = parsePersonnelNames($('printPersonnel').value);
    if (!personnelNames.length) { showNotice('Isi minimal satu nama personil sebelum membuat report.', 'error'); return; }
    if (personnelNames.length > 4) { showNotice('Maksimal empat nama personil untuk report.', 'error'); return; }
    const originalLabel = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses report...';
    try {
      await loadHistory();
      const message = buildDailyReport(dateValue, personnelNames);
      if (!message) { showNotice('Tidak ada pekerjaan tersimpan pada tanggal tersebut.', 'error'); return; }
      $('reportPreview').value = message;
      $('reportPreview').readOnly = true;
      $('editReportBtn').innerHTML = '<i class="fas fa-pen"></i> Edit';
      $('whatsappReportModal').hidden = false;
      showNotice('Report WhatsApp siap diperiksa.', 'success');
    } catch (error) {
      showNotice('Gagal membuat report: ' + (error.message || 'periksa koneksi CSI.'), 'error');
    } finally {
      button.disabled = false;
      button.innerHTML = originalLabel;
    }
  });
  $('editReportBtn').addEventListener('click', () => {
    const area = $('reportPreview');
    area.readOnly = !area.readOnly;
    $('editReportBtn').innerHTML = area.readOnly ? '<i class="fas fa-pen"></i> Edit' : '<i class="fas fa-check"></i> Selesai Edit';
    if (!area.readOnly) area.focus();
  });
  $('sendReportBtn').addEventListener('click', async () => {
    const button = $('sendReportBtn');
    const reportText = $('reportPreview').value.trim();
    const dateValue = $('printReportDate').value;
    const personnel = parsePersonnelNames($('printPersonnel').value);
    const teamName = $('printTeamName').value.trim();
    if (!reportText) { showNotice('Isi report masih kosong.', 'error'); return; }
    if (!teamName) { showNotice('Isi Nama TIM CSI sebelum mengirim report.', 'error'); $('printTeamName').focus(); return; }
    if (!personnel.length || personnel.length > 4) { showNotice('Isi 1–4 nama personil sebelum mengirim report.', 'error'); $('printPersonnel').focus(); return; }
    button.disabled = true;
    const original = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan laporan...';
    try {
      const siteName = 'CWUP Karawang';
      const siteAddress = 'Karawang';
      const picName = $('printPicName').value.trim();
      const leaderName = $('printLeaderName').value.trim();
      const printReportHtml = buildPrintableReport(dateValue, siteName, siteAddress, personnel, teamName, picName, leaderName);
      if (!printReportHtml) throw new Error('Template laporan berlogo tidak dapat dibuat karena tidak ada pekerjaan pada tanggal tersebut.');
      const saved = await request('createDailyReport', {
        workDate: dateValue, siteName, siteAddress,
        teamName, picName, leaderName, personnel, reportText, printReportHtml
      });
      const reportUrl = new URL('csi-daily-reports.html', window.location.href);
      reportUrl.searchParams.set('reportId', saved.report.reportId);
      const message = reportText + '\n\nDaily Report tersimpan di sistem. Admin dapat membuka dan meninjau laporan melalui tautan berikut:\n' + reportUrl.href;
      window.open('https://wa.me/?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer');
      showNotice('Laporan tersimpan dengan ID ' + saved.report.reportId + '. WhatsApp dibuka untuk memilih penerima dan mengirim tautan ke Admin.', 'success');
      closeWhatsappModal();
    } catch (error) {
      showNotice('Laporan belum tersimpan, WhatsApp tidak dibuka. ' + (error.message || ''), 'error');
    } finally { button.disabled = false; button.innerHTML = original; }
  });
  $('closeWhatsappModalBtn').addEventListener('click', closeWhatsappModal);
  $('whatsappReportModal').addEventListener('click', event => {
    if (event.target?.dataset?.closeModal === 'true') closeWhatsappModal();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('whatsappReportModal').hidden) closeWhatsappModal();
  });
  ['filterDc','filterJob','filterFrom','filterTo','filterOld'].forEach(id => $(id).addEventListener('change', renderHistory));
  $('clearFiltersBtn').addEventListener('click', () => {
    $('filterDc').value = ''; $('filterJob').value = ''; $('filterFrom').value = ''; $('filterTo').value = ''; $('filterOld').checked = false; renderHistory();
  });
  const menuToggle = $('menuToggle');
  const sidebar = $('sidebar');
  const sidebarOverlay = $('sidebarOverlay');
  function closeSidebar() {
    sidebar?.classList.remove('active');
    sidebarOverlay?.classList.remove('active');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }
  menuToggle?.addEventListener('click', () => {
    const isOpen = sidebar?.classList.toggle('active') || false;
    sidebarOverlay?.classList.toggle('active', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
  sidebarOverlay?.addEventListener('click', closeSidebar);
  sidebar?.querySelectorAll('.hub-nav a').forEach(link => link.addEventListener('click', closeSidebar));

  init().catch(error => {
    showNotice(error.message || 'CSI gagal dimuat.', 'error');
    historyBody.innerHTML = '<tr><td colspan="7" class="csi-empty">Gagal memuat data. Periksa konfigurasi dan deployment CSI.</td></tr>';
  });
})();